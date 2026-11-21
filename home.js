const menu = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
function setMenu(open) {
  navigation.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Close' : 'Menu';
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
navigation.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    setMenu(false);
    menu.focus();
  }
});
matchMedia('(min-width:981px)').addEventListener('change', () => setMenu(false));
