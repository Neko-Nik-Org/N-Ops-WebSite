(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add('js');

  /* theme toggle: persists to localStorage, defaults to system preference */
  const isDark = () => root.getAttribute('data-theme') === 'dark';
  const themeBtn = $('#themeBtn');
  const applyTheme = dark => {
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    themeBtn.setAttribute('aria-pressed', dark);
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  applyTheme(isDark());
  themeBtn.addEventListener('click', () => {
    const dark = !isDark();
    applyTheme(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });

  /* nav state + mobile sheet */
  const top = $('header.top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 12);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const mb = $('.menu-btn'), sheet = $('#sheet');
  const closeSheet = () => { mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Open menu'); sheet.hidden = true; };
  mb.addEventListener('click', () => {
    const o = mb.getAttribute('aria-expanded') !== 'true';
    mb.setAttribute('aria-expanded', o); mb.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); sheet.hidden = !o;
  });
  $$('a', sheet).forEach(a => a.addEventListener('click', closeSheet));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) { closeSheet(); mb.focus(); } });

  /* small one-time draws: section bars and capability glyphs.
     Everything is drawn by default; only when JS runs (and motion is allowed) do they start undrawn. */
  if (!RM) {
    root.classList.add('anim');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .35 });
    $$('.sh, .cap').forEach(el => io.observe(el));
  }

  /* ───── node field (hero + cta) ─────
     40 nodes. Each has a "home" on the N path (4 anchors + points spaced along the 3 strokes)
     and a "free" position drifting around the canvas. m ∈ [0,1] mixes home→free.
     Springs pull current position to the mixed target, so the N snaps together on load
     and loosens into a fleet network while the pointer moves. */
  function field(canvas, opt) {
    if (!canvas) return; // pages without the hero or cta canvas, such as /faq
    const ctx = canvas.getContext('2d');
    const host = canvas.parentElement;
    const N = 40, SEG = [12, 16, 11];
    const P = [[0, 1], [0, 0], [1, 1], [1, 0]];
    let W = 0, H = 0, dpr = 1, slot = { x: 0, y: 0, w: 100, h: 100 };
    let nodes = [], m = 1, mT = 1, last = 0, visible = true, raf = 0, ptr = { x: -9999, y: -9999, on: false }, idleT = 0;
    const units = [];
    P.slice(0, 3).forEach((a, s) => {
      const b = P[s + 1];
      for (let i = 0; i < SEG[s]; i++) { const t = i / SEG[s]; units.push({ u: a[0] + (b[0] - a[0]) * t, v: a[1] + (b[1] - a[1]) * t, anchor: i === 0 }); }
    });
    units.push({ u: 1, v: 0, anchor: true });

    function measure() {
      const r = host.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opt.slot) {
        const s = opt.slot.getBoundingClientRect();
        slot = { x: s.left - r.left, y: s.top - r.top, w: s.width, h: s.height };
      } else {
        const sz = Math.min(W * .42, H * .62);
        slot = { x: W - sz - W * .06, y: H * .1, w: sz, h: sz * .92 };
      }
      const pad = Math.min(slot.w, slot.h) * .12;
      nodes.forEach((n, i) => {
        const U = units[i];
        n.hx = slot.x + pad + U.u * (slot.w - 2 * pad);
        n.hy = slot.y + pad + U.v * (slot.h - 2 * pad);
      });
    }
    function init() {
      nodes = units.map(U => ({
        x: Math.random() * (W || 800), y: Math.random() * (H || 600), vx: 0, vy: 0,
        fx: Math.random(), fy: Math.random(), fvx: (Math.random() - .5) * .0007, fvy: (Math.random() - .5) * .0007,
        a: U.anchor, hx: 0, hy: 0, m: 1
      }));
      measure();
      if (RM) { m = mT = 0; nodes.forEach(n => { n.m = 0; n.x = n.hx; n.y = n.hy; }); }
    }
    function grad(x0, y0, x1, y1) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      const d = opt.dark();
      g.addColorStop(0, d ? '#4CF2C0' : '#2FD6A6'); g.addColorStop(1, d ? '#8A7CFF' : '#7B6BFF'); return g;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const s = Math.min(slot.w, slot.h);
      const gN = grad(slot.x, slot.y + slot.h, slot.x + slot.w, slot.y);
      const gW = grad(0, H, W, 0);
      const d0 = opt.dark();
      m = nodes.reduce((a, n) => a + n.m, 0) / N;
      if (m > .05) {
        ctx.globalAlpha = m * (d0 ? .12 : .1); ctx.strokeStyle = d0 ? '#E8EEF4' : '#0B1118';
        ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.moveTo(nodes[0].hx, nodes[0].hy);
        for (let i = 1; i < N; i++) ctx.lineTo(nodes[i].hx, nodes[i].hy);
        ctx.stroke(); ctx.setLineDash([]);
      }
      if (m > .02) {
        const R = Math.max(110, Math.min(170, W * .11));
        ctx.lineWidth = 1; ctx.strokeStyle = d0 ? 'rgba(232,238,244,.6)' : 'rgba(11,17,24,.35)';
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < R) {
            ctx.globalAlpha = Math.min(a.m, b.m) * (1 - d / R) * (d0 ? .35 : .5);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = gN; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < N; i++) {
        const a = nodes[i - 1], b = nodes[i], k = 1 - Math.max(a.m, b.m);
        if (k < .02) continue;
        ctx.globalAlpha = Math.pow(k, 1.4);
        ctx.lineWidth = Math.max(2, s * .05) * k + 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (ptr.on) {
        const R = 200;
        ctx.lineWidth = 1.4; ctx.strokeStyle = gW;
        for (const n of nodes) {
          const d = Math.hypot(n.x - ptr.x, n.y - ptr.y);
          if (d < R) { ctx.globalAlpha = (1 - d / R) * .9 * n.m; ctx.beginPath(); ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(n.x, n.y); ctx.stroke(); }
        }
        ctx.globalAlpha = .9 * m; ctx.fillStyle = gW; ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 3, 0, 6.283); ctx.fill();
      }
      const fill = d0 ? '#0B1118' : '#FFFFFF';
      for (let i = 0; i < N; i++) {
        const n = nodes[i], k = 1 - n.m;
        const near = ptr.on ? Math.max(0, 1 - Math.hypot(n.x - ptr.x, n.y - ptr.y) / 200) : 0;
        if (n.a) {
          const r = (s * .075) * k + (5 + near * 3) * (1 - k);
          ctx.globalAlpha = 1; ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.283); ctx.fill();
          ctx.lineWidth = Math.max(2, s * .026) * k + 2 * (1 - k); ctx.strokeStyle = gN; ctx.stroke();
        } else {
          if (k > .6) continue;
          ctx.globalAlpha = (.4 + .6 * near) * (1 - k / .6);
          ctx.fillStyle = near > .05 ? gW : (opt.dark ? '#C9D2DC' : '#0B1118');
          ctx.beginPath(); ctx.arc(n.x, n.y, 2.4 + near * 2.5, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    let formT = 0;
    const setMT = v => { if (v < mT) formT = performance.now(); mT = v; };
    function step(t) {
      raf = 0; if (!visible) return;
      const dt = Math.min(48, t - (last || t)); last = t; const f = dt / 16.7;
      if (ptr.on && mT > 0 && t - idleT > 2600) setMT(0);
      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        if (mT < n.m) { if (t > formT + i * 26) n.m = Math.max(mT, n.m - .055 * f); }
        else n.m = Math.min(mT, n.m + .045 * f);
        n.fx += n.fvx * dt; n.fy += n.fvy * dt;
        if (n.fx < .02 || n.fx > .98) n.fvx *= -1;
        if (n.fy < .04 || n.fy > .96) n.fvy *= -1;
        let tx = n.hx + (n.fx * W - n.hx) * n.m, ty = n.hy + (n.fy * H - n.hy) * n.m;
        if (ptr.on) {
          const dx = ptr.x - tx, dy = ptr.y - ty, d = Math.hypot(dx, dy);
          if (d < 200) { const g = (1 - d / 200) * .18 * n.m; tx += dx * g; ty += dy * g; }
        }
        const stiff = n.m < .3 ? .09 : .03;
        n.vx = (n.vx + (tx - n.x) * stiff) * .78;
        n.vy = (n.vy + (ty - n.y) * stiff) * .78;
        n.x += n.vx * f; n.y += n.vy * f;
      }
      draw();
      if (opt.onMode) opt.onMode(m);
      raf = requestAnimationFrame(step);
    }
    const kick = () => { if (!raf && visible && !RM) { last = 0; raf = requestAnimationFrame(step); } };
    init();
    if (RM) { draw(); opt.onMode && opt.onMode(0); }
    new ResizeObserver(() => { measure(); if (RM) { nodes.forEach(n => { n.x = n.hx; n.y = n.hy; }); draw(); } }).observe(host);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }).observe(host);
    if (!RM) {
      setTimeout(() => setMT(0), opt.delay ?? 350);
      host.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const r = host.getBoundingClientRect();
        ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true; idleT = performance.now(); setMT(.9); kick();
      });
      host.addEventListener('pointerleave', () => { ptr.on = false; setMT(0); });
      kick();
    }
  }
  field($('#heroField'), { slot: $('#nSlot'), delay: 380, dark: isDark });
  field($('#ctaField'), { dark: () => true, delay: 600 });

  /* ───── architecture: "Checked at step N" links jump to that step ───── */
  $$('.sg .at').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    $$('.arch-row')[+a.dataset.step]?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
  }));

  /* ───── faq ───── */
  $$('.qa button').forEach(b => b.addEventListener('click', () => {
    const o = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', o); b.closest('.qa').classList.toggle('open', o);
  }));
})();
