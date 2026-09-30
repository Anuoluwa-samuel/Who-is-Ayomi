const root = document.documentElement;
root.classList.add('js');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Refractive liquid glass only where backdrop-filter: url() is supported (Chromium)
const chromium = navigator.userAgentData
  ? navigator.userAgentData.brands.some(b => b.brand === 'Chromium')
  : /Chrome\//.test(navigator.userAgent);
if (chromium) root.classList.add('refract');


/* ---------------- Intro / preloader ---------------- */
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const count = document.getElementById('introCount');
  document.getElementById('introYear').textContent = new Date().getFullYear();

  const minTime = reduceMotion ? 900 : 3900;   // long enough to play the full sequence
  const maxTime = 9000;                        // never trap the visitor if an asset hangs
  const t0 = performance.now();
  let done = false;

  const tick = now => {
    if (done) return;
    const p = Math.min((now - t0) / minTime, 1);
    count.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2))) + '%';
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  let skip;
  const skipped = new Promise(r => (skip = r));

  const leave = () => {
    if (done) return;
    done = true;
    count.textContent = '100%';
    intro.classList.add('out');
    setTimeout(() => root.classList.remove('intro-active'), 450);   // hero animations start as the iris closes
    setTimeout(() => intro.remove(), 1800);
  };

  Promise.race([Promise.all([wait(minTime), loaded, fonts]), skipped, wait(maxTime)]).then(leave);

  const skipNow = () => skip();
  document.getElementById('introEnter').addEventListener('click', skipNow);
  ['keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, skipNow, { once: true, passive: true }));
})();

/* ---------------- Mobile menu ---------------- */
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
const setMenu = open => {
  links.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', open);
};
toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
links.addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

/* ---------------- Nav: liquid pill that follows the active / hovered link ---------------- */
const navAnchors = [...links.querySelectorAll('a')];
const pill = document.getElementById('navPill');
let activeLink = navAnchors[0];

const movePill = a => {
  const r = a.getBoundingClientRect();
  const p = links.getBoundingClientRect();
  pill.style.width = r.width + 'px';
  pill.style.transform = `translateX(${r.left - p.left}px)`;
  pill.style.opacity = 1;
};
const setActive = a => {
  activeLink = a;
  navAnchors.forEach(x => x.classList.toggle('active', x === a));
  movePill(a);
};
navAnchors.forEach(a => a.addEventListener('pointerenter', () => movePill(a)));
links.addEventListener('pointerleave', () => movePill(activeLink));
addEventListener('resize', () => movePill(activeLink));
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => movePill(activeLink));

const sections = navAnchors.map(a => document.querySelector(a.getAttribute('href')));
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const a = navAnchors.find(x => x.getAttribute('href') === '#' + entry.target.id);
    if (a && a !== activeLink) setActive(a);
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => s && spy.observe(s));

/* ---------------- Cursor light, glass specular, parallax ---------------- */
const layers = [...document.querySelectorAll('.layer[data-depth]')];
const aurora = document.querySelector('.aurora');
const glow = document.getElementById('cursorGlow');

let tx = 0, ty = 0, cx = 0, cy = 0;            // parallax target / current (-1..1)
let gx = innerWidth / 2, gy = innerHeight / 2; // glow target
let gcx = gx, gcy = gy;
let lastScroll = -1, raf = 0;

const frame = () => {
  cx += (tx - cx) * 0.06;
  cy += (ty - cy) * 0.06;
  gcx += (gx - gcx) * 0.12;
  gcy += (gy - gcy) * 0.12;

  layers.forEach(l => {
    const d = +l.dataset.depth;
    l.style.transform = `translate3d(${(cx * d * -16).toFixed(2)}px, ${(cy * d * -12).toFixed(2)}px, 0)`;
  });
  aurora.style.transform = `translate3d(${(cx * -18).toFixed(2)}px, ${(-scrollY * 0.05 + cy * -12).toFixed(2)}px, 0)`;
  glow.style.transform = `translate3d(${gcx.toFixed(1)}px, ${gcy.toFixed(1)}px, 0)`;

  const settled = Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001 && Math.abs(gx - gcx) < 0.5 && Math.abs(gy - gcy) < 0.5 && scrollY === lastScroll;
  lastScroll = scrollY;
  raf = settled ? 0 : requestAnimationFrame(frame);
};
const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

if (!reduceMotion) {
  addEventListener('scroll', wake, { passive: true });
  wake();
}

if (finePointer) {
  addEventListener('pointermove', e => {
    gx = e.clientX; gy = e.clientY;
    glow.classList.add('on');
    if (!reduceMotion) {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
      wake();
    }
    const g = e.target.closest && e.target.closest('.glass');
    if (g) {
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      g.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('on'));

  // magnetic buttons
  if (!reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.2;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.translate = `${x}px ${y}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }
}

/* ---------------- Reveal, count-up, skill bars ---------------- */
const countUp = el => {
  const target = +el.dataset.count;
  if (reduceMotion) { el.textContent = target; return; }
  const start = performance.now();
  const dur = 1400;
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

document.querySelectorAll('.skill').forEach(s => s.querySelector('.bar i').style.setProperty('--lvl', s.dataset.level + '%'));

const reveal = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(countUp);
    el.querySelectorAll('.skill').forEach((s, i) => {
      setTimeout(() => { s.querySelector('.bar i').style.width = s.dataset.level + '%'; }, i * 70);
    });
    reveal.unobserve(el);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

/* ---------------- Project pager dots (mobile carousel) ---------------- */
const grid = document.getElementById('projectGrid');
const dots = [...document.querySelectorAll('#pager i')];
grid.addEventListener('scroll', () => {
  const i = Math.round(grid.scrollLeft / (grid.scrollWidth / dots.length));
  dots.forEach((d, n) => d.classList.toggle('on', n === i));
}, { passive: true });

document.getElementById('year').textContent = new Date().getFullYear();
