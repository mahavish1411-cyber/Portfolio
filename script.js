/* ==========================================================================
   Mahavishnu E — Portfolio
   1. Shared UI (mobile nav, year)         — runs on every page
   2. Scroll-driven canvas frame sequence  — runs only where #bg-canvas exists
   ========================================================================== */

/* ---------- Configuration: edit these to change the image sequence ---------- */
const FRAME_CONFIG = {
  count: 240,                                   // total number of frames
  path: (n) => `frames/frame_${String(n).padStart(3, '0')}.jpg`, // n is 1-based
  smoothing: 0.14,                              // 0–1; lower = floatier, 1 = instant
  reducedMotionFrame: 240,                      // static frame shown if user prefers reduced motion
  loadBatch: 8,                                 // how many frames to fetch in parallel
  // Soft dark patch over the video generator's corner watermark, as fractions of the source
  // frame (x, y, radius ÷ width). Set to null if your frames have no watermark.
  watermark: { x: 0.906, y: 0.833, r: 0.05 },
};

/* ---------- 1. Shared UI ---------- */
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

/* ---------- 2. Scroll-driven canvas ---------- */
(() => {
  const canvas = document.getElementById('bg-canvas');
  const footer = document.getElementById('site-footer');
  if (!canvas || !footer) return;

  const ctx = canvas.getContext('2d');
  const total = FRAME_CONFIG.count;
  const frames = new Array(total).fill(null);   // loaded HTMLImageElements (null = not loaded / missing)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let viewW = 0, viewH = 0;
  let scrollEnd = 1;          // scrollY at which the footer's top edge enters the viewport
  let targetFrame = 0;        // float, where scroll says we should be
  let currentFrame = 0;       // float, eased toward target
  let lastDrawn = -1;
  let ticking = false;

  /* Size the canvas to the viewport at device resolution. */
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDrawn = -1;
  }

  /* Scroll position at which the footer's top edge meets the viewport's bottom edge.
     Measured from the footer's real position, so it tracks layout changes. */
  function measure() {
    const footerTop = footer.getBoundingClientRect().top + window.scrollY;
    scrollEnd = Math.max(footerTop - window.innerHeight, 1);
  }

  /* Nearest loaded frame to index i (searches outward), or null. */
  function nearestLoaded(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < total; d++) {
      if (i - d >= 0 && frames[i - d]) return frames[i - d];
      if (i + d < total && frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* Draw an image with cover-style scaling (fills viewport, keeps aspect ratio, centered). */
  function drawCover(img) {
    const scale = Math.max(viewW / img.naturalWidth, viewH / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const ox = (viewW - w) / 2, oy = (viewH - h) / 2;
    ctx.drawImage(img, ox, oy, w, h);

    const wm = FRAME_CONFIG.watermark;
    if (wm) {
      const cx = ox + w * wm.x, cy = oy + h * wm.y, r = w * wm.r;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(14,14,16,0.95)');
      g.addColorStop(0.6, 'rgba(14,14,16,0.7)');
      g.addColorStop(1, 'rgba(14,14,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  function render() {
    const idx = Math.round(currentFrame);
    if (idx === lastDrawn) return;
    const img = nearestLoaded(idx);
    if (!img) return;
    drawCover(img);
    lastDrawn = idx;
  }

  /* One rAF loop: ease toward the scroll-derived target, draw, keep going until settled. */
  function tick() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) < 0.02) currentFrame = targetFrame;
    else currentFrame += diff * FRAME_CONFIG.smoothing;
    render();
    if (currentFrame !== targetFrame) requestAnimationFrame(tick);
    else ticking = false;
  }
  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }

  /* Map scroll → frame. Clamped, so the final frame is held through the footer. */
  function onScroll() {
    const progress = Math.min(Math.max(window.scrollY / scrollEnd, 0), 1);
    targetFrame = progress * (total - 1);
    requestTick();
  }

  function onLayoutChange() {
    measure();
    resizeCanvas();
    if (reduceMotion.matches) { showStatic(); return; }
    onScroll();
    lastDrawn = -1;
    requestTick();
  }

  function showStatic() {
    const i = Math.min(Math.max(FRAME_CONFIG.reducedMotionFrame, 1), total) - 1;
    targetFrame = currentFrame = i;
    lastDrawn = -1;
    render();
  }

  /* ---- Frame loading: first frame immediately, rest in small parallel batches ---- */
  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; resolve(true); };
      img.onerror = () => resolve(false);    // missing frame: skipped, nearest neighbour is used
      img.src = FRAME_CONFIG.path(i + 1);
    });
  }

  async function loadAll() {
    // Prioritise the frame the page opens on (and the static one for reduced motion).
    const first = reduceMotion.matches ? FRAME_CONFIG.reducedMotionFrame - 1 : 0;
    const ok = await loadFrame(first);
    if (!ok) document.body.classList.add('no-frames');
    lastDrawn = -1; render();

    const order = [];
    for (let i = 0; i < total; i++) if (i !== first) order.push(i);
    if (reduceMotion.matches) return;            // no need to fetch the rest

    let anyLoaded = ok;
    for (let b = 0; b < order.length; b += FRAME_CONFIG.loadBatch) {
      const results = await Promise.all(order.slice(b, b + FRAME_CONFIG.loadBatch).map(loadFrame));
      if (results.some(Boolean)) anyLoaded = true;
      lastDrawn = -1; render();
    }
    if (!anyLoaded) document.body.classList.add('no-frames');
    else document.body.classList.remove('no-frames');
  }

  /* ---- Wire up ---- */
  window.addEventListener('scroll', () => { if (!reduceMotion.matches) onScroll(); }, { passive: true });
  window.addEventListener('resize', onLayoutChange);
  window.addEventListener('load', onLayoutChange);                 // images/fonts may shift layout
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onLayoutChange);
  if ('ResizeObserver' in window) new ResizeObserver(onLayoutChange).observe(document.body); // content height changes
  reduceMotion.addEventListener('change', onLayoutChange);

  onLayoutChange();
  loadAll();
})();

/* ==========================================================================
   3. Page animations (independent of the background canvas above)
   Reveal-on-scroll with staggers, hero letter entrance, count-up stats,
   timeline fill, parallax orbs, cursor spotlight, scroll progress bar.
   ========================================================================== */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;                       // CSS already shows everything statically
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---- Hero: split the name into letters, stagger the rest ---- */
  const h1 = document.querySelector('.hero h1');
  if (h1) {
    const text = h1.textContent.trim();
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch' + (c === ' ' ? ' sp' : '');
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? ' ' : c;
      h1.appendChild(s);
    });
    const after = 350 + text.length * 45 + 150;
    const set = (el, d) => el && el.style.setProperty('--d', d + 'ms');
    set(document.querySelector('.hero .eyebrow'), 150);
    set(document.querySelector('.hero .tagline'), after);
    set(document.querySelector('.hero .meta'), after + 120);
    $$('.hero .cta-row .btn').forEach((b, i) => set(b, after + 240 + i * 110));
  }

  /* ---- Marquee: duplicate content so the -50% loop is seamless ---- */
  const track = document.querySelector('[data-marquee]');
  if (track) track.innerHTML += track.innerHTML;

  /* ---- Reveal rules: [selector, animation, stagger step (ms), base delay] ---- */
  const rules = [
    ['.section > .container > .eyebrow, .page-head .eyebrow', 'up', 0, 0],
    ['.section-title', 'up', 0, 80],
    ['.stats .card', 'pop', 110, 0],
    ['.timeline > .card', 'zoom', 0, 0],
    ['.timeline .bullets li', 'up', 90, 200],
    ['.sub-heading', 'left', 0, 0],
    ['.grid-2 > .card', 'pop', 120, 0],
    ['#featured .card', 'pop', 140, 0],
    ['#featured p > .btn', 'pop', 0, 150],
    ['.card .tag', 'pop', 55, 250],
    ['.contact-card > p:not(.eyebrow)', 'up', 0, 150],
    ['.contact-card .btn', 'pop', 0, 300],
    ['.contact-list li', 'pop', 110, 400],
    ['.page-head h1, .page-head p', 'up', 120, 100],
    ['.project-card', 'zoom', 0, 150],
    ['.project-card .bullets li', 'up', 90, 300],
    ['.back-row .btn', 'pop', 120, 0],
  ];
  // Siblings matched by the same rule stagger in DOM order (delay = base + index * step).
  rules.forEach(([sel, anim, step, base]) => {
    const perParent = new Map();
    $$(sel).forEach((el) => {
      if (el.hasAttribute('data-anim')) return;
      const i = perParent.get(el.parentElement) || 0;
      perParent.set(el.parentElement, i + 1);
      el.setAttribute('data-anim', anim);
      el.style.setProperty('--d', base + i * step + 'ms');
    });
  });

  /* ---- Count-up numbers ---- */
  const countUp = (el) => {
    const end = +el.dataset.count, dur = 1400, t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $$('[data-count]').forEach((el) => (el.textContent = '0'));

  /* ---- Observer: add .in when elements scroll into view (once) ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      const num = e.target.querySelector('[data-count]');
      if (num) countUp(num);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-anim]').forEach((el) => io.observe(el));

  /* ---- Scroll-linked: progress bar, timeline fill, parallax orbs ---- */
  const bar = document.querySelector('.scroll-progress');
  const timeline = document.querySelector('.timeline');
  const orbs = $$('[data-parallax]');
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight;
    // Safety net: at the very bottom of the page, reveal anything the observer could not reach.
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 2) $$('[data-anim]:not(.in)').forEach((el) => el.classList.add('in'));
    if (bar) {
      const max = document.documentElement.scrollHeight - vh;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = Math.min(Math.max((vh * 0.65 - r.top) / r.height, 0), 1);
      timeline.style.setProperty('--tl', p.toFixed(3));
    }
    orbs.forEach((o) => {
      const r = o.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(o.dataset.parallax);
      o.style.translate = `0 ${off.toFixed(1)}px`;
    });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();

  /* ---- Cursor spotlight on cards ---- */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - r.left + 'px');
    card.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });
})();

/* ==========================================================================
   4. Tech-stack icons: prepend a brand icon to every .tag and marquee item
      whose text matches a known technology. Unknown tags are left as-is.
   ========================================================================== */
(() => {
  const DEV = (n) => `https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/${n}/${n}-original.svg`;
  const svg = (body) => `<svg class="tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    'html': DEV('html5'), 'html5': DEV('html5'),
    'css': DEV('css3'), 'css3': DEV('css3'),
    'javascript': DEV('javascript'),
    'react.js': DEV('react'),
    'bootstrap': DEV('bootstrap'),
    'tailwind css': DEV('tailwindcss'),
    'git': DEV('git'),
    'github': { src: DEV('github'), cls: 'invert' },
    'visual studio code': DEV('vscode'),
    'linux': DEV('linux'),
    'gsap': { src: 'https://cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/greensock.svg', cls: 'invert' },
    'gsap (greensock)': { src: 'https://cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/greensock.svg', cls: 'invert' },
    'networking': svg('<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5l-5.5 5.6M12 11.5l5.5 5.6"/>'),
    'networking fundamentals': svg('<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5l-5.5 5.6M12 11.5l5.5 5.6"/>'),
    'cloud services': svg('<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5H7z"/>'),
  };

  const decorate = (el) => {
    if (el.querySelector('.tag-icon')) return;
    const hit = ICONS[el.textContent.trim().toLowerCase()];
    if (!hit) return;
    if (typeof hit === 'string' && hit.startsWith('<svg')) {
      el.insertAdjacentHTML('afterbegin', hit);
    } else {
      const { src, cls } = typeof hit === 'string' ? { src: hit, cls: '' } : hit;
      const img = document.createElement('img');
      img.className = 'tag-icon' + (cls ? ' ' + cls : '');
      img.src = src; img.alt = ''; img.width = 18; img.height = 18; img.loading = 'lazy';
      img.addEventListener('error', () => img.remove());   // offline / blocked CDN: just show the text
      el.prepend(img);
    }
    el.classList.add('has-icon');
  };
  document.querySelectorAll('.tag, .marquee-track span').forEach(decorate);
})();
