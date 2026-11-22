// SP のメニュー開閉。状態は aria-expanded と .is-open の両方で持つ
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('global-nav');
if (toggle && nav) {
  const set = open => { toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}
