/* ==========================================================
   روند یدک — دستیار هوشمند عیب‌یابی (ویزارد تک‌صفحه)
   در هر لحظه فقط مرحله‌ی جاری دیده می‌شود: خودرو و مشکل ← پرسش‌ها (یکی‌یکی) ← تشخیص و قطعه.
   هیچ مرحله‌ای به صفحه اضافه نمی‌شود، پس نه صفحه اسکرول می‌خورد و نه پنجره.
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
  var DONT_KNOW = 'نمی‌دانم';
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
  function focusQuiet(el) { if (el && !el.disabled) el.focus({ preventScroll: true }); }

  var ui = {
    stage: byId('aiStage'), setup: byId('aiStart'), view: byId('aiView'), steps: byId('aiSteps'),
    carCard: byId('aiCarCard'), carName: byId('aiCarName'), carMeta: byId('aiCarMeta'),
    answers: byId('aiAnswers'), reset: byId('aiReset'), err: byId('aiErr'),
    make: byId('aiMake'), model: byId('aiModel'), otherWrap: byId('aiOtherWrap'), other: byId('aiOther'),
    year: byId('aiYear'), km: byId('aiKm'), fuel: byId('aiFuel'),
    text: byId('aiText'), count: byId('aiCount'), launcher: byId('aiLauncher')
  };
  if (!ui.stage || !ui.setup || !ui.view || !ui.make || !ui.model || !ui.text) return;

  var state = {
    vehicle: null, turns: [], busy: false, view: 'setup',
    data: null, meta: null, q: 0, picks: [], picking: false
  };

  /* ================= car menus ================= */
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
    else if (ui.make.value === '__other') focusQuiet(ui.other);
  });
  ui.model.addEventListener('change', function () {
    syncOther();
    if (ui.model.value === '__other') focusQuiet(ui.other);
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

  /* ================= step 1: setup ================= */
  function updateCount() { if (ui.count) ui.count.textContent = fa(ui.text.value.length) + ' از ' + fa(1200); }
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
    begin();
  });

  function begin() {
    var v = state.vehicle;
    ui.answers.innerHTML = '';
    ui.carName.textContent = carName(v);
    /* each segment isolated: digits in «مدل ۱۳۹۶» and «۱۰۰ تا ۱۵۰ هزار» must not bidi-merge */
    ui.carMeta.innerHTML = [
      v.year && ('مدل ' + (/^\d+$/.test(v.year) ? fa(v.year) : v.year)),
      v.km,
      v.fuel
    ].filter(Boolean).map(function (s) { return '<bdi>' + esc(s) + '</bdi>'; }).join('<i aria-hidden="true"> • </i>');
    ui.carCard.hidden = false;
    ask();
  }

  /* ================= views ================= */
  function setStep(n) {
    if (!ui.steps) return;
    ui.steps.querySelectorAll('li').forEach(function (li) {
      var s = Number(li.getAttribute('data-step'));
      li.classList.toggle('is-current', s === n);
      li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function showView(cls, html) {
    ui.setup.hidden = true;
    ui.view.className = 'ai-view ' + cls;
    ui.view.innerHTML = html;
    ui.view.hidden = false;
    ui.view.scrollTop = 0;
    ui.view.style.animation = 'none';
    void ui.view.offsetWidth;
    ui.view.style.animation = '';
  }

  /* Keep every view inside its stage, whatever the model's text length: step up the
     compaction level (fit-1..fit-4 in style.css) until nothing overflows. */
  var FIT = ['fit-1', 'fit-2', 'fit-3', 'fit-4'];
  var fitFrame = 0;
  function fitView() {
    var v = ui.view;
    if (v.hidden) return;
    FIT.forEach(function (c) { v.classList.remove(c); });
    for (var i = 0; i < FIT.length && v.scrollHeight > v.clientHeight + 1; i++) v.classList.add(FIT[i]);
  }
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitView);
  }
  if ('MutationObserver' in window) {
    new MutationObserver(scheduleFit).observe(ui.view, { childList: true, subtree: true });
  }
  window.addEventListener('resize', scheduleFit);

  function showSetup() {
    ui.view.hidden = true;
    ui.view.innerHTML = '';
    ui.setup.hidden = false;
    state.view = 'setup';
    setStep(1);
  }

  var URG = { low: ['فوریت کم', 'low'], medium: ['فوریت متوسط', 'medium'], high: ['فوریت بالا', 'high'] };

  function headHtml(d, meta) {
    var u = URG[d.urgency] || URG.medium;
    return '<div class="ai-head"><span class="ai-urg ai-urg--' + u[1] + '">' + u[0] + '</span>' +
      (meta.profile ? '<span class="ai-know">بر پایه‌ی ایرادهای رایج این مدل</span>' : '') +
      '<span class="ai-round">مرحله‌ی ' + fa(meta.round || 1) + ' از ' + fa(meta.max_rounds || MAX_ROUNDS) + '</span></div>' +
      (d.safety_note ? '<p class="ai-safety" role="alert">' + esc(d.safety_note) + '</p>' : '');
  }

  function hypsHtml(list, label) {
    if (!list || !list.length) return '';
    var top = list.slice(0, 3);
    var anyKnown = top.some(function (x) { return x.known; });
    return '<div class="ai-hyps"><span class="ai-hyps__label">' + label +
      (anyKnown ? '<em class="ai-hyps__legend"><i class="ai-hyp__known" aria-hidden="true"></i>رایج در این مدل</em>' : '') +
      '</span>' + top.map(function (x) {
        var p = clamp(x.likelihood);
        return '<div class="ai-hyp">' +
          '<button type="button" class="ai-hyp__btn" aria-expanded="false"' + (x.reason ? '' : ' disabled') + '>' +
            '<span class="ai-hyp__cause">' +
              (x.known ? '<i class="ai-hyp__known" role="img" aria-label="رایج در این مدل"></i>' : '') + esc(x.cause) +
            '</span>' +
            '<span class="ai-hyp__bar" aria-hidden="true"><i style="width:' + Math.max(3, p) + '%"></i></span>' +
            '<span class="ai-hyp__pct">٪' + fa(p) + '</span>' +
          '</button>' +
          (x.reason ? '<p class="ai-hyp__why">' + esc(x.reason) + '</p>' : '') +
        '</div>';
      }).join('') + '</div>';
  }

  function closePopovers(except) {
    root.querySelectorAll('.ai-hyp.is-open').forEach(function (o) {
      if (o === except) return;
      o.classList.remove('is-open');
      var b = o.querySelector('.ai-hyp__btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    root.querySelectorAll('.ai-more[open]').forEach(function (d) {
      if (!except || !d.contains(except)) d.open = false;
    });
  }

  function wireHyps() {
    ui.view.querySelectorAll('.ai-hyp__btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var item = b.parentNode;
        var open = !item.classList.contains('is-open');
        closePopovers(item);
        item.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest || (!e.target.closest('.ai-hyp') && !e.target.closest('.ai-more'))) closePopovers(null);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePopovers(null); });

  /* ================= talking to the API ================= */
  function ask() {
    state.busy = true;
    state.view = 'thinking';
    setStep(2);
    showView('ai-think',
      '<span class="ai-think__orb" aria-hidden="true"></span>' +
      '<b>در حال تحلیل…</b>' +
      '<p id="aiWait">علائم ' + esc(carName(state.vehicle)) + ' و احتمال‌ها بررسی می‌شود.</p>');

    var slow = setTimeout(function () {
      var w = byId('aiWait');
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
      var d = res.j.data;
      var meta = res.j.meta || {};
      state.turns.push({ role: 'assistant', data: d });
      state.busy = false;
      if (d.stage === 'result') showResult(d, meta);
      else showQuestions(d, meta);
    }).catch(function (err) {
      state.busy = false;
      var text = err && err.name === 'AbortError'
        ? 'پاسخ دستیار بیش از حد طول کشید. دوباره تلاش کنید.'
        : (err && /[؀-ۿ]/.test(err.message || '')
          ? err.message
          : 'اتصال به دستیار برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.');
      showError(text);
    }).then(function () {
      clearTimeout(slow);
      clearTimeout(hard);
    });
  }

  /* ================= step 2: questions, one at a time ================= */
  function showQuestions(d, meta) {
    state.view = 'questions';
    state.data = d;
    state.meta = meta;
    state.q = 0;
    state.picks = [];
    state.picking = false;
    setStep(2);
    showView('ai-qs',
      headHtml(d, meta) +
      (d.summary ? '<p class="ai-summary">' + esc(d.summary) + '</p>' : '') +
      hypsHtml(d.hypotheses, 'احتمالات فعلی') +
      '<div class="ai-ask" id="aiAsk"></div>');
    wireHyps();
    renderAsk(false);
  }

  function renderAsk(animate) {
    var box = byId('aiAsk');
    var qs = (state.data && state.data.questions) || [];
    var i = state.q;
    var q = qs[i];
    if (!box || !q) return;
    state.picking = false;
    var last = i === qs.length - 1;
    var picked = state.picks[i] || '';
    var typed = picked && picked !== DONT_KNOW && (q.options || []).indexOf(picked) === -1 ? picked : '';

    box.innerHTML =
      '<div class="ai-ask__top"><span class="ai-ask__count">سؤال ' + fa(i + 1) + ' از ' + fa(qs.length) + '</span>' +
        '<span class="ai-ask__dots" aria-hidden="true">' + qs.map(function (_, k) {
          return '<i class="' + (k < i ? 'is-done' : (k === i ? 'is-on' : '')) + '"></i>';
        }).join('') + '</span></div>' +
      '<div class="ai-ask__body' + (animate && !reduce.matches ? ' is-swap' : '') + '">' +
        '<p class="ai-ask__text" id="aiAskText">' + esc(q.text) + '</p>' +
        '<div class="ai-ask__opts" role="group" aria-labelledby="aiAskText">' + (q.options || []).map(function (o) {
          return '<button type="button" class="ai-opt' + (picked === o ? ' is-on' : '') + '" data-val="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') + '</div>' +
        '<div class="ai-ask__row">' +
          '<input type="text" id="aiFree" maxlength="200" autocomplete="off" placeholder="یا پاسخ را بنویسید…" aria-label="پاسخ دلخواه" value="' + esc(typed) + '">' +
          '<button type="button" class="btn btn--primary btn--sm ai-ask__next">' + (last ? 'ارسال پاسخ‌ها' : 'بعدی') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ai-ask__foot">' +
        (i > 0 ? '<button type="button" class="ai-link ai-ask__back">سؤال قبلی</button>' : '') +
        '<button type="button" class="ai-link ai-ask__skip">' + DONT_KNOW + '</button>' +
      '</div>';

    var free = byId('aiFree');
    var next = box.querySelector('.ai-ask__next');
    box.querySelectorAll('.ai-opt').forEach(function (b) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-val'), b); });
    });
    next.addEventListener('click', function () {
      var val = free.value.trim() || state.picks[state.q] || '';
      if (!val) {
        free.classList.add('is-need');
        focusQuiet(free);
        setTimeout(function () { free.classList.remove('is-need'); }, 900);
        return;
      }
      choose(val, null);
    });
    free.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); next.click(); }
    });
    box.querySelector('.ai-ask__skip').addEventListener('click', function () { choose(DONT_KNOW, null); });
    var back = box.querySelector('.ai-ask__back');
    if (back) back.addEventListener('click', function () {
      if (state.picking || state.busy) return;
      state.q = Math.max(0, state.q - 1);
      renderAsk(true);
    });
    if (animate) focusQuiet(box.querySelector('.ai-opt') || free);
  }

  function choose(val, btn) {
    if (state.picking || state.busy || state.view !== 'questions') return;
    state.picking = true;
    state.picks[state.q] = val;
    if (btn) {
      btn.parentNode.querySelectorAll('.ai-opt').forEach(function (o) { o.classList.remove('is-on'); });
      btn.classList.add('is-on');
    }
    var qs = state.data.questions || [];
    var advance = function () {
      if (state.q < qs.length - 1) {
        state.q++;
        renderAsk(true);
      } else {
        sendRound();
      }
    };
    if (btn && !reduce.matches) setTimeout(advance, 180);
    else advance();
  }

  function sendRound() {
    var qs = (state.data && state.data.questions) || [];
    var full = [];
    var shown = [];
    qs.forEach(function (q, k) {
      var a = state.picks[k];
      if (!a) return;
      full.push('سؤال: ' + q.text + ' — پاسخ: ' + a);
      if (a !== DONT_KNOW) shown.push(a);
    });
    if (!full.length) { state.picking = false; return; }
    state.turns.push({ role: 'user', text: full.join('\n') });
    shown.forEach(addAnswer);
    if (window.__aiAuto) window.__aiAuto--;
    ask();
  }

  function addAnswer(a) {
    if (!ui.answers) return;
    var li = document.createElement('li');
    li.innerHTML = '<bdi>' + esc(a) + '</bdi>';
    li.title = a;
    ui.answers.appendChild(li);
    while (ui.answers.children.length > 4) ui.answers.removeChild(ui.answers.firstChild);
  }

  /* ================= step 3: result ================= */
  function showResult(d, meta) {
    state.view = 'result';
    setStep(3);
    var parts = (d.recommendations || []).filter(function (r) { return CATALOG[r.product_id]; }).slice(0, 3);
    var h = headHtml(d, meta);
    if (d.diagnosis) h += '<div class="ai-diag"><b>تشخیص محتمل</b><p>' + esc(d.diagnosis) + '</p></div>';
    h += hypsHtml(d.hypotheses, 'علت‌های بررسی‌شده');
    if (parts.length) {
      h += '<div class="ai-parts ai-parts--' + parts.length + '">' + parts.map(function (r) {
        var p = CATALOG[r.product_id];
        return '<article class="ai-part">' +
          '<span class="ai-part__img"><img src="assets/img/products/' + esc(r.product_id) + '.png" alt="" loading="lazy"></span>' +
          '<div class="ai-part__body">' +
            '<b class="ai-part__name">' + esc(p.name) + '</b>' +
            (r.reason ? '<span class="ai-part__why">' + esc(r.reason) + '</span>' : '') +
            '<span class="ai-part__row"><span class="ai-part__price">' + toman(p.price) + ' <small>تومان</small></span>' +
            '<span class="ai-part__conf">اطمینان ٪' + fa(clamp(r.confidence)) + '</span></span>' +
            '<a class="ai-part__go" href="#newest" data-go="' + esc(r.product_id) + '">مشاهده محصول</a>' +
          '</div></article>';
      }).join('') + '</div>';
    }
    if (d.no_match_note) {
      h += '<div class="ai-nomatch"><p>' + esc(d.no_match_note) + '</p>' +
        '<a class="btn btn--primary btn--sm" href="#request">درخواست قطعه</a></div>';
    }
    h += '<div class="ai-res__foot">' +
      (d.next_steps && d.next_steps.length
        ? '<details class="ai-more"><summary>قدم‌های بعدی</summary><div class="ai-more__pop"><ol>' +
          d.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div></details>'
        : '') +
      '<button type="button" class="btn btn--line btn--sm ai-again">بررسی مشکل دیگر</button>' +
      '<span class="ai-disc">جایگزین معاینه‌ی مکانیک نیست</span></div>';

    showView('ai-res', h);
    wireHyps();
    ui.view.querySelectorAll('[data-go]').forEach(function (a) {
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
    ui.view.querySelector('.ai-again').addEventListener('click', restart);
  }

  function showError(msg) {
    state.view = 'error';
    showView('ai-error',
      '<span class="ai-error__icon" aria-hidden="true">!</span>' +
      '<p role="alert">' + esc(msg) + '</p>' +
      '<div class="ai-error__actions">' +
        '<button type="button" class="btn btn--primary btn--sm ai-retry">تلاش دوباره</button>' +
        '<button type="button" class="btn btn--line btn--sm ai-again">شروع از نو</button>' +
      '</div>');
    ui.view.querySelector('.ai-retry').addEventListener('click', function () { if (!state.busy) ask(); });
    ui.view.querySelector('.ai-again').addEventListener('click', restart);
  }

  function restart() {
    if (state.busy) return;
    state.vehicle = null;
    state.turns = [];
    state.data = null;
    state.meta = null;
    state.q = 0;
    state.picks = [];
    state.picking = false;
    ui.carCard.hidden = true;
    ui.answers.innerHTML = '';
    ui.text.value = '';
    updateCount();
    root.querySelectorAll('[data-symptom].is-used').forEach(function (b) { b.classList.remove('is-used'); });
    showSetup();
    setTimeout(function () { focusQuiet(ui.text); }, 60);
  }
  if (ui.reset) ui.reset.addEventListener('click', restart);

  /* ================= wake the free-tier API early ================= */
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
  /* while the assistant fills the screen, floating buttons (back-to-top) must not cover it */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle('ai-in-view', entries[0].intersectionRatio >= 0.5);
    }, { threshold: [0, 0.5, 1] }).observe(root);
  }
  ui.make.addEventListener('focus', warm);
  ui.text.addEventListener('focus', warm);

  /* ================= entry points: header button, floating launcher ================= */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href="#diagnose"]') : null;
    if (!a) return;
    warm();
    setTimeout(function () {
      if (state.view === 'setup') focusQuiet(ui.make.value ? ui.text : ui.make);
      else if (state.view === 'questions') focusQuiet(ui.view.querySelector('.ai-opt') || byId('aiFree'));
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
      }, { threshold: 0.25 }).observe(root);
    }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  /* ================= local test harness (localhost only) =================
     ?aisolo=1 &aimake=peugeot &aimodel=peugeot-206 &aiyear=1396 &aikm=... &ai=متن مشکل &aiauto=N */
  if (LOCAL) {
    var qs = new URLSearchParams(location.search);
    if (qs.get('aisolo')) {
      var st = document.createElement('style');
      st.textContent = 'body>*:not(#diagnose):not(script){display:none!important}';
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
      window.__aiAuto = Number(qs.get('aiauto')) || 0;
      if (window.__aiAuto) {
        setInterval(function () {
          if (state.view !== 'questions' || state.busy || state.picking || !(window.__aiAuto > 0)) return;
          var b = ui.view.querySelector('.ai-ask__opts .ai-opt');
          if (b) b.click();
          else { var s = ui.view.querySelector('.ai-ask__skip'); if (s) s.click(); }
        }, 450);
      }
      setTimeout(function () { submitForm(ui.setup); }, 300);
    }
  }
})();
