const base='https://drnaumanbashir.com/';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(s){
 return s.split(/(\[[^\]\n]+\]\([^)\s]+\))/g).map(part=>{
  const m=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return m && /^(https?:\/\/|[a-z0-9-]+\.html(?:#[\w-]+)?$)/i.test(m[2]) ? '<a href="'+escape(m[2])+'">'+escape(m[1])+'</a>' : escape(part);
 }).join('');
}
// Render the editor's structured nodes with an explicit vocabulary.
function rich(node,depth=0){
 if(depth>48)throw Error('Content nesting limit');
 if(typeof node==='string')return escape(node);
 if(!node||!Array.isArray(node.children))throw Error('Invalid content');
 const tag=node.tag;
 if(!['p','div','span','strong','b','i','em','u','s','h2','h3','ul','ol','li','blockquote','br','img','a','table','tbody','tr','td','th','hr'].includes(tag))throw Error('Unsupported formatting');
 if(tag==='img'){
  if(!/^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(node.src))throw Error('Invalid image');
  return '<img loading="lazy" style="max-width:100%;height:auto" src="'+escape(node.src)+'" alt="'+escape(node.alt||'')+'">';
 }
 if(tag==='br'||tag==='hr')return '<'+tag+'>';
 const href=tag==='a' && typeof node.href==='string' && /^(https?:\/\/|[a-z0-9-]+\.html(?:#[\w-]+)?$)/i.test(node.href)?' href="'+escape(node.href)+'"':'';
 const styles=[];
 if(['left','right','center','justify'].includes(node.align))styles.push('text-align:'+node.align);
 if(/^#[0-9a-f]{6}$/i.test(node.color))styles.push('color:'+node.color);
 return '<'+tag+href+(styles.length?' style="'+styles.join(';')+'"':'')+'>'+node.children.map(n=>rich(n,depth+1)).join('')+'</'+tag+'>';
}
function content(p){
 if(p.nodes)return p.nodes.map(n=>rich(n)).join("");
 return p.body.split(/\n+/).filter(s=>s.trim()).map(s=>{
  const heading=s.startsWith('### ')?'h3':s.startsWith('## ')?'h2':'p';
  return '<'+heading+'>'+inline(heading==='p'?s:s.replace(/^#+ /,''))+'</'+heading+'>';
 }).join('\n');
}
function article(p){
 const url=base+p.slug+'.html',title=escape(p.title),seoTitle=escape(p.seoTitle||p.title),summary=escape(p.seoDescription||p.summary);
 const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,datePublished:p.date,description:p.seoDescription||p.summary,keywords:p.tags||undefined,url};
 if(p.publisher)schema.author={'@type':'Person',name:p.publisher};
 if(p.image)schema.image=base+p.image.slice(1);
 return texts['gallstones.html'].replace(/<title>.*?<\/title>/,()=>'<title>'+seoTitle+' | Dr. Nauman Bashir</title>')
 .replace(/(<link rel="canonical" href=")[^"]+/, '$1'+url)
 .replace(/(<meta (?:name|property)="(?:description|og:description)" content=")[^"]*/g,(_,prefix)=>prefix+summary)
 .replace(/(<meta property="og:title" content=")[^"]*/,(_,prefix)=>prefix+seoTitle)
 .replace(/(<meta property="og:url" content=")[^"]*/,'$1'+url)
 .replace(/(<meta property="og:image" content=")[^"]*/,(_,prefix)=>prefix+(p.image?base+p.image.slice(1):base+'assets/nauman-1000.webp'))
 .replace(/<script type="application\/ld\+json">.*?<\/script>/s,()=>'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>')
 .replace(/(<a href="blog.html">Blog<\/a> \/ ).*?<\/div>/,(_,prefix)=>prefix+title+'</div>')
 .replace(/<article class="reading">.*?<\/article>/s,()=>'<article class="reading"><h1>'+title+'</h1><p><time>'+escape(p.date)+'</time>'+(p.publisher?' · '+escape(p.publisher):'')+'</p>'+(p.image?'<img style="width:100%;height:auto" src="'+p.image+'" alt="'+escape(p.alt)+'">':'')+content(p)+'</article>');
}
const reply=(body,type='text/plain',status=200)=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
async function state(env){const obj=await env.BUCKET.get('blog/catalog-v1');return {posts:obj?await obj.json():{...seeds},etag:obj?.etag};}
export default {async fetch(req,env){
 const u=new URL(req.url), path=u.pathname;
 if(path==='/api/consultation'){
  if(req.method!=='POST'||req.headers.get('Origin')!==u.origin)return reply('Invalid submission.',undefined,403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return reply('Invalid format.',undefined,415);
  const raw=await req.text();if(raw.length>5000)return reply('Request too large.',undefined,413);
  let fields;try{fields=JSON.parse(raw)}catch{return reply('Invalid form.',undefined,400)}
  const limits={patient:100,phone:40,email:254,clinic:100,date:10,time:30,notes:400};
  const data={};
  for(const [k,max] of Object.entries(limits)){
   const value=fields?.[k]??'';
   if(typeof value!=='string'||value.length>max)return reply('Check the form fields.',undefined,400);
   if(value.trim())data[k]=value.trim();
  }
  if(!data.patient||!data.phone||!['Hassan Hospital','Surriya Anwar Hospital','No preference'].includes(data.clinic))return reply('Check name, phone and clinic.',undefined,400);
  try{
   const upstream=await fetch('https://formsubmit.co/ajax/mnbashir360@gmail.com',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Referer':base,'Origin':new URL(base).origin},body:JSON.stringify({...data,_subject:'Consultation request — '+data.clinic,_template:'table'}),signal:AbortSignal.timeout(20000)});
   const result=await upstream.json();
   if(upstream.ok&&String(result.success)==='true'&&!/activat|verify/i.test(result.message||''))return reply('{"success":true}','application/json');
  }catch{}
  return reply('Delivery could not be confirmed.',undefined,502);
 }
 if(path==='/'&&u.hostname==='manage.drnaumanbashir.com')return Response.redirect(u.origin+'/manage/',302);
 const protectedRoute=path==='/manage'||path==='/manage/'||path.startsWith('/api/editor/');
 if(protectedRoute){
  const expected=env.EDITOR_PASSWORD && 'Basic '+btoa('dnb:'+env.EDITOR_PASSWORD);
  if(!expected||req.headers.get('Authorization')!==expected){
   return new Response('Editor sign-in required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="Dr Nauman blog editor", charset="UTF-8"','Cache-Control':'no-store'}});
  }
 }
 if(path==='/manage'||path==='/manage/')return reply(editor,'text/html;charset=utf-8');
 if(path.startsWith('/api/editor/')){
  if(req.method!=='GET'&&req.headers.get('Origin')!==u.origin)return reply('Origin mismatch.',undefined,403);
  if(path==='/api/editor/image'&&req.method==='POST'){
   if(Number(req.headers.get('content-length'))>3000000)return reply('Maximum image size is 3 MB.',undefined,413);
   const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length>3000000)return reply('Maximum image size is 3 MB.',undefined,413);
   const ascii=(i,n)=>String.fromCharCode(...bytes.slice(i,i+n));
   const ext=ascii(0,3)==='\xff\xd8\xff'?'jpg':ascii(0,8)==='\x89PNG\r\n\x1a\n'?'png':ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'?'webp':'';
   if(!ext)return reply('Choose a JPEG, PNG or WebP image.',undefined,400);
   const key='media/'+crypto.randomUUID()+'.'+ext;await env.BUCKET.put(key,bytes);return reply('/'+key);
  }
  const {posts,etag}=await state(env);
  if(path==='/api/editor/posts'&&req.method==='GET')return reply(JSON.stringify(Object.values(posts).map(p=>({...p,editorHTML:content(p)}))),'application/json');
  if(path!=='/api/editor/posts'||req.method!=='POST')return reply('Unknown action',undefined,404);
  let p;try{p=await req.json()}catch{return reply('Invalid article.',undefined,400)}
  if(!p||!['title','slug','summary','publisher','date','body','image','alt'].every(k=>typeof p[k]==='string')||!p.title.trim()||!p.body.trim()||!p.publisher.trim()||!p.summary.trim()||p.title.length>220||p.body.length>100000||p.summary.length>600||p.publisher.length>150||p.alt.length>350||!/^\d{4}-\d\d-\d\d$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date||!/^([a-z0-9]+-)*[a-z0-9]+$/.test(p.slug)||p.slug.length>100||p.slug in Object.prototype||(p.slug+'.html' in texts&&!seeds[p.slug])||(p.image&&(!/^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p.image)||!p.alt.trim())))return reply('Check the article fields, date, URL and image description.',undefined,400);
  if(p.nodes!==undefined){
   try{if(!Array.isArray(p.nodes)||JSON.stringify(p.nodes).length>450000)throw Error();p.nodes.forEach(n=>rich(n))}catch{return reply('Invalid or overly long formatted content.',undefined,400)}
  }
  if(['tags','seoTitle','seoDescription'].some(k=>p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>600)))return reply('Metadata too long.',undefined,400);
  if((posts[p.slug]?.version??-1)!==p.version)return reply('This URL exists or the article has changed. Reload before publishing.',undefined,409);
  if(p.image&&!await env.BUCKET.head(p.image.slice(1)))return reply('Image missing.',undefined,400);
  posts[p.slug]=Object.fromEntries(['title','slug','summary','publisher','date','body','image','alt'].map(k=>[k,p[k].trim()]));Object.assign(posts[p.slug],{nodes:p.nodes,hidden:p.hidden===true,tags:p.tags,seoTitle:p.seoTitle,seoDescription:p.seoDescription,version:p.version+1});
  const saved=await env.BUCKET.put('blog/catalog-v1',JSON.stringify(posts),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'}});
  return saved?reply(JSON.stringify(posts[p.slug]),'application/json'):reply('Another edit was published. Reload and try again.',undefined,409);
 }
 if(!['GET','HEAD'].includes(req.method))return reply('Method unavailable',undefined,405);
 const name=path.slice(1)||'index.html';
 if(/^media\/[\da-f-]{36}\.(jpg|webp|png)$/.test(name)){const o=await env.BUCKET.get(name);return o?reply(o.body,'image/'+(name.endsWith('jpg')?'jpeg':name.split('.').pop())):reply('Missing image',undefined,404)}
 if(Object.hasOwn(files,name)){const [type,b64]=files[name];return new Response(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),{headers:{'Content-Type':type,'Cache-Control':'public,max-age=86400'}})}
 let s=Object.hasOwn(texts,name)?texts[name]:null;
 if(name==='blog.html'||name==='index.html'||name==='sitemap.xml'||(name.endsWith('.html')&&(!s||seeds[name.slice(0,-5)]))){
  const {posts}=await state(env),list=Object.values(posts).filter(p=>!p.hidden).sort((a,b)=>b.date.localeCompare(a.date));
  if(name==='blog.html')s=s.replace(/<article>.*<\/article>/s,()=>list.map(p=>'<article><h2><a href="'+p.slug+'.html">'+escape(p.title)+'</a></h2><p>'+escape(p.summary)+'</p></article>').join(''));
  else if(name==='sitemap.xml')s=s.replace(/<url><loc>[^<]*\/([a-z0-9-]+)\.html<\/loc><\/url>/g,(m,slug)=>posts[slug]?.hidden?'':m).replace('</urlset>',list.filter(p=>!seeds[p.slug]).map(p=>'<url><loc>'+base+p.slug+'.html</loc></url>').join('')+'</urlset>');
  else if(name==='index.html'){for(const slug of ['first-surgical-visit','questions-before-surgery'])s=s.replace(/<article>[^]*?<\/article>/g,card=>card.includes('href="'+slug+'.html"')?(posts[slug].hidden?'':card.replace('<h3>'+escape(seeds[slug].title)+'</h3>',()=>'<h3>'+escape(posts[slug].title)+'</h3>')):card)}
  else if(posts[name.slice(0,-5)]){const p=posts[name.slice(0,-5)];if(p.hidden)s=null;else if(p.version||!s)s=article(p)}
 }
 const type={html:'text/html;charset=utf-8',css:'text/css',js:'application/javascript',svg:'image/svg+xml',xml:'application/xml'};
 return s===null?reply('Page not found',undefined,404):reply(s,type[name.split('.').pop()]||'text/plain');
}};
