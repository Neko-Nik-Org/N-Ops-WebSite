(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer:fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const every = (ms, fn) => { if (!RM) setInterval(() => { if (!document.hidden) fn(); }, ms); };
  $('#yr').textContent = new Date().getFullYear();

  /* ── nav, clock, scroll progress ── */
  const nav = $('#nav'), prog = $('#prog');
  const onScroll = () => {
    nav.classList.toggle('s', scrollY > 12);
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? clamp(scrollY / h, 0, 1) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll); onScroll();
  const tick = () => { const d = new Date(); $('#clock').textContent = 'UTC ' + d.toISOString().slice(11, 19); };
  tick(); setInterval(tick, 1000);
  const menu = $('#menu');
  const setMenu = o => { nav.classList.toggle('open', o); menu.setAttribute('aria-expanded', o); menu.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); document.body.style.overflow = o ? 'hidden' : ''; };
  menu.onclick = () => setMenu(!nav.classList.contains('open'));
  $$('#sheet a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ── theme ── */
  const root = document.documentElement;
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.getAttribute('data-theme') || (sysDark.matches ? 'dark' : 'light')) === 'dark';
  const themeBtn = $('#themeToggle');
  const themeListeners = [];
  const onThemeChange = fn => themeListeners.push(fn);
  const themeColorMeta = $('meta[name="theme-color"]');
  const applyTheme = () => {
    const dark = isDark();
    themeBtn.setAttribute('aria-pressed', dark);
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (themeColorMeta) themeColorMeta.setAttribute('content', dark ? '#0D0E12' : '#F7F6F2');
    themeListeners.forEach(fn => fn(dark));
  };
  themeBtn.onclick = () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('nops-theme', next); } catch (e) {}
    applyTheme();
  };
  sysDark.addEventListener('change', () => { if (!root.getAttribute('data-theme')) applyTheme(); });
  applyTheme();

  /* ── copy ── */
  $$('.cp').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) {}
    b.classList.add('done'); b.setAttribute('aria-label', 'Copied');
    setTimeout(() => { b.classList.remove('done'); b.setAttribute('aria-label', 'Copy install command'); }, 1800);
  });

  /* ── magnetic buttons ── */
  if (FINE && !RM) $$('.mag').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .12}px,${(e.clientY - r.top - r.height / 2) * .25}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1),background .25s,box-shadow .25s'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 500); });
  });

  /* ── text scramble for [nn] labels ── */
  const GL = '▮▯/\\_-<>01#';
  const scramble = el => {
    if (RM || el.dataset.done) return; el.dataset.done = 1;
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    nodes.forEach(n => {
      const final = n.textContent; let f = 0;
      const run = () => {
        f++; const k = Math.floor(f / 2);
        n.textContent = final.split('').map((c, i) => i < k || c === ' ' ? c : pick(GL.split(''))).join('');
        if (k < final.length) requestAnimationFrame(run); else n.textContent = final;
      };
      run();
    });
  };

  /* ── reveal ── */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('.scr', e.target).forEach(scramble); if (e.target.classList.contains('scr')) scramble(e.target);
    io.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.rv, .bc, #heat, #plans, .scr, .hl').forEach(el => io.observe(el));

  /* ── count-up ── */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count;
    if (RM) return void (el.textContent = end.toLocaleString());
    const t0 = performance.now();
    const st = t => { const p = Math.min(1, (t - t0) / 1600); el.textContent = Math.round(end * ease(p)).toLocaleString(); if (p < 1) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ── network field (hero + cta) ── */
  function field(canvas, opts) {
    const ctx = canvas.getContext('2d');
    let W, H, dpr, nodes = [], packets = [], mouse = { x: -999, y: -999 }, visible = true, raf;
    const N = opts.n;
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: N }, () => ({ x: rand(0, W), y: rand(0, H), vx: rand(-.18, .18), vy: rand(-.18, .18), r: rand(1.4, 2.6), hub: Math.random() < .12 }));
    };
    const host = opts.host || canvas.parentElement;
    host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    const D = opts.dist;
    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      // cursor-lit dot grid (only cells near the cursor)
      if (opts.grid && mouse.x > -900) {
        const g = 24, R = 150;
        for (let x = Math.floor((mouse.x - R) / g) * g; x < mouse.x + R; x += g)
          for (let y = Math.floor((mouse.y - R) / g) * g; y < mouse.y + R; y += g) {
            const d = Math.hypot(x - mouse.x, y - mouse.y); if (d > R) continue;
            ctx.fillStyle = `rgba(138,124,255,${(1 - d / R) * .55})`; ctx.fillRect(x - 1, y - 1, 2, 2);
          }
      }
      for (const n of nodes) {
        if (!RM) { n.x += n.vx; n.y += n.vy; }
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20; if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
        // gentle pull toward cursor
        const dx = mouse.x - n.x, dy = mouse.y - n.y, dm = Math.hypot(dx, dy);
        if (dm < 180 && !RM) { n.x += dx * .004; n.y += dy * .004; }
      }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > D) continue;
        const near = Math.hypot((a.x + b.x) / 2 - mouse.x, (a.y + b.y) / 2 - mouse.y) < 160;
        ctx.strokeStyle = near ? `rgba(${opts.hot},${(1 - d / D) * .8})` : `rgba(${opts.line},${(1 - d / D) * opts.alpha})`;
        ctx.lineWidth = near ? 1.2 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (!RM && Math.random() < .0009 && packets.length < 14) packets.push({ a, b, t: 0, s: rand(.008, .018) });
      }
      for (const n of nodes) {
        ctx.fillStyle = n.hub ? opts.hub : `rgba(${opts.line},.55)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.hub ? n.r + 1.4 : n.r, 0, 7); ctx.fill();
        if (n.hub) { ctx.strokeStyle = `rgba(${opts.line},.25)`; ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, 7); ctx.stroke(); }
      }
      packets = packets.filter(p => {
        p.t += p.s; if (p.t >= 1) return false;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = opts.pk; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
        return true;
      });
      if (visible && !RM) raf = requestAnimationFrame(frame);
    };
    resize(); frame();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (RM) frame(); }, 150); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible && !RM) raf = requestAnimationFrame(frame); }).observe(canvas);
  }
  const small = innerWidth < 700;
  const heroFieldOpts = { n: small ? 26 : 58, dist: 150, line: isDark() ? '220,221,228' : '13,14,18', alpha: .14, hot: '138,124,255', hub: '#8A7CFF', pk: '#1FC79A', grid: true, host: $('.hero') };
  field($('#field'), heroFieldOpts);
  field($('#field2'), { n: small ? 20 : 44, dist: 160, line: '255,255,255', alpha: .25, hot: '76,242,192', hub: '#4CF2C0', pk: '#4CF2C0', grid: false });
  onThemeChange(dark => { heroFieldOpts.line = dark ? '220,221,228' : '13,14,18'; });

  /* ── hero console: fleet ── */
  const fleet = $('#fleet'), hosts = [];
  const roles = ['web', 'api', 'db', 'worker', 'cache', 'edge'];
  for (let i = 0; i < 128; i++) {
    const c = document.createElement('i');
    const r = Math.random(); c.className = 'cell' + (r < .04 ? ' w' : r < .055 ? ' x' : r < .09 ? ' o' : '');
    fleet.appendChild(c);
    hosts.push(`${pick(['prod', 'prod', 'stg'])}-${pick(roles)}-${String(i + 1).padStart(3, '0')}`);
  }
  const cells = $$('.cell', fleet);
  let sel = 13; cells[sel].classList.add('sel');
  const stateOf = c => c.classList.contains('x') ? 'down' : c.classList.contains('w') ? 'degraded' : c.classList.contains('o') ? 'idle' : 'ok';
  const showSel = () => { $('#selHost').textContent = `${hosts[sel]} · 10.0.${Math.floor(sel / 16)}.${sel % 254 + 1} · ${stateOf(cells[sel])}`; };
  showSel();
  cells.forEach((c, i) => c.addEventListener('pointerenter', () => { cells[sel].classList.remove('sel'); sel = i; c.classList.add('sel'); showSel(); }));
  const updHealthy = () => { const h = cells.filter(c => stateOf(c) === 'ok' || stateOf(c) === 'idle').length; $('#kHealthy').innerHTML = `${h}<sup>/128</sup>`; };
  updHealthy();

  /* ── hero console: events ── */
  const evs = [
    ['ok', 'Deploy <b>dep_{id}</b> succeeded', 'group:web · 6/6 · {s}s'],
    ['u', 'Secret <b>STRIPE_KEY</b> rotated', 'production · by ci-bot'],
    ['w', '<b>{h}</b> CPU above 85%', 'auto-scaling suggested'],
    ['ok', 'Container <b>api-{n}</b> restarted', '{h} · healthy in 2.1s'],
    ['ok', 'Agent joined <b>{h}</b>', 'Ubuntu 24.04 · v1.0.3'],
    ['u', 'Config <b>nginx.conf</b> applied', '12 servers · no drift'],
    ['x', '<b>{h}</b> unreachable', 'retrying · 3 attempts'],
    ['ok', '<b>{h}</b> recovered', 'downtime 41s'],
    ['u', 'Workflow <b>nightly-backup</b> ran', '128 servers · 3m 12s'],
  ];
  const colors = { ok: 'var(--ok)', u: 'var(--ultra)', w: 'var(--warn)', x: 'var(--err)' };
  const evList = $('#events');
  const fill = s => s.replace('{id}', Math.random().toString(16).slice(2, 6)).replace('{s}', rand(2, 6).toFixed(1)).replace(/{h}/g, pick(hosts)).replace('{n}', Math.floor(rand(1, 9)));
  const pushEvent = (ago = 'now') => {
    const [t, a, b] = pick(evs);
    const li = document.createElement('li');
    li.innerHTML = `<i class="d" style="background:${colors[t]}"></i><div><b style="font-weight:400">${fill(a)}</b><span>${fill(b)} · ${ago}</span></div>`;
    evList.prepend(li); while (evList.children.length > 8) evList.lastChild.remove();
  };
  for (let i = 8; i > 0; i--) pushEvent(i * 7 + 's ago');
  every(2200, () => {
    pushEvent();
    const c = pick(cells); const r = Math.random();
    c.classList.remove('w', 'x', 'o'); if (r < .12) c.classList.add('w'); else if (r < .16) c.classList.add('x');
    c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
    updHealthy(); showSel();
  });

  /* ── hero console: CPU chart + kpis ── */
  const cpu = Array.from({ length: 60 }, (_, i) => 40 + Math.sin(i / 5) * 8 + rand(-4, 4));
  const drawCpu = () => {
    const pts = cpu.map((v, i) => [i / 59 * 600, 80 - v / 100 * 80 * 1.3 + 4]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    $('#cpuLine').setAttribute('d', d); $('#cpuArea').setAttribute('d', d + ' L600 80 L0 80Z');
    const now = Math.round(cpu[59]) + '%'; $('#cpuNow').textContent = now; $('#kCpu').textContent = now;
  };
  drawCpu();
  let dep = 312, nodesN = 1284;
  every(1000, () => {
    cpu.shift(); cpu.push(clamp(cpu[58] + rand(-5, 5), 18, 72)); drawCpu();
    $('#kLat').textContent = Math.round(rand(36, 52)) + 'ms';
    if (Math.random() < .3) { dep++; $('#kDep').textContent = dep; }
    if (Math.random() < .4) { nodesN += Math.random() < .7 ? 1 : -1; $('#liveNodes').textContent = nodesN.toLocaleString(); }
  });

  /* ── ticker ── */
  const tk = ['deploy dep_7f2a → group:web ✓ 6/6', 'secret STRIPE_KEY rotated', 'agent v1.0.3 joined edge-lb-02', 'worker-03 cpu 88%', 'backup nightly ✓ 128/128', 'config drift: 0 servers', 'container api-4 restarted ✓', 'p99 42ms · eu-west', 'ssh session opened · audit #41823', 'workflow on-push ✓ 14s'];
  $('#ticker').innerHTML = [...tk, ...tk].map(t => `<span><i class="${/cpu|drift/.test(t) ? 'w' : ''}"></i>${t}</span>`).join('');
  const chips = ['Linux', 'Ubuntu', 'Debian', 'RHEL', 'Rocky', 'Alpine', 'Docker', 'SSH', 'systemd', 'Nginx', 'PostgreSQL', 'Redis', 'ARM64', 'x86_64'];
  $('#chips').innerHTML = [...chips, ...chips].map(c => `<span class="chip">${c}</span>`).join('');

  /* ── problem → solution (scroll-linked on desktop) ── */
  const ps = $('#ps'), stage = $('#stage'), panel = $('#panel'), messes = $$('.mess', stage), rail = $('#railFill');
  const messy = [[.05, .08, -7], [.5, .05, 6], [.1, .55, 5], [.48, .6, -5]];
  let geo;
  const layout = () => {
    const W = stage.clientWidth, H = stage.clientHeight, inset = 26, pad = 16, gap = 12;
    const pw = W - inset * 2, cw = (pw - pad * 2 - gap) / 2;
    messes.forEach(m => m.style.width = Math.min(cw, W * .46) + 'px');
    const ch = messes[0].offsetHeight;
    geo = { W, H, tidy: messes.map((_, i) => [inset + pad + (i % 2) * (cw + gap), inset + 54 + pad + Math.floor(i / 2) * (ch + gap), 0]), cw };
    messes.forEach(m => m.style.width = cw + 'px');
  };
  const apply = p => {
    const e = ease(clamp(p, 0, 1));
    messes.forEach((m, i) => {
      const [mx, my, mr] = messy[i], [tx, ty] = geo.tidy[i];
      const x0 = mx * geo.W, y0 = my * geo.H;
      const wob = RM ? 0 : Math.sin(performance.now() / 900 + i) * 3 * (1 - e);
      m.style.transform = `translate(${x0 + (tx - x0) * e}px,${y0 + (ty - y0) * e + wob}px) rotate(${mr * (1 - e)}deg)`;
      m.style.boxShadow = e > .95 ? 'none' : '';
      $$('.w', m).forEach(b => b.style.opacity = 1 - e); $$('.g', m).forEach(b => b.style.opacity = e);
    });
    panel.style.opacity = e; panel.style.transform = `scale(${.96 + .04 * e})`;
    ps.classList.toggle('after', p > .5);
    rail.style.transform = `scaleX(${clamp(p, 0, 1)})`;
  };
  let psP = 0, manual = null;
  const desk = () => innerWidth > 960 && !RM;
  const psLoop = () => {
    if (desk()) {
      const r = $('#psTrack').getBoundingClientRect();
      const raw = -r.top / (r.height - innerHeight);
      psP = clamp((raw - .15) / .6, 0, 1);
    } else psP = manual === null ? psP : manual;
    apply(psP);
    requestAnimationFrame(psLoop);
  };
  layout(); addEventListener('resize', layout);
  if (RM) { psP = 1; apply(1); } else requestAnimationFrame(psLoop);
  const tg = $('#psToggle');
  tg.onclick = () => { const to = !(manual ?? (psP > .5 ? 1 : 0)); manual = to ? 1 : 0; if (RM) apply(manual); tg.setAttribute('aria-pressed', to); tg.firstChild.textContent = to ? 'Show before' : 'Show with N-Ops'; animateTo(manual); };
  function animateTo(target) { if (RM) return; const s = psP, t0 = performance.now(); manual = null; const st = t => { const k = Math.min(1, (t - t0) / 900); psP = s + (target - s) * k; if (k < 1) requestAnimationFrame(st); else manual = target; }; requestAnimationFrame(st); }
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !desk() && manual === null && psP < .5) setTimeout(() => { if (manual === null) { animateTo(1); tg.setAttribute('aria-pressed', true); tg.firstChild.textContent = 'Show before'; } }, 900); }, { threshold: .6 }).observe(stage);

  /* ── bento bits ── */
  const srvNames = ['web-01', 'web-02', 'web-03', 'api-01', 'api-02', 'db-01', 'db-02', 'cache-1', 'edge-1', 'edge-2', 'wrk-01', 'wrk-02'];
  $('#srv').innerHTML = srvNames.map((n, i) => `<div><i style="--i:${i}"></i>${n}</div>`).join('');
  $$('.bc').forEach(c => c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }));
  const SEC = 'postgres://app:Xk9#m2@db:5432/main', sv = $('#secretV'), sc = $('#secretCard');
  let sT;
  const dec = on => {
    clearInterval(sT); sc.classList.toggle('open', on);
    if (!on) { sv.textContent = '•'.repeat(22); return; }
    if (RM) { sv.textContent = SEC; return; }
    let k = 0;
    sT = setInterval(() => {
      k++;
      sv.textContent = SEC.split('').map((c, i) => i < k ? c : i < k + 6 ? pick('ABCDEF0123456789#$%'.split('')) : '•').join('').slice(0, Math.max(22, k));
      if (k >= SEC.length) clearInterval(sT);
    }, 32);
  };
  ['pointerenter', 'focus'].forEach(ev => sc.addEventListener(ev, () => dec(true)));
  ['pointerleave', 'blur'].forEach(ev => sc.addEventListener(ev, () => dec(false)));
  const L = [['t', '12:04:11'], ['i', 'INFO'], ' web-01 GET /health 200', ['t', '12:04:12'], ['w', 'WARN'], ' wrk-03 cpu 88%', ['t', '12:04:12'], ['i', 'INFO'], ' dep_7f2a started', ['t', '12:04:14'], ['i', 'INFO'], ' 6/6 servers ok', ['t', '12:04:15'], ['e', 'ERR '], ' redis timeout (retry 1)', ['t', '12:04:15'], ['i', 'INFO'], ' redis reconnected', ['t', '12:04:17'], ['i', 'INFO'], ' secret v4 injected'];
  let lh = ''; for (let i = 0; i < L.length; i += 3) lh += `<div><span class="t">${L[i][1]}</span> <span class="${L[i + 1][0]}">${L[i + 1][1]}</span>${L[i + 2]}</div>`;
  $('#logs').innerHTML = lh + lh;
  // workflow pulse along path, lighting nodes as it passes
  const wfp = $('#wfp'), dot = $('#wfdot'), wn = $$('#wf .n');
  if (!RM) {
    const len = wfp.getTotalLength(); let t0 = performance.now(), on = false;
    new IntersectionObserver(([e]) => on = e.isIntersecting).observe($('#wf'));
    const wfLoop = t => {
      if (on) {
        const k = ((t - t0) / 2600) % 1, pt = wfp.getPointAtLength(k * len);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
        wn[0].classList.toggle('hit', k < .12); wn[1].classList.toggle('hit', k > .42 && k < .58); wn[2].classList.toggle('hit', k > .88);
      }
      requestAnimationFrame(wfLoop);
    };
    requestAnimationFrame(wfLoop);
  }

  /* ── terminal ── */
  const session = [
    ['cmd', 'nops server add prod-web-01 --host 10.0.1.12'],
    ['ok', '✓ Server connected · Ubuntu 24.04 · agent v1.0'],
    ['cmd', 'nops secret set DATABASE_URL --env production'],
    ['ok', '✓ Secret encrypted and stored'],
    ['cmd', 'nops deploy ./config --target group:web'],
    ['ar', '→ Deploying to 6 servers …'],
    ['ok', '✓ 6/6 succeeded in 4.2s'],
  ];
  $('#cliSr').textContent = session.map(([t, s]) => (t === 'cmd' ? '$ ' : '') + s).join('. ');
  const cli = $('#cli'); let run = 0, started = false;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const hlc = s => esc(s).replace(/^(nops)/, '<span class="cmdn">$1</span>').replace(/(--[\w-]+)/g, '<span class="fl">$1</span>');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function play() {
    const id = ++run; started = true;
    if (RM) { cli.innerHTML = session.map(([t, s]) => t === 'cmd' ? `<span class="p">❯</span> ${hlc(s)}` : `<span class="${t}">${esc(s)}</span>`).join('\n'); return; }
    let out = '';
    for (const [t, s] of session) {
      if (t === 'cmd') {
        for (let i = 1; i <= s.length; i++) { if (id !== run) return; cli.innerHTML = out + `<span class="p">❯</span> ${hlc(s.slice(0, i))}<span class="cur"></span>`; await sleep(rand(18, 48)); }
        out += `<span class="p">❯</span> ${hlc(s)}\n`; await sleep(360);
      } else {
        if (t === 'ar') { for (let k = 0; k < 8; k++) { if (id !== run) return; cli.innerHTML = out + `<span class="ar">${'⠋⠙⠹⠸⠼⠴⠦⠧'[k]} Deploying to 6 servers …</span>`; await sleep(110); } }
        out += `<span class="${t}">${esc(s)}</span>\n`; cli.innerHTML = out + '<span class="cur"></span>'; await sleep(420);
      }
      if (id !== run) return;
    }
    cli.innerHTML = out + `<span class="p">❯</span> <span class="cur"></span>`;
  }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting && !started) { play(); o.disconnect(); } }, { threshold: .45 }).observe($('.tdemo'));
  const tabs = $$('.tab');
  const selTab = t => tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).classList.toggle('on', on); });
  tabs.forEach((t, i) => { t.onclick = () => selTab(t); t.onkeydown = e => { const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; selTab(n); n.focus(); } }; });
  $('#replay').onclick = () => { selTab(tabs[0]); play(); };

  /* ── steps: scroll-linked line ── */
  const steps = $('#steps'), stepEls = $$('.step', steps);
  const stepScroll = () => {
    const r = steps.getBoundingClientRect();
    const p = RM ? 1 : clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .25), 0, 1);
    steps.style.setProperty('--p', p);
    stepEls.forEach((s, i) => s.classList.toggle('lit', p >= i / 3 + .05));
  };
  addEventListener('scroll', stepScroll, { passive: true }); stepScroll();

  /* ── architecture ── */
  const AI = {
    core: ['Control plane', 'The brain', 'Holds desired state, schedules jobs, enforces RBAC and writes the audit log.', ['Single binary or container', 'PostgreSQL for state', 'MFA: TOTP, FIDO2/WebAuthn, security keys', 'Scale out for high availability']],
    agents: ['Edge', 'Agents', 'A tiny daemon on each Linux server. It dials out to the control plane — no inbound ports to open.', ['Outbound TLS only', 'Runs commands, syncs files', 'Streams health metrics', 'Auto reconnect and update']],
    docker: ['Runtime', 'Docker hosts', 'Containers, images, volumes and networks, managed through the agent on each host.', ['Start, stop, restart, scale', 'Live logs and stats', 'Docker, Podman and Compose stacks']],
    vault: ['Security', 'Secrets vault', 'Encrypted at rest, decrypted only on the target server at deploy time.', ['AES-256-GCM envelope encryption', 'Scoped by project → service → environment', 'Versioned, with rollback and audit log']],
    iface: ['Interfaces', 'API · CLI · UI', 'Three doors, one source of truth. Anything you can click, you can script.', ['REST API with scoped tokens', 'nops CLI for terminals and CI', 'Web dashboard', 'Client libs: Rust, Python, Go, JS']],
  };
  const ab = $('#ainfo-body');
  const apk = $('#apk'), NS = 'http://www.w3.org/2000/svg';
  if (!RM) $$('.asvg .al').forEach((p, i) => {
    const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3.5); c.setAttribute('class', 'pk');
    const m = document.createElementNS(NS, 'animateMotion'); m.setAttribute('dur', 2.4 + i * .3 + 's'); m.setAttribute('repeatCount', 'indefinite'); m.setAttribute('path', p.getAttribute('d'));
    if (i % 2) { m.setAttribute('keyPoints', '1;0'); m.setAttribute('keyTimes', '0;1'); m.setAttribute('calcMode', 'linear'); }
    c.appendChild(m); apk.appendChild(c);
  });
  let cur = '';
  const showA = k => {
    if (k === cur) return; cur = k;
    const [t, h, p, li] = AI[k];
    ab.innerHTML = `<span class="tag"><b>${t}</b></span><h3>${h}</h3><p>${p}</p><ul>${li.map(x => `<li><svg class="ic"><use href="#i-check"/></svg>${x}</li>`).join('')}</ul>`;
    ab.style.animation = 'none'; void ab.offsetWidth; ab.style.animation = '';
    $$('.asvg .an').forEach(n => n.classList.toggle('hot', n.dataset.n === k || (k !== 'core' && n.dataset.n === 'core')));
    $$('.asvg .al').forEach(l => l.classList.toggle('hot', k === 'core' || l.dataset.l === k));
  };
  $$('.asvg .an').forEach(n => ['pointerenter', 'focus', 'click'].forEach(ev => n.addEventListener(ev, () => showA(n.dataset.n))));
  showA('core');

  /* ── heatmap + live commits ── */
  let seed = 11; const sr = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let total = 0;
  $('#hm').innerHTML = Array.from({ length: 182 }, (_, i) => {
    const r = sr() * .9 + i / 182 * .4, l = r < .3 ? 0 : r < .55 ? 1 : r < .78 ? 2 : r < 1 ? 3 : 4; total += l * 3;
    return `<i class="${l ? 'l' + l : ''}" style="--i:${i}"></i>`;
  }).join('');
  const hmCells = $$('#hm i');
  const cc = $('#ccount'), setCC = () => cc.textContent = total.toLocaleString() + ' contributions';
  setCC();
  const commits = ['feat(secrets): per-env rotation policies', 'fix(agent): reconnect backoff on flaky links', 'feat(docker): compose stack diff view', 'perf(fleet): 3× faster inventory sync', 'docs: self-hosting on ARM64', 'feat(cli): nops run --parallel', 'fix(ui): keyboard nav in file tree', 'feat(api): scoped deploy tokens'];
  const users = ['@nekonik', '@ops-anna', '@k8sless', '@mira', '@devraj', '@tlin'];
  const setCommit = () => { $('#commitTxt').innerHTML = `<span class="hash">${Math.random().toString(16).slice(2, 9)}</span><span class="msg">${pick(commits)}</span><span style="margin-left:auto;color:var(--mute)">${pick(users)}</span>`; };
  setCommit();
  every(3200, () => {
    setCommit();
    const c = hmCells[hmCells.length - 1 - Math.floor(Math.random() * 7)];
    const l = Math.min(4, (+(c.className.match(/l(\d)/) || [0, 0])[1]) + 1);
    c.className = 'l' + l; void c.offsetWidth; c.classList.add('new'); total += 1; setCC();
  });

  /* ── testimonials ── */
  const Q = [
    ['Replaced three tools and a spreadsheet in an afternoon.', 'Platform engineer', '#8A7CFF', '#fff'],
    ['Secrets that are finally not sitting in plain .env files.', 'DevOps lead', '#4CF2C0', '#0D0E12'],
    ['Self-hosted on a $5 VPS. It just worked.', 'Indie developer', '#0D0E12', '#4CF2C0'],
    ['The CLI and the UI do exactly the same thing. That sold me.', 'SRE', '#E2F6EC', '#087848'],
    ['No feature gating means our team of four gets SSO too.', 'CTO, early-stage startup', '#FFF2D6', '#8F5D00'],
    ['Rolling deploys to 40 servers with one command.', 'Sysadmin', '#EFECFF', '#6C56DB'],
  ];
  const card = ([q, r, bg, fg]) => `<figure class="q"><blockquote>${q}</blockquote><figcaption><span class="av" style="background:${bg};color:${fg}">PN</span><div><b>Placeholder Name</b><span>${r}</span></div></figcaption></figure>`;
  const r1 = Q, r2 = [...Q.slice(3), ...Q.slice(0, 3)];
  $('#tm').innerHTML = `<div class="tt">${[...r1, ...r1].map(card).join('')}</div><div class="tt r">${[...r2, ...r2].map(card).join('')}</div>`;

  /* ── faq ── */
  const F = [
    ['Is N-Ops really free?', 'Yes. The self-hosted edition is fully open source with every feature included. You only pay if you want us to host and operate it for you.'],
    ["What's the difference between self-hosted and managed?", 'The software is identical. Self-hosted runs on your infrastructure and you handle upgrades and backups. Managed Cloud is operated by us — upgrades, backups and support included.'],
    ['Which operating systems are supported?', 'The agent runs on modern Linux distributions — Ubuntu, Debian, RHEL, Rocky and Alpine — on both x86_64 and ARM64.'],
    ['How are secrets stored and encrypted?', 'With envelope encryption (AES-256-GCM) at rest. Secrets are decrypted only on the target server at deploy time, and every read and change is written to the audit log.'],
    ['Who maintains N-Ops?', 'N-Ops is built in the open by Neko Nik, in partnership with YSPL, together with community contributors on GitHub.'],
    ['Do you offer enterprise SLAs?', 'Yes. Enterprise includes a dedicated managed deployment with uptime SLAs, priority support and guided onboarding. Contact sales for details.'],
    ['What MFA options are supported?', 'Email, TOTP, physical security keys, FIDO2 and WebAuthn, enforced per organization through RBAC and required for sensitive, approval-gated operations.'],
    ['Does N-Ops integrate with Ansible or PostgreSQL?', 'Ansible playbooks run through the same durable job queues as any other rollout. Direct PostgreSQL connection and query execution is on the roadmap, not a committed feature yet.'],
  ];
  $('#faq').innerHTML = F.map(([q, a], i) => `<div class="qa"><h3><button aria-expanded="false" aria-controls="fa${i}" id="fq${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${q}<span class="pm"><svg class="ic"><use href="#i-plus"/></svg></span></button></h3><div class="ans" id="fa${i}" role="region" aria-labelledby="fq${i}"><div><p>${a}</p></div></div></div>`).join('');
  $$('.qa button').forEach(b => b.onclick = () => { const o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', o); b.closest('.qa').classList.toggle('open', o); });
})();
