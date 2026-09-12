/* ==========================================================
   روند یدک — صحنه سه‌بعدی هیرو

   دو بخش:
   1) دوربین: لایه‌های پلیت/مه/خودرو روی عمق‌های مختلف Z نشسته‌اند،
      پس یک چرخش و جابه‌جایی واقعیِ دوربین، پارالاکس واقعی می‌سازد —
      نه جابه‌جایی جعلیِ هر لایه. حرکت آهسته خودکار + دنبال‌کردن ماوس + اسکرول.
   2) بوم: باران سه‌لایه، پاشش، دود اگزوز، بازتاب کف خیس و رعد.

   یک حلقه rAF برای هر دو. بدون کتابخانه.
   ========================================================== */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;
  var stage = hero.querySelector('.hero__stage');
  var canvas = hero.querySelector('.hero__fx');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- تنظیمات صحنه ---------- */
  var WIND = 0.28;          /* شیب باران */
  var GROUND = 0.86;        /* خط زمین برای پاشش */
  var EXHAUST_X = 0.055;    /* عقب خودرو در قاب — دود از اینجا بلند می‌شود */
  var EXHAUST_Y = 0.665;

  var LAYERS = [
    { share: 0.44, speed: 800,  len: [10, 18], w: 0.8, a: 0.15, splash: false },
    { share: 0.34, speed: 1260, len: [16, 28], w: 1.1, a: 0.24, splash: false },
    { share: 0.22, speed: 1760, len: [24, 42], w: 1.6, a: 0.38, splash: true }
  ];

  var ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: true }) : null;
  var W = 0, H = 0, DPR = 1, area = 0;
  var drops = [], splashes = [], puffs = [];
  var raf = 0, last = 0, visible = false, started = false;
  var puffClock = 0, sheen = 0, clock = 0;
  var flash = 0, flashQueue = 0, nextFlash = 5000 + Math.random() * 7000;

  /* هدف و مقدار جاری دوربین — میان‌یابی نرم بینشان */
  var cam = { rx: 0, ry: 0, tx: 0, ty: 0, tz: 0 };
  var aim = { rx: 0, ry: 0, tx: 0, ty: 0 };
  var scrollK = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- ذرات ---------- */
  function seedDrops() {
    drops = [];
    var total = Math.round(Math.min(300, Math.max(110, area / 3200)));
    for (var li = 0; li < LAYERS.length; li++) {
      var L = LAYERS[li];
      var n = Math.round(total * L.share);
      for (var i = 0; i < n; i++) {
        drops.push({
          L: L,
          x: rand(-0.25 * W, 1.1 * W),
          y: rand(-H, H),
          len: rand(L.len[0], L.len[1]),
          sp: L.speed * rand(0.85, 1.15)
        });
      }
    }
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height; area = W * H;
    if (!ctx) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seedDrops();
  }

  /* ---------- به‌روزرسانی ---------- */
  function step(dt) {
    var i, d, s, p;
    clock += dt;

    /* دوربین: نفس کشیدن آهسته + کشش به سمت ماوس + پاسخ به اسکرول */
    var breatheZ = Math.sin(clock * 0.22) * 34;
    var breatheY = Math.sin(clock * 0.17 + 1.1) * 0.55;
    var k = Math.min(1, dt * 2.4);
    cam.rx += (aim.rx - cam.rx) * k;
    cam.ry += (aim.ry - cam.ry) * k;
    cam.tx += (aim.tx - cam.tx) * k;
    cam.ty += (aim.ty - cam.ty) * k;
    cam.tz += (breatheZ - cam.tz) * Math.min(1, dt * 1.2);
    if (stage) {
      stage.style.transform =
        'translate3d(' + cam.tx.toFixed(2) + 'px,' + (cam.ty + scrollK * 60).toFixed(2) + 'px,' +
        cam.tz.toFixed(1) + 'px) rotateX(' + cam.rx.toFixed(3) + 'deg) rotateY(' +
        (cam.ry + breatheY).toFixed(3) + 'deg)';
    }

    if (!ctx) return;

    /* باران */
    for (i = 0; i < drops.length; i++) {
      d = drops[i];
      d.y += d.sp * dt;
      d.x += d.sp * dt * WIND;
      if (d.L.splash && d.y > H * GROUND) {
        if (splashes.length < 50) {
          splashes.push({ x: d.x, y: H * GROUND + rand(-4, 10), r: 1, max: rand(5, 14), t: 0, ttl: rand(0.35, 0.6) });
        }
        d.y = rand(-H * 0.35, -10);
        d.x = rand(-0.25 * W, 1.1 * W);
      } else if (d.y - d.len > H) {
        d.y = rand(-H * 0.3, -10);
        d.x = rand(-0.25 * W, 1.1 * W);
      }
      if (d.x > 1.15 * W) d.x -= 1.4 * W;
    }

    for (i = splashes.length - 1; i >= 0; i--) {
      s = splashes[i];
      s.t += dt;
      s.r = s.max * (s.t / s.ttl);
      if (s.t >= s.ttl) splashes.splice(i, 1);
    }

    /* دود اگزوز */
    puffClock += dt;
    while (puffClock > 0.05) {
      puffClock -= 0.05;
      if (puffs.length < 85) {
        puffs.push({
          x: W * EXHAUST_X + rand(-5, 5),
          y: H * EXHAUST_Y + rand(-4, 4),
          r: rand(4, 8),
          vx: rand(-9, 2),            /* خودرو رو به راست است؛ دود عمدتا بالا می‌رود */
          vy: rand(-58, -34),
          ph: rand(0, 6.28),
          t: 0,
          ttl: rand(2.2, 3.2),
          a: rand(0.11, 0.2)
        });
      }
    }
    for (i = puffs.length - 1; i >= 0; i--) {
      p = puffs[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.997;
      p.vx -= 3 * dt;
      p.r += 13 * dt;
      if (p.t >= p.ttl) puffs.splice(i, 1);
    }

    sheen += dt;

    /* رعد */
    nextFlash -= dt * 1000;
    if (nextFlash <= 0) {
      flash = 1; flashQueue = 1;
      nextFlash = 8000 + Math.random() * 10000;
    }
    if (flash > 0) {
      flash -= dt * 5.5;
      if (flash <= 0) {
        flash = 0;
        if (flashQueue > 0) { flashQueue--; flash = 0.7; }
      }
    }
  }

  /* ---------- ترسیم ---------- */
  function draw() {
    if (!ctx) return;
    var i, d, s, p, g;
    ctx.clearRect(0, 0, W, H);

    /* بازتاب نور روی کف خیس */
    var base = H * 0.9;
    for (i = 0; i < 5; i++) {
      var wob = 0.5 + 0.5 * Math.sin(sheen * 1.05 + i * 1.9);
      var rx = W * (0.18 + i * 0.16) + Math.sin(sheen * 0.55 + i * 2.3) * 10;
      var ry = base + (H - base) * 0.45;
      var rad = 30 + wob * 20;
      g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      g.addColorStop(0, 'rgba(158,196,240,' + (0.05 + wob * 0.045).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(158,196,240,' + (0.02 + wob * 0.02).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(158,196,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rad, rad * 0.42, 0, 0, 6.2832);
      ctx.fill();
    }

    /* دود اگزوز — پشت باران */
    for (i = 0; i < puffs.length; i++) {
      p = puffs[i];
      var kk = p.t / p.ttl;
      var alpha = p.a * Math.sin(Math.min(1, kk) * Math.PI);
      if (alpha <= 0.002) continue;
      var px = p.x + Math.sin(p.t * 2.1 + p.ph) * p.t * 5.5;
      g = ctx.createRadialGradient(px, p.y, 0, px, p.y, p.r);
      g.addColorStop(0, 'rgba(196,205,216,' + alpha.toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(176,186,200,' + (alpha * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(160,172,188,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }

    /* باران */
    ctx.lineCap = 'round';
    for (i = 0; i < drops.length; i++) {
      d = drops[i];
      if (d.y < -d.len || d.y > H + d.len) continue;
      ctx.strokeStyle = 'rgba(198,220,244,' + d.L.a + ')';
      ctx.lineWidth = d.L.w;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * WIND, d.y - d.len);
      ctx.stroke();
    }

    /* پاشش */
    for (i = 0; i < splashes.length; i++) {
      s = splashes[i];
      var sa = (1 - s.t / s.ttl) * 0.3;
      if (sa <= 0) continue;
      ctx.strokeStyle = 'rgba(206,226,248,' + sa.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.32, 0, Math.PI, 0);
      ctx.stroke();
    }

    /* رعد */
    if (flash > 0) {
      var f = flash * flash;
      ctx.fillStyle = 'rgba(188,214,255,' + (f * 0.13).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
      g.addColorStop(0, 'rgba(226,238,255,' + (f * 0.15).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(226,238,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H * 0.6);
    }
  }

  /* ---------- حلقه ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    step(dt);
    draw();
  }

  function start() { if (!raf && !reduce.matches) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function boot() {
    if (started) return;
    started = true;
    resize();
    if (!reduce.matches) start();
  }

  /* ---------- ورودی‌ها ---------- */
  hero.addEventListener('pointermove', function (e) {
    if (reduce.matches || e.pointerType === 'touch') return;
    var r = hero.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width - 0.5;      /* -0.5 .. 0.5 */
    var ny = (e.clientY - r.top) / r.height - 0.5;
    aim.ry = nx * 3.2;
    aim.rx = -ny * 2.0;
    aim.tx = -nx * 26;
    aim.ty = -ny * 16;
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    aim.rx = aim.ry = aim.tx = aim.ty = 0;
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var r = hero.getBoundingClientRect();
    scrollK = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) { boot(); start(); } else { stop(); }
    }, { threshold: 0.01 }).observe(hero);
  } else {
    boot();
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (started) resize(); }).observe(hero);
  } else {
    window.addEventListener('resize', function () { if (started) resize(); });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible) start();
  });

  reduce.addEventListener('change', function () {
    if (reduce.matches) {
      stop();
      if (ctx) ctx.clearRect(0, 0, W, H);
      if (stage) stage.style.transform = '';
    } else if (visible) start();
  });
})();
