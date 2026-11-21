from pathlib import Path
from html import unescape
import base64,re,json,mimetypes
here=Path(__file__).resolve().parent
root=here.parent
files={}
texts={}
posts={}
for f in sorted(root.rglob('*')):
 if not f.is_file() or any(x in ('editor-source','server','.openai','.git') for x in f.relative_to(root).parts):continue
 name=str(f.relative_to(root))
 if f.suffix in ('.html','.xml','.txt','.js','.css','.svg'):
  s=f.read_text();texts[name]=s
 else:files[name]=[mimetypes.guess_type(name)[0] or 'application/octet-stream',base64.b64encode(f.read_bytes()).decode()]
 if f.suffix=='.html' and '<article class="reading">' in s:
  meta=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',s)[1])
  body=re.search(r'<article class="reading"><h1>.*?</h1>(.*?)</article>',s,re.S)[1]
  lines=[]
  for tag,t in re.findall(r'<(p|h2|h3)>(.*?)</\1>',body,re.S):
   t=re.sub(r'<a href="([^"]+)">(.*?)</a>',r'[\2](\1)',t)
   lines.append({'p':'','h2':'## ','h3':'### '}[tag]+unescape(t))
  posts[f.stem]=dict(slug=f.stem,title=meta['headline'],summary=meta['description'],date=meta['datePublished'],publisher='',body='\n\n'.join(lines),image='',alt='',version=0)
out=root/'server/index.js';out.parent.mkdir(exist_ok=True)
out.write_text('const texts='+json.dumps(texts)+';\nconst files='+json.dumps(files)+';\nconst seeds='+json.dumps(posts)+';\nconst editor='+json.dumps((here/'manage.html').read_text())+';\n'+(here/'worker.js').read_text())
