/* PREVIEW ONLY (preview-snow.html) — slide-to-submit switch + full-page snow completion.
   Loaded after script.js. Submission is MOCKED here: nothing is sent to the real backend. */
(function () {
  'use strict';
  var S = window.SNOWMODE; if (!S) return;
  var form = document.getElementById('book-form');
  var real = document.getElementById('wiz-send');
  var sw = document.getElementById('sx-send');
  var doneEl = document.getElementById('done');
  if (!form || !real || !sw) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- mock submit: never posts; returns a ref in the backend's format ---- */
  var called = false;
  S.submitBooking = function (payload) {
    called = true;
    S.previewPayload = payload;
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var ref = 'SM-' + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    return new Promise(function (res) { setTimeout(function () { res({ ok: true, ref: ref, preview: true }); }, 1100); });
  };

  /* ---- the real submit button stays in the DOM (script.js toggles it); the switch mirrors its visibility ---- */
  real.classList.add('sx-real');
  var mirror = function () { sw.hidden = real.hidden; };
  new MutationObserver(mirror).observe(real, { attributes: true, attributeFilter: ['hidden'] }); mirror();

  /* ---- switch mechanics (same feel as the hero 「滑動開始預約」 switch) ---- */
  var busy = false, drag = null, lastDrag = 0, t1 = 0;
  function clearDrag() { sw.classList.remove('dragging'); sw.style.removeProperty('--x'); sw.style.removeProperty('--p'); }
  function reset() { clearTimeout(t1); busy = false; drag = null; clearDrag(); sw.classList.remove('is-on', 'is-busy', 'sx-back'); }
  function bounceBack() {
    sw.classList.add('sx-back'); sw.classList.remove('is-on', 'is-busy');
    setTimeout(function () { sw.classList.add('sx-shake'); }, 380);
    setTimeout(function () { sw.classList.remove('sx-shake', 'sx-back'); busy = false; }, 900);
    flagInvalid();
  }
  function flagInvalid() {
    var step = form.querySelector('.step.on') || form;
    var bad = [].slice.call(step.querySelectorAll('[aria-invalid="true"]'));
    var agreeErr = form.querySelector('[data-err="agree"]');
    if (agreeErr && agreeErr.textContent) bad.push(form.querySelector('.agree'));
    bad.forEach(function (el) {
      if (!el) return; var box = el.closest('.agree') || el;
      box.classList.remove('sx-flag'); void box.offsetWidth; box.classList.add('sx-flag');
      setTimeout(function () { box.classList.remove('sx-flag'); }, 1700);
    });
    if (bad[0]) bad[0].scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  function fire() {
    if (busy) return;
    busy = true; drag = null; clearDrag();
    sw.classList.add('is-on');
    t1 = setTimeout(function () {
      called = false;
      form.requestSubmit ? form.requestSubmit(real) : real.click();
      // script.js validates synchronously before calling submitBooking → not called = validation failed
      if (!called) { bounceBack(); return; }
      sw.classList.add('is-busy');
    }, 380);
  }
  sw.addEventListener('click', function (e) { e.preventDefault(); if (Date.now() - lastDrag < 450) return; fire(); });
  sw.addEventListener('pointerdown', function (e) {
    if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var knob = sw.querySelector('.go-knob'), r = sw.getBoundingClientRect(), k = knob.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, max: r.width - k.width - 2 * (k.left - r.left), dx: 0, moved: false };
  });
  sw.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var raw = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(raw) < 6 || Math.abs(raw) < Math.abs(e.clientY - drag.y0)) return;
      drag.moved = true; sw.classList.add('dragging');
      try { sw.setPointerCapture(e.pointerId); } catch (_) {}
    }
    drag.dx = Math.max(0, Math.min(drag.max, raw));
    sw.style.setProperty('--x', drag.dx + 'px'); sw.style.setProperty('--p', (drag.dx / drag.max).toFixed(3));
  });
  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!d.moved) return;
    lastDrag = Date.now();
    if (!cancelled && d.dx > d.max * 0.6) fire();
    else { sw.classList.add('sx-back'); clearDrag(); setTimeout(function () { sw.classList.remove('sx-back'); }, 560); }
  }
  sw.addEventListener('pointerup', function (e) { endDrag(e, false); });
  sw.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  sw.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ---- success: script.js shows #done → start full-page snow + SNOW MODE: ON screen ---- */
  var ov = document.getElementById('sx-done');
  new MutationObserver(function () {
    if (!doneEl.hidden && called) { called = false; reset(); showDone(); }
  }).observe(doneEl, { attributes: true, attributeFilter: ['hidden'] });

  function showDone() {
    document.getElementById('sx-ref').textContent = document.getElementById('done-ref').textContent;
    document.getElementById('sx-method').textContent = document.getElementById('done-method').textContent;
    ov.hidden = false; void ov.offsetWidth; ov.classList.add('in');
    document.documentElement.style.overflow = 'hidden';
    Snow.start();
    setTimeout(function () { document.getElementById('sx-close').focus({ preventScroll: true }); }, 900);
  }
  function hideDone() {
    ov.classList.remove('in'); Snow.stop();
    document.documentElement.style.overflow = '';
    setTimeout(function () { ov.hidden = true; }, 650);
    doneEl.focus && doneEl.focus({ preventScroll: true });
  }
  document.getElementById('sx-close').addEventListener('click', hideDone);
  ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideDone(); });

  /* ---- full-page snowfall: the hero snow engine (same sprites, layers, wind) on a fixed full-screen canvas ---- */
  var Snow = (function () {
    var canvas = document.getElementById('sx-snow'), ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    var flakes = [], W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0, level = 0, levelTarget = 0, FADE = 1.2;
    function sprite(px, stops) {
      var c = document.createElement('canvas'); c.width = c.height = px;
      var g = c.getContext('2d'), r = px / 2, grd = g.createRadialGradient(r, r, 0, r, r, r);
      for (var i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
      g.fillStyle = grd; g.fillRect(0, 0, px, px); return c;
    }
    var SPR = {
      far: sprite(32, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.7)'], [0.6, 'rgba(240,246,255,.18)'], [1, 'rgba(240,246,255,0)']]),
      mid: sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.85)'], [0.62, 'rgba(245,249,255,.3)'], [1, 'rgba(245,249,255,0)']]),
      near: sprite(128, [[0, 'rgba(255,255,255,.75)'], [0.45, 'rgba(250,252,255,.6)'], [0.72, 'rgba(232,240,255,.22)'], [1, 'rgba(232,240,255,0)']])
    };
    var LAYERS = {
      far:  { d: [6, 11],  a: [0.3, 0.55], v: [9, 16],  s: [4, 10],  w: 0.35 },
      mid:  { d: [12, 20], a: [0.5, 0.8],  v: [20, 32], s: [8, 18],  w: 0.7 },
      near: { d: [36, 72], a: [0.16, 0.32], v: [48, 72], s: [14, 30], w: 1.35 }
    };
    var ORDER = { far: 0, mid: 1, near: 2 };
    function rnd(a) { return a[0] + Math.random() * (a[1] - a[0]); }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function counts() {
      var n = Math.round(Math.max(60, Math.min(120, W * H / 6000))), near = W < 600 ? 4 : 6, far = Math.round((n - near) * 0.58);
      return { far: far, mid: n - near - far, near: near };
    }
    function make(kind, initial) {
      var L = LAYERS[kind], d = rnd(L.d);
      return { k: kind, img: SPR[kind], d: d, x: Math.random() * (W + 2 * d) - d,
        y: initial ? Math.random() * (H + d) - d - H * 0.6 : -d - Math.random() * H * 0.3,
        vy: rnd(L.v) * 1.15, sway: rnd(L.s), wf: L.w * (0.8 + Math.random() * 0.4), ph: Math.random() * 6.283, fq: 0.25 + Math.random() * 0.5, a: rnd(L.a) };
    }
    var gust = 0, gustTarget = 0, nextGust = 4;
    function wind(dt) {
      if (clock > nextGust) { gustTarget = gustTarget ? 0 : (8 + Math.random() * 14) * (Math.random() < 0.8 ? 1 : -0.6); nextGust = clock + (gustTarget ? 1.8 + Math.random() * 2 : 5 + Math.random() * 6); }
      gust += (gustTarget - gust) * Math.min(1, dt * 0.9);
      return 7 + Math.sin(clock * 0.11) * 6 + Math.sin(clock * 0.29 + 1.3) * 3 + gust;
    }
    function frame(t) {
      raf = 0;
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t; clock += dt;
      if (level < levelTarget) level = Math.min(levelTarget, level + dt / FADE); else if (level > levelTarget) level = Math.max(levelTarget, level - dt / FADE);
      var wv = wind(dt); ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i]; f.y += f.vy * dt; f.ph += f.fq * dt; f.x += wv * f.wf * dt;
        var x = f.x + Math.sin(f.ph) * f.sway, d = f.d;
        if (x > W + d) f.x -= W + 2 * d; else if (x < -2 * d) f.x += W + 2 * d;
        if (f.y - d > H) { flakes[i] = make(f.k, false); continue; }
        ctx.globalAlpha = f.a * level; ctx.drawImage(f.img, x - d / 2, f.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      if (level > 0 || levelTarget > 0) schedule(); else { ctx.clearRect(0, 0, W, H); flakes = []; last = 0; }
    }
    function schedule() { if (!raf && !document.hidden && flakes.length) raf = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } else schedule(); });
    addEventListener('resize', function () { if (flakes.length) size(); });
    return {
      start: function () {
        if (!ctx || reduce.matches) return;
        size(); levelTarget = 1;
        if (!flakes.length) { var c = counts(); ['far', 'mid', 'near'].forEach(function (k) { for (var i = 0; i < c[k]; i++) flakes.push(make(k, true)); }); flakes.sort(function (a, b) { return ORDER[a.k] - ORDER[b.k]; }); }
        schedule();
      },
      stop: function () { levelTarget = 0; schedule(); }
    };
  })();
})();
