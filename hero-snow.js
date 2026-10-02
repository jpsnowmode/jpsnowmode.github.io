/* Hero quick-booking slide (「滑動開始預約」) → full-screen snowfall → scroll to #booking.
   Same 3-layer sprite snow as the SNOW MODE switch, but on a fixed, pointer-events:none overlay.
   Timeline: slide complete → hero lights up (SWITCH ON) + snow start at once → ~800ms → smooth scroll (prefill unchanged)
             → snow keeps falling during the scroll → fades out ~2.5s after arriving.
   prefers-reduced-motion: no snow, scroll straight away. */
(function () {
  'use strict';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DELAY = 800, LINGER = 2500, FADE_IN = 0.45, FADE_OUT = 1.3;

  var canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0;
  var flakes = [], level = 0, levelTarget = 0, timers = [];

  function sprite(px, stops) {
    var c = document.createElement('canvas'); c.width = c.height = px;
    var g = c.getContext('2d'), r = px / 2, grd = g.createRadialGradient(r, r, 0, r, r, r);
    for (var i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grd; g.fillRect(0, 0, px, px); return c;
  }
  var SPR, LAYERS = {
    far:  { d: [6, 11],  a: [0.3, 0.55],  v: [9, 16],  s: [4, 10],  w: 0.35 },
    mid:  { d: [12, 20], a: [0.5, 0.8],   v: [20, 32], s: [8, 18],  w: 0.7 },
    near: { d: [36, 72], a: [0.16, 0.32], v: [48, 72], s: [14, 30], w: 1.35 }
  };
  // a touch faster than the hero (the overlay is only on screen for a few seconds)
  var SPEED = 1.6;
  function rnd(a) { return a[0] + Math.random() * (a[1] - a[0]); }

  function ensure() {
    if (canvas) return !!ctx;
    canvas = document.createElement('canvas');
    canvas.className = 'hs-snow'; canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return false;
    SPR = {
      far: sprite(32, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.7)'], [0.6, 'rgba(240,246,255,.18)'], [1, 'rgba(240,246,255,0)']]),
      mid: sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.85)'], [0.62, 'rgba(245,249,255,.3)'], [1, 'rgba(245,249,255,0)']]),
      near: sprite(128, [[0, 'rgba(255,255,255,.75)'], [0.45, 'rgba(250,252,255,.6)'], [0.72, 'rgba(232,240,255,.22)'], [1, 'rgba(232,240,255,0)']])
    };
    window.addEventListener('resize', function () { if (flakes.length) size(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } else schedule();
    });
    return true;
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function counts() {
    var n = Math.round(Math.max(55, Math.min(110, W * H / 6000)));
    var near = W < 600 ? 4 : 6, far = Math.round((n - near) * 0.55);
    return { far: far, mid: n - near - far, near: near };
  }
  function makeFlake(k, initial) {
    var L = LAYERS[k], d = rnd(L.d);
    return { k: k, img: SPR[k], d: d,
      x: Math.random() * (W + 2 * d) - d,
      // initial burst: most flakes already in the upper part of the screen, the rest just above it
      y: initial ? Math.random() * (H * 0.9 + d) - H * 0.25 : -d - Math.random() * H * 0.3,
      vy: rnd(L.v) * SPEED, sway: rnd(L.s), wf: L.w * (0.8 + Math.random() * 0.4),
      ph: Math.random() * 6.283, fq: 0.25 + Math.random() * 0.5, a: rnd(L.a) };
  }
  var gust = 0, gustTarget = 0, nextGust = 2;
  function wind(dt) {
    if (clock > nextGust) {
      gustTarget = gustTarget ? 0 : (8 + Math.random() * 14) * (Math.random() < 0.8 ? 1 : -0.6);
      nextGust = clock + (gustTarget ? 1.8 + Math.random() * 2 : 4 + Math.random() * 4);
    }
    gust += (gustTarget - gust) * Math.min(1, dt * 0.9);
    return 7 + Math.sin(clock * 0.11) * 6 + Math.sin(clock * 0.29 + 1.3) * 3 + gust;
  }
  var ORDER = { far: 0, mid: 1, near: 2 };
  function frame(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t; clock += dt;
    if (level < levelTarget) level = Math.min(levelTarget, level + dt / FADE_IN);
    else if (level > levelTarget) level = Math.max(levelTarget, level - dt / FADE_OUT);
    var wv = wind(dt);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy * dt; f.ph += f.fq * dt; f.x += wv * f.wf * dt;
      var x = f.x + Math.sin(f.ph) * f.sway, d = f.d;
      if (x > W + d) f.x -= W + 2 * d; else if (x < -2 * d) f.x += W + 2 * d;
      if (f.y - d > H) { flakes[i] = makeFlake(f.k, false); continue; }
      ctx.globalAlpha = f.a * level;
      ctx.drawImage(f.img, x - d / 2, f.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    if (level > 0 || levelTarget > 0) schedule();
    else { ctx.clearRect(0, 0, W, H); flakes = []; last = 0; canvas.classList.remove('on'); }
  }
  function schedule() { if (!raf && !document.hidden && flakes.length) raf = requestAnimationFrame(frame); }
  function start() {
    if (!ensure()) return false;
    size(); levelTarget = 1; canvas.classList.add('on');
    if (!flakes.length) {
      var c = counts();
      ['far', 'mid', 'near'].forEach(function (k) { for (var i = 0; i < c[k]; i++) flakes.push(makeFlake(k, true)); });
      flakes.sort(function (a, b) { return ORDER[a.k] - ORDER[b.k]; });
    }
    schedule(); return true;
  }
  function stop() { levelTarget = 0; schedule(); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // resolve once the smooth scroll has settled (scrollend where supported, else "no movement for 180ms")
  function whenArrived(cb) {
    var done = false, lastY = -1, still = 0, t0 = Date.now();
    function finish() { if (done) return; done = true; window.removeEventListener('scrollend', finish); cb(); }
    if ('onscrollend' in window) window.addEventListener('scrollend', finish, { once: true });
    (function poll() {
      if (done) return;
      var y = window.scrollY;
      still = (y === lastY) ? still + 1 : 0; lastY = y;
      if ((still >= 3 && Date.now() - t0 > 250) || Date.now() - t0 > 4000) return finish();
      setTimeout(poll, 60);
    })();
  }

  /* light the page up exactly like SWITCH ON: flip the real hero switch through its own click handler
     (setOn(true) → .hero.is-on colour/glow, switch glow, SNOW MODE: ON status + CTA, hero snowfall).
     SWITCH ON is a toggle (not persisted), so it simply stays ON after the slide; never toggles it OFF. */
  function lightUp() {
    var sw = document.getElementById('snow-switch');
    if (sw && sw.getAttribute('aria-checked') !== 'true') sw.click();
  }

  /* called by the (patched) quick-card flow once validation + prefill passed; scrollFn does the real scroll */
  window.SMHeroSnow = {
    run: function (scrollFn) {
      clearTimers();
      lightUp();
      if (mqReduce.matches || !start()) { scrollFn(); return; }
      document.documentElement.setAttribute('data-hero-snow', 'falling');
      later(function () {
        document.documentElement.setAttribute('data-hero-snow', 'scrolling');
        scrollFn();
        whenArrived(function () {
          document.documentElement.setAttribute('data-hero-snow', 'arrived');
          later(function () { stop(); document.documentElement.setAttribute('data-hero-snow', 'fading'); }, LINGER);
        });
      }, DELAY);
    },
    stop: function () { clearTimers(); stop(); }
  };
  mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) { if (e.matches) window.SMHeroSnow.stop(); });
})();
