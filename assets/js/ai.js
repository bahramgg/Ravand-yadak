/* ==========================================================
   روند یدک — دستیار هوشمند عیب‌یابی
   گفت‌وگوی چندمرحله‌ای: شرح مشکل ← احتمالات و پرسش‌های دقیق ← پیشنهاد قطعه.
   مدل زبانی فقط روی سرور (server/index.js) صدا زده می‌شود؛ کلید هیچ‌وقت به مرورگر نمی‌آید.
   همه‌ی متن‌های مدل پیش از نمایش escape می‌شوند.
   ========================================================== */
(function () {
  'use strict';

  var root = document.getElementById('diagnose');
  if (!root) return;

  var LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var metaApi = document.querySelector('meta[name="ry-ai-api"]');
  var API = LOCAL ? 'http://127.0.0.1:8792'
    : ((metaApi && metaApi.content) || 'https://ravand-yadak-api.onrender.com');
  var CATALOG = window.RY_CATALOG || {};
  var MAX_ROUNDS = 5;

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }
  function toman(n) { return fa(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); }
  function toEn(s) {
    return String(s || '')
      .replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
  }
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  var form = document.getElementById('aiStart');
  var thread = document.getElementById('aiThread');
  var textEl = document.getElementById('aiText');
  var carEl = document.getElementById('aiCar');
  var yearEl = document.getElementById('aiYear');
  var kmEl = document.getElementById('aiKm');
  var countEl = document.getElementById('aiCount');
  var launcher = document.getElementById('aiLauncher');
  if (!form || !thread || !textEl) return;

  var state = { vehicle: null, turns: [], busy: false };

  /* ---------- start form ---------- */
  function updateCount() { if (countEl) countEl.textContent = fa(textEl.value.length) + ' / ' + fa(1200); }
  textEl.addEventListener('input', updateCount);
  updateCount();

  root.querySelectorAll('[data-symptom]').forEach(function (b) {
    b.addEventListener('click', function () {
      var add = b.getAttribute('data-symptom');
      var v = textEl.value.trim();
      if (v.indexOf(add) === -1) textEl.value = v ? v + '، ' + add : add;
      b.classList.add('is-used');
      textEl.focus();
      updateCount();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.busy) return;
    var text = textEl.value.trim();
    if (text.length < 8) { flash(form, 'لطفاً مشکل خودرو را کمی کامل‌تر شرح دهید.'); textEl.focus(); return; }
    state.vehicle = {
      model: carEl ? carEl.value.trim() : '',
      year: yearEl ? toEn(yearEl.value.trim()) : '',
      km: kmEl ? toEn(kmEl.value.trim()) : ''
    };
    state.turns = [{ role: 'user', text: text }];
    form.hidden = true;
    thread.hidden = false;
    thread.innerHTML = '';
    appendUser(text, true);
    ask();
  });

  /* ---------- thread ---------- */
  function appendUser(text, first) {
    var v = state.vehicle || {};
    var meta = first
      ? [v.model, v.year && fa(v.year), v.km && (fa(v.km) + ' کیلومتر')].filter(Boolean).join(' • ')
      : '';
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg--user';
    el.innerHTML = (meta ? '<span class="ai-msg__meta">' + esc(meta) + '</span>' : '') +
      '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>';
    thread.appendChild(el);
  }

  function ask() {
    state.busy = true;
    var loading = document.createElement('div');
    loading.className = 'ai-card ai-card--loading';
    loading.innerHTML = '<div class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<p class="ai-loading__text">در حال بررسی علائم و احتمالات...</p>';
    thread.appendChild(loading);
    reveal(loading);

    var slowTimer = setTimeout(function () {
      var t = loading.querySelector('.ai-loading__text');
      if (t) t.textContent = 'دستیار در حال آماده شدن است؛ اولین درخواست ممکن است تا یک دقیقه طول بکشد.';
    }, 7000);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var hardTimer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 95000);

    fetch(API + '/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle: state.vehicle, turns: state.turns }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok || !res.j || !res.j.data) {
        throw new Error((res.j && res.j.error && res.j.error.message) || '');
      }
      state.turns.push({ role: 'assistant', data: res.j.data });
      var card = renderAnswer(res.j.data, res.j.meta || {});
      loading.replaceWith(card);
      reveal(card);
    }).catch(function (err) {
      var msg = err && err.name === 'AbortError'
        ? 'پاسخ دستیار بیش از حد طول کشید. دوباره تلاش کنید.'
        : (err && /[؀-ۿ]/.test(err.message || '')
          ? err.message
          : 'اتصال به دستیار برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.');
      var card = renderError(msg);
      loading.replaceWith(card);
      reveal(card);
    }).then(function () {
      clearTimeout(slowTimer);
      clearTimeout(hardTimer);
      state.busy = false;
    });
  }

  var URG = { low: ['کم', 'low'], medium: ['متوسط', 'medium'], high: ['بالا', 'high'] };

  function renderAnswer(d, meta) {
    var el = document.createElement('div');
    el.className = 'ai-card ai-card--' + (d.stage === 'result' ? 'result' : 'questions');
    var u = URG[d.urgency] || URG.medium;
    var h = '';

    h += '<header class="ai-card__head"><span class="ai-card__who"><i class="ai-spark" aria-hidden="true"></i>' +
      (d.stage === 'result' ? 'نتیجه‌ی بررسی' : 'تحلیل دستیار') + '</span>' +
      '<span class="ai-urg ai-urg--' + u[1] + '">فوریت: ' + u[0] + '</span></header>';
    if (d.safety_note) h += '<p class="ai-safety" role="alert">' + esc(d.safety_note) + '</p>';
    if (d.summary && d.stage !== 'result') h += '<p class="ai-card__summary">' + esc(d.summary) + '</p>';
    if (d.stage === 'result' && d.diagnosis) {
      h += '<div class="ai-diag"><b>تشخیص محتمل</b><p>' + esc(d.diagnosis) + '</p></div>';
    }

    if (d.hypotheses && d.hypotheses.length) {
      h += '<div class="ai-hyp"><b class="ai-block__title">' +
        (d.stage === 'result' ? 'علت‌های بررسی‌شده' : 'احتمالات فعلی') + '</b><ul>';
      d.hypotheses.forEach(function (x) {
        var p = Math.max(0, Math.min(100, Number(x.likelihood) || 0));
        h += '<li><div class="ai-hyp__row"><span class="ai-hyp__cause">' + esc(x.cause) + '</span>' +
          '<span class="ai-hyp__pct">٪' + fa(p) + '</span></div>' +
          '<span class="ai-hyp__bar"><i style="width:' + Math.max(3, p) + '%"></i></span>' +
          (x.reason ? '<span class="ai-hyp__why">' + esc(x.reason) + '</span>' : '') + '</li>';
      });
      h += '</ul></div>';
    }

    if (d.stage !== 'result' && d.questions && d.questions.length) {
      h += '<form class="ai-q" novalidate><b class="ai-block__title">برای دقیق‌تر شدن تشخیص:</b>';
      d.questions.forEach(function (q, qi) {
        h += '<fieldset class="ai-q__item" data-q="' + qi + '"><legend>' + esc(q.text) + '</legend><div class="ai-q__opts">';
        (q.options || []).forEach(function (o) {
          h += '<button type="button" class="ai-opt" aria-pressed="false" data-val="' + esc(o) + '">' + esc(o) + '</button>';
        });
        h += '</div></fieldset>';
      });
      h += '<label class="ai-q__more"><span>توضیح بیشتر (اختیاری)</span>' +
        '<textarea rows="2" maxlength="600" placeholder="هر نکته‌ی دیگری که به تشخیص کمک می‌کند..."></textarea></label>' +
        '<div class="ai-q__foot"><span class="ai-round">مرحله‌ی ' + fa(meta.round || 1) + ' از ' +
        fa(meta.max_rounds || MAX_ROUNDS) + '</span>' +
        '<button class="btn btn--primary ai-q__send" type="submit">ارسال پاسخ‌ها</button></div></form>';
    }

    if (d.stage === 'result') {
      if (d.recommendations && d.recommendations.length) {
        h += '<div class="ai-recs"><b class="ai-block__title">قطعه‌های پیشنهادی از فروشگاه</b><div class="ai-recs__grid">';
        d.recommendations.forEach(function (r) {
          var p = CATALOG[r.product_id];
          if (!p) return;
          h += '<article class="ai-rec">' +
            '<span class="ai-rec__img"><img src="assets/img/products/' + esc(r.product_id) + '.png" alt="' + esc(p.name) + '" loading="lazy"></span>' +
            '<div class="ai-rec__body">' +
              '<span class="ai-rec__cat">' + esc(String(p.cat || '').replace('قطعات ', '')) + '</span>' +
              '<h4 class="ai-rec__name">' + esc(p.name) + '</h4>' +
              (r.reason ? '<p class="ai-rec__why">' + esc(r.reason) + '</p>' : '') +
              '<div class="ai-rec__foot"><span class="ai-rec__price"><b>' + toman(p.price) + '</b> تومان</span>' +
              '<span class="ai-rec__conf">اطمینان ٪' + fa(Math.max(0, Math.min(100, Number(r.confidence) || 0))) + '</span></div>' +
              '<a class="ai-rec__go" href="#newest" data-go="' + esc(r.product_id) + '">مشاهده محصول</a>' +
            '</div></article>';
        });
        h += '</div></div>';
      }
      if (d.no_match_note) {
        h += '<div class="ai-nomatch"><p>' + esc(d.no_match_note) + '</p>' +
          '<a class="btn btn--primary" href="#request">ثبت درخواست قطعه</a></div>';
      }
      if (d.next_steps && d.next_steps.length) {
        h += '<div class="ai-steps"><b class="ai-block__title">قدم‌های بعدی</b><ol>' +
          d.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
      }
      h += '<p class="ai-disclaimer">این نتیجه بر اساس توضیحات شماست و جایگزین معاینه‌ی مکانیک نیست.</p>' +
        '<div class="ai-card__end"><button type="button" class="btn btn--line ai-restart">بررسی مشکل دیگر</button></div>';
    }

    el.innerHTML = h;
    wireAnswer(el, d);
    return el;
  }

  function wireAnswer(el, d) {
    var qf = el.querySelector('.ai-q');
    if (qf) {
      qf.querySelectorAll('.ai-q__item').forEach(function (fs) {
        fs.querySelectorAll('.ai-opt').forEach(function (b) {
          b.addEventListener('click', function () {
            var on = b.getAttribute('aria-pressed') !== 'true';
            fs.querySelectorAll('.ai-opt').forEach(function (o) {
              o.setAttribute('aria-pressed', 'false');
              o.classList.remove('is-on');
            });
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.classList.toggle('is-on', on);
          });
        });
      });

      qf.addEventListener('submit', function (e) {
        e.preventDefault();
        if (state.busy || qf.classList.contains('is-sent')) return;
        var lines = [];
        qf.querySelectorAll('.ai-q__item').forEach(function (fs, i) {
          var sel = fs.querySelector('.ai-opt.is-on');
          if (sel && d.questions[i]) lines.push('سؤال: ' + d.questions[i].text + ' — پاسخ: ' + sel.getAttribute('data-val'));
        });
        var more = qf.querySelector('textarea').value.trim();
        if (more) lines.push('توضیح بیشتر: ' + more);
        if (!lines.length) { flash(qf, 'دست‌کم به یک سؤال پاسخ دهید یا توضیحی بنویسید.'); return; }

        var answer = lines.join('\n');
        qf.classList.add('is-sent');
        qf.querySelectorAll('button, textarea').forEach(function (x) { x.disabled = true; });
        state.turns.push({ role: 'user', text: answer });
        appendUser(answer, false);
        ask();
      });
    }

    el.querySelectorAll('[data-go]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var card = document.querySelector('#newest [data-id="' + a.getAttribute('data-go') + '"]');
        if (!card) return;
        e.preventDefault();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('is-pulse');
        void card.offsetWidth;
        card.classList.add('is-pulse');
      });
    });

    var rs = el.querySelector('.ai-restart');
    if (rs) rs.addEventListener('click', restart);
  }

  function renderError(msg) {
    var el = document.createElement('div');
    el.className = 'ai-card ai-card--error';
    el.innerHTML = '<p role="alert">' + esc(msg) + '</p>' +
      '<div class="ai-card__end"><button type="button" class="btn btn--primary ai-retry">تلاش دوباره</button>' +
      '<button type="button" class="btn btn--line ai-restart">شروع از نو</button></div>';
    el.querySelector('.ai-retry').addEventListener('click', function () {
      if (state.busy) return;
      el.remove();
      ask();
    });
    el.querySelector('.ai-restart').addEventListener('click', restart);
    return el;
  }

  function restart() {
    state.turns = [];
    state.vehicle = null;
    thread.innerHTML = '';
    thread.hidden = true;
    form.hidden = false;
    root.querySelectorAll('[data-symptom].is-used').forEach(function (b) { b.classList.remove('is-used'); });
    textEl.value = '';
    updateCount();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { textEl.focus({ preventScroll: true }); }, 400);
  }

  function flash(holder, msg) {
    var n = holder.querySelector('.ai-err');
    if (!n) {
      n = document.createElement('p');
      n.className = 'ai-err';
      n.setAttribute('role', 'alert');
      holder.appendChild(n);
    }
    n.textContent = msg;
    clearTimeout(n._t);
    n._t = setTimeout(function () { n.textContent = ''; }, 4500);
  }

  function reveal(node) {
    var r = node.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- wake the free-tier API before the visitor needs it ---------- */
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    try { fetch(API + '/health').catch(function () {}); } catch (e) { /* offline */ }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { warm(); obs.disconnect(); }
    }, { rootMargin: '900px 0px' }).observe(root);
  } else {
    warm();
  }
  textEl.addEventListener('focus', warm);

  /* ---------- floating launcher ---------- */
  if (launcher) {
    var hero = document.getElementById('hero');
    var inView = false;
    var sync = function () {
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.6 : 400);
      launcher.classList.toggle('is-on', past && !inView);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; sync(); }, { threshold: 0.12 }).observe(root);
    }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
    launcher.addEventListener('click', function (e) {
      e.preventDefault();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { if (!form.hidden) textEl.focus({ preventScroll: true }); }, 700);
    });
  }

  /* ---------- local test harness: ?ai=...&aicar=...&aiauto=N&aisolo=1 (localhost only) ---------- */
  if (LOCAL) {
    var qs = new URLSearchParams(location.search);
    if (qs.get('aisolo')) {
      var st = document.createElement('style');
      st.textContent = 'body>*:not(#diagnose):not(script){display:none!important}#diagnose{padding-top:30px}';
      document.head.appendChild(st);
    }
    if (qs.get('ai')) {
      if (carEl) carEl.value = qs.get('aicar') || '';
      textEl.value = qs.get('ai');
      updateCount();
      var autoRounds = Number(qs.get('aiauto')) || 0;
      if (autoRounds) {
        new MutationObserver(function () {
          var qf = thread.querySelector('.ai-q:not(.is-sent):not(.is-auto)');
          if (!qf || autoRounds <= 0) return;
          autoRounds--;
          qf.classList.add('is-auto');
          qf.querySelectorAll('.ai-q__item').forEach(function (fs) {
            var b = fs.querySelector('.ai-opt');
            if (b) b.click();
          });
          setTimeout(function () { qf.requestSubmit(); }, 60);
        }).observe(thread, { childList: true, subtree: true });
      }
      setTimeout(function () { form.requestSubmit(); }, 300);
    }
  }
})();
