/* ==========================================================
   روند یدک — دستیار هوشمند عیب‌یابی (پنجره‌ی گفت‌وگو)
   انتخاب برند و مدل از منو ← شرح مشکل ← احتمالات و پرسش‌های دقیق ← پیشنهاد قطعه.
   گفت‌وگو داخل پنجره‌ای با ارتفاع ثابت اسکرول می‌شود؛ خود صفحه جابه‌جا نمی‌شود.
   مدل زبانی فقط روی سرور صدا زده می‌شود و همه‌ی متن‌های مدل پیش از نمایش escape می‌شوند.
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
  var MAKES = (window.RY_CARS && window.RY_CARS.makes) || [];
  var MAX_ROUNDS = 5;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }
  function toman(n) { return fa(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(Number(n) || 0))); }
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function byId(id) { return document.getElementById(id); }
  function submitForm(f) {
    if (f.requestSubmit) f.requestSubmit();
    else f.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  var ui = {
    body: byId('aiBody'), setup: byId('aiStart'), log: byId('aiThread'),
    composer: byId('aiComposer'), reply: byId('aiReply'), hint: byId('aiHint'), err: byId('aiErr'),
    status: byId('aiStatus'), badge: byId('aiCarBadge'), reset: byId('aiReset'),
    make: byId('aiMake'), model: byId('aiModel'), otherWrap: byId('aiOtherWrap'), other: byId('aiOther'),
    year: byId('aiYear'), km: byId('aiKm'), fuel: byId('aiFuel'),
    text: byId('aiText'), count: byId('aiCount'), launcher: byId('aiLauncher')
  };
  if (!ui.body || !ui.setup || !ui.log || !ui.composer || !ui.reply || !ui.make || !ui.model || !ui.text) return;
  var sendBtn = ui.composer.querySelector('.aiw__send');

  var state = { vehicle: null, turns: [], busy: false, pending: null, pendingEl: null };

  /* ---------- car menus ---------- */
  var GROUPS = [['domestic', 'ساخت و مونتاژ ایران'], ['imported', 'وارداتی']];

  function findMake(id) {
    for (var i = 0; i < MAKES.length; i++) if (MAKES[i].id === id) return MAKES[i];
    return null;
  }

  function fillMakes() {
    var h = '<option value="">انتخاب برند</option>';
    GROUPS.forEach(function (g) {
      var list = MAKES.filter(function (m) { return (m.group || 'domestic') === g[0]; });
      if (!list.length) return;
      h += '<optgroup label="' + esc(g[1]) + '">' + list.map(function (m) {
        return '<option value="' + esc(m.id) + '">' + esc(m.fa) + '</option>';
      }).join('') + '</optgroup>';
    });
    h += '<option value="__other">برند دیگر</option>';
    ui.make.innerHTML = h;
  }

  function fillModels() {
    var id = ui.make.value;
    var mk = findMake(id);
    if (id === '__other') {
      ui.model.innerHTML = '<option value="__other">نام خودرو را بنویسید</option>';
      ui.model.disabled = true;
    } else if (!mk) {
      ui.model.innerHTML = '<option value="">اول برند را انتخاب کنید</option>';
      ui.model.disabled = true;
    } else {
      ui.model.innerHTML = '<option value="">انتخاب مدل</option>' + (mk.models || []).map(function (m) {
        return '<option value="' + esc(m.id) + '">' + esc(m.fa) + '</option>';
      }).join('') + '<option value="__other">مدل دیگر</option>';
      ui.model.disabled = false;
    }
    syncOther();
  }

  function syncOther() {
    var on = ui.make.value === '__other' || ui.model.value === '__other';
    if (ui.otherWrap) ui.otherWrap.hidden = !on;
  }

  function fillYears() {
    if (!ui.year) return;
    var h = '<option value="">نمی‌دانم</option>';
    for (var y = 1405; y >= 1370; y--) h += '<option value="' + y + '">' + fa(y) + '</option>';
    h += '<option value="قبل از ۱۳۷۰">قدیمی‌تر</option>';
    ui.year.innerHTML = h;
  }

  fillMakes();
  fillYears();
  fillModels();

  ui.make.addEventListener('change', function () {
    fillModels();
    if (!ui.model.disabled) ui.model.focus();
    else if (ui.make.value === '__other' && ui.other) ui.other.focus();
  });
  ui.model.addEventListener('change', function () {
    syncOther();
    if (ui.model.value === '__other' && ui.other) ui.other.focus();
  });

  function readVehicle() {
    var mk = findMake(ui.make.value);
    var custom = ui.make.value === '__other' || ui.model.value === '__other';
    var opt = ui.model.options[ui.model.selectedIndex];
    return {
      make_id: mk ? mk.id : '',
      make: mk ? mk.fa : '',
      model_id: custom ? '' : ui.model.value,
      model: custom ? (ui.other ? ui.other.value.trim() : '') : (opt ? opt.textContent : ''),
      year: ui.year ? ui.year.value : '',
      km: ui.km ? ui.km.value : '',
      fuel: ui.fuel ? ui.fuel.value : ''
    };
  }

  function carName(v) {
    if (!v) return '';
    if (v.make && v.model && v.model.indexOf(v.make) === 0) return v.model;
    return [v.make, v.model].filter(Boolean).join(' ');
  }

  /* ---------- setup form ---------- */
  function updateCount() { if (ui.count) ui.count.textContent = fa(ui.text.value.length) + ' / ' + fa(1200); }
  ui.text.addEventListener('input', updateCount);
  updateCount();

  root.querySelectorAll('[data-symptom]').forEach(function (b) {
    b.addEventListener('click', function () {
      var add = b.getAttribute('data-symptom');
      var v = ui.text.value.trim();
      if (v.indexOf(add) === -1) ui.text.value = v ? v + '، ' + add : add;
      b.classList.add('is-used');
      ui.text.focus();
      updateCount();
    });
  });

  function setupError(field, msg) {
    if (ui.err) {
      ui.err.textContent = msg;
      clearTimeout(ui.err._t);
      ui.err._t = setTimeout(function () { ui.err.textContent = ''; }, 4500);
    }
    if (field) field.focus();
  }

  ui.setup.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.busy) return;
    var v = readVehicle();
    if (!ui.make.value) return setupError(ui.make, 'برند خودرو را انتخاب کنید.');
    if (ui.make.value !== '__other' && !ui.model.value) return setupError(ui.model, 'مدل خودرو را انتخاب کنید.');
    if (!v.model_id && v.model.length < 2) return setupError(ui.other, 'نام خودرو را بنویسید.');
    var text = ui.text.value.trim();
    if (text.length < 8) return setupError(ui.text, 'لطفاً مشکل را کمی کامل‌تر شرح دهید.');
    state.vehicle = v;
    state.turns = [{ role: 'user', text: text }];
    begin(text);
  });

  function begin(text) {
    ui.setup.hidden = true;
    ui.log.innerHTML = '';
    ui.log.hidden = false;
    ui.composer.hidden = false;
    lock(true);
    ui.reset.hidden = false;
    var v = state.vehicle;
    /* «مدل» keeps the year from bidi-merging with digits in the model name (پراید ۱۳۱ • ۱۳۹۴) */
    var bits = [carName(v), v.year && ('مدل ' + (/^\d+$/.test(v.year) ? fa(v.year) : v.year))].filter(Boolean);
    ui.badge.textContent = bits.join(' • ');
    ui.badge.hidden = !bits.length;
    ui.body.scrollTop = 0;
    addUser(text);
    ask();
  }

  /* ---------- conversation ---------- */
  function follow(node, align) {
    var top = align === 'start' ? node.offsetTop - 12 : ui.body.scrollHeight;
    ui.body.scrollTo({ top: Math.max(0, top), behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function addUser(text) {
    var m = document.createElement('div');
    m.className = 'am am--user';
    m.innerHTML = '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>';
    ui.log.appendChild(m);
    follow(m, 'end');
  }

  function setStatus(text, busy) {
    if (!ui.status) return;
    ui.status.textContent = text;
    ui.status.classList.toggle('is-busy', Boolean(busy));
  }

  function lock(on) {
    ui.reply.disabled = on;
    if (sendBtn) sendBtn.disabled = on;
  }

  function hint(msg) {
    if (!ui.hint) return;
    ui.hint.textContent = msg;
    clearTimeout(ui.hint._t);
    ui.hint._t = setTimeout(function () { ui.hint.textContent = ''; }, 4000);
  }

  function ask() {
    state.busy = true;
    lock(true);
    setStatus('در حال تحلیل…', true);

    var typing = document.createElement('div');
    typing.className = 'am am--bot am--typing';
    typing.innerHTML = '<span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="am__wait">در حال بررسی علائم ' + esc(carName(state.vehicle)) + '…</span>';
    ui.log.appendChild(typing);
    follow(typing, 'end');

    var slow = setTimeout(function () {
      var w = typing.querySelector('.am__wait');
      if (w) w.textContent = 'دستیار در حال آماده شدن است؛ اولین درخواست ممکن است تا یک دقیقه طول بکشد.';
    }, 7000);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var hard = setTimeout(function () { if (ctrl) ctrl.abort(); }, 95000);

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
      var msg = renderBot(res.j.data, res.j.meta || {});
      typing.replaceWith(msg);
      follow(msg, 'start');
      settle(res.j.data, msg);
    }).catch(function (err) {
      var text = err && err.name === 'AbortError'
        ? 'پاسخ دستیار بیش از حد طول کشید. دوباره تلاش کنید.'
        : (err && /[؀-ۿ]/.test(err.message || '')
          ? err.message
          : 'اتصال به دستیار برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.');
      var msg = renderError(text);
      typing.replaceWith(msg);
      follow(msg, 'start');
      setStatus('ارتباط برقرار نشد', false);
    }).then(function () {
      clearTimeout(slow);
      clearTimeout(hard);
      state.busy = false;
    });
  }

  function settle(d, msg) {
    if (d.stage === 'result') {
      state.pending = null;
      state.pendingEl = null;
      ui.composer.hidden = true;
      setStatus('تشخیص آماده است', false);
    } else {
      state.pending = d;
      state.pendingEl = msg;
      ui.composer.hidden = false;
      lock(false);
      ui.reply.placeholder = d.questions && d.questions.length
        ? 'گزینه‌ای را انتخاب کنید یا پاسخ را بنویسید…'
        : 'پاسخ خود را بنویسید…';
      setStatus('منتظر پاسخ شما', false);
    }
  }

  var URG = { low: ['فوریت کم', 'low'], medium: ['فوریت متوسط', 'medium'], high: ['فوریت بالا', 'high'] };

  function renderBot(d, meta) {
    var m = document.createElement('div');
    m.className = 'am am--bot' + (d.stage === 'result' ? ' am--result' : '');
    var u = URG[d.urgency] || URG.medium;
    var h = '<div class="am__meta"><span class="am__urg am__urg--' + u[1] + '">' + u[0] + '</span>' +
      (meta.profile ? '<span class="am__know">بر پایه‌ی ایرادهای رایج این مدل</span>' : '') + '</div>';

    if (d.safety_note) h += '<p class="am__safety" role="alert">' + esc(d.safety_note) + '</p>';
    if (d.stage === 'result' && d.diagnosis) {
      h += '<div class="am__diag"><b>تشخیص محتمل</b><p>' + esc(d.diagnosis) + '</p></div>';
    } else if (d.summary) {
      h += '<p class="am__text">' + esc(d.summary) + '</p>';
    }

    if (d.hypotheses && d.hypotheses.length) {
      h += '<div class="am__hyp"><span class="am__label">' +
        (d.stage === 'result' ? 'علت‌های بررسی‌شده' : 'احتمالات') + '</span>';
      d.hypotheses.forEach(function (x) {
        var p = clamp(x.likelihood);
        h += '<details class="hyp"><summary>' +
          '<span class="hyp__cause">' + esc(x.cause) + (x.known ? '<em class="hyp__known">رایج در این مدل</em>' : '') + '</span>' +
          '<span class="hyp__pct">٪' + fa(p) + '</span>' +
          '<span class="hyp__bar"><i style="width:' + Math.max(3, p) + '%"></i></span>' +
          '</summary>' + (x.reason ? '<p class="hyp__why">' + esc(x.reason) + '</p>' : '') + '</details>';
      });
      h += '</div>';
    }

    if (d.stage !== 'result' && d.questions && d.questions.length) {
      h += '<div class="am__qs">';
      d.questions.forEach(function (q, qi) {
        h += '<div class="q" data-q="' + qi + '"><p class="q__text">' + esc(q.text) + '</p><div class="q__opts">' +
          (q.options || []).map(function (o) {
            return '<button type="button" class="q__opt" aria-pressed="false" data-val="' + esc(o) + '">' + esc(o) + '</button>';
          }).join('') + '</div></div>';
      });
      h += '<span class="am__round">مرحله‌ی ' + fa(meta.round || 1) + ' از ' + fa(meta.max_rounds || MAX_ROUNDS) + '</span></div>';
    }

    if (d.stage === 'result') {
      if (d.recommendations && d.recommendations.length) {
        h += '<div class="am__recs"><span class="am__label">قطعه‌های پیشنهادی</span>';
        d.recommendations.forEach(function (r) {
          var p = CATALOG[r.product_id];
          if (!p) return;
          h += '<article class="rec">' +
            '<span class="rec__img"><img src="assets/img/products/' + esc(r.product_id) + '.png" alt="" loading="lazy"></span>' +
            '<div class="rec__body"><b class="rec__name">' + esc(p.name) + '</b>' +
            (r.reason ? '<span class="rec__why">' + esc(r.reason) + '</span>' : '') +
            '<span class="rec__foot"><span class="rec__price">' + toman(p.price) + ' <small>تومان</small></span>' +
            '<span class="rec__conf">اطمینان ٪' + fa(clamp(r.confidence)) + '</span>' +
            '<a class="rec__go" href="#newest" data-go="' + esc(r.product_id) + '">مشاهده</a></span></div></article>';
        });
        h += '</div>';
      }
      if (d.no_match_note) {
        h += '<div class="am__nomatch"><p>' + esc(d.no_match_note) + '</p>' +
          '<a class="btn btn--primary btn--sm" href="#request">ثبت درخواست قطعه</a></div>';
      }
      if (d.next_steps && d.next_steps.length) {
        h += '<details class="am__steps"><summary>قدم‌های بعدی</summary><ol>' +
          d.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></details>';
      }
      h += '<div class="am__end"><button type="button" class="btn btn--line btn--sm am__restart">بررسی مشکل دیگر</button>' +
        '<span class="am__disc">این نتیجه جایگزین معاینه‌ی مکانیک نیست.</span></div>';
    }

    m.innerHTML = h;
    wire(m);
    return m;
  }

  function wire(m) {
    m.querySelectorAll('.q').forEach(function (qn) {
      qn.querySelectorAll('.q__opt').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          var on = b.getAttribute('aria-pressed') !== 'true';
          qn.querySelectorAll('.q__opt').forEach(function (o) {
            o.setAttribute('aria-pressed', 'false');
            o.classList.remove('is-on');
          });
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('is-on', on);
        });
      });
    });

    m.querySelectorAll('[data-go]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var card = document.querySelector('#newest [data-id="' + a.getAttribute('data-go') + '"]');
        if (!card) return;
        e.preventDefault();
        card.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' });
        card.classList.remove('is-pulse');
        void card.offsetWidth;
        card.classList.add('is-pulse');
      });
    });

    var rs = m.querySelector('.am__restart');
    if (rs) rs.addEventListener('click', restart);
  }

  function renderError(msg) {
    var m = document.createElement('div');
    m.className = 'am am--bot am--error';
    m.innerHTML = '<p role="alert">' + esc(msg) + '</p>' +
      '<div class="am__end"><button type="button" class="btn btn--primary btn--sm am__retry">تلاش دوباره</button>' +
      '<button type="button" class="btn btn--line btn--sm am__restart">شروع از نو</button></div>';
    m.querySelector('.am__retry').addEventListener('click', function () {
      if (state.busy) return;
      m.remove();
      ask();
    });
    m.querySelector('.am__restart').addEventListener('click', restart);
    lock(true);
    return m;
  }

  /* ---------- composer ---------- */
  function grow() {
    ui.reply.style.height = 'auto';
    ui.reply.style.height = Math.min(120, ui.reply.scrollHeight) + 'px';
  }
  ui.reply.addEventListener('input', grow);
  ui.reply.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submitForm(ui.composer);
    }
  });

  ui.composer.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.busy || !state.pending || !state.pendingEl) return;
    var d = state.pending;
    var box = state.pendingEl;
    var full = [];
    var shown = [];
    box.querySelectorAll('.q').forEach(function (qn) {
      var qi = Number(qn.getAttribute('data-q'));
      var sel = qn.querySelector('.q__opt.is-on');
      if (sel && d.questions[qi]) {
        full.push('سؤال: ' + d.questions[qi].text + ' — پاسخ: ' + sel.getAttribute('data-val'));
        shown.push(sel.getAttribute('data-val'));
      }
    });
    var more = ui.reply.value.trim();
    if (more) {
      full.push(full.length ? 'توضیح بیشتر: ' + more : more);
      shown.push(more);
    }
    if (!full.length) { hint('یکی از گزینه‌ها را انتخاب کنید یا پاسخ را بنویسید.'); return; }

    box.classList.add('is-answered');
    box.querySelectorAll('.q__opt').forEach(function (b) { b.disabled = true; });
    ui.reply.value = '';
    grow();
    state.turns.push({ role: 'user', text: full.join('\n') });
    state.pending = null;
    state.pendingEl = null;
    addUser(shown.join(' • '));
    ask();
  });

  /* ---------- reset ---------- */
  function restart() {
    if (state.busy) return;
    state.turns = [];
    state.vehicle = null;
    state.pending = null;
    state.pendingEl = null;
    ui.log.innerHTML = '';
    ui.log.hidden = true;
    ui.composer.hidden = true;
    ui.reset.hidden = true;
    ui.badge.hidden = true;
    ui.setup.hidden = false;
    ui.text.value = '';
    updateCount();
    root.querySelectorAll('[data-symptom].is-used').forEach(function (b) { b.classList.remove('is-used'); });
    setStatus('آماده‌ی کمک', false);
    ui.body.scrollTop = 0;
    setTimeout(function () { ui.text.focus({ preventScroll: true }); }, 60);
  }
  ui.reset.addEventListener('click', restart);

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
  ui.make.addEventListener('focus', warm);
  ui.text.addEventListener('focus', warm);

  /* ---------- entry points: header button, floating launcher ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href="#aiWindow"], a[href="#diagnose"]') : null;
    if (!a) return;
    warm();
    setTimeout(function () {
      var target = !ui.setup.hidden ? (ui.make.value ? ui.text : ui.make) : (!ui.composer.hidden ? ui.reply : null);
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }, reduce.matches ? 60 : 750);
  });

  if (ui.launcher) {
    var hero = document.getElementById('hero');
    var inView = false;
    var sync = function () {
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.6 : 400);
      ui.launcher.classList.toggle('is-on', past && !inView);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.2 }).observe(root);
    }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  /* ---------- local test harness (localhost only) ----------
     ?aisolo=1 &aimake=peugeot &aimodel=peugeot-206 &aiyear=1396 &aikm=... &ai=متن مشکل &aiauto=1 */
  if (LOCAL) {
    var qs = new URLSearchParams(location.search);
    if (qs.get('aisolo')) {
      var st = document.createElement('style');
      st.textContent = 'body>*:not(#diagnose):not(script){display:none!important}#diagnose{padding-top:24px}';
      document.head.appendChild(st);
    }
    if (qs.get('aimake')) {
      ui.make.value = qs.get('aimake');
      fillModels();
      if (qs.get('aimodel')) { ui.model.value = qs.get('aimodel'); syncOther(); }
    }
    if (qs.get('aiyear') && ui.year) ui.year.value = qs.get('aiyear');
    if (qs.get('aikm') && ui.km) ui.km.value = qs.get('aikm');
    if (qs.get('ai')) {
      ui.text.value = qs.get('ai');
      updateCount();
      var auto = Number(qs.get('aiauto')) || 0;
      if (auto) {
        new MutationObserver(function () {
          setTimeout(function () {
            var box = state.pendingEl;
            if (!box || state.busy || auto <= 0 || box.classList.contains('is-auto')) return;
            auto--;
            box.classList.add('is-auto');
            box.querySelectorAll('.q').forEach(function (qn) {
              var b = qn.querySelector('.q__opt');
              if (b) b.click();
            });
            setTimeout(function () { submitForm(ui.composer); }, 80);
          }, 250);
        }).observe(ui.log, { childList: true });
      }
      setTimeout(function () { submitForm(ui.setup); }, 300);
    }
  }
})();
