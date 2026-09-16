/* ==========================================================
   روند یدک — رفتار صفحه اصلی
   ========================================================== */
(function () {
  'use strict';

  var FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  /** 320000 -> "۳۲۰,۰۰۰" */
  function toman(n) {
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s.replace(/\d/g, function (d) { return FA[+d]; });
  }
  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return FA[+d]; });
  }

  /* ---------------------------------------------------------
     کاتالوگ محصولات
     --------------------------------------------------------- */
  /* از assets/data/catalog.js — همان فایلی که سرور دستیار هوشمند می‌خواند */
  var P = window.RY_CATALOG || {};

  function img(id) { return 'assets/img/products/' + id + '.png'; }

  function priceHtml(p) {
    var html = '<span class="pcard__price">';
    if (p.old) html += '<del class="pcard__old">' + toman(p.old) + '</del>';
    html += '<b>' + toman(p.price) + '</b><i>تومان</i></span>';
    return html;
  }

  function cardHtml(id, cls) {
    var p = P[id];
    return '' +
      '<article class="' + (cls || 'pcard') + '" data-id="' + id + '">' +
        '<a class="pcard__media" href="#" aria-label="' + p.name + '">' +
          (p.off ? '<span class="badge">٪' + fa(p.off) + '-</span>' : '') +
          '<img src="' + img(id) + '" alt="' + p.name + '" loading="lazy">' +
          '<span class="pcard__quick">مشاهده سریع</span>' +
        '</a>' +
        '<div class="pcard__body">' +
          '<span class="pcard__cat">' + p.cat.replace('قطعات ', '') + '</span>' +
          '<h3 class="pcard__title"><a href="#">' + p.name + '</a></h3>' +
          '<div class="pcard__foot">' +
            priceHtml(p) +
            '<button class="pcard__add" type="button" aria-label="افزودن ' + p.name + ' به سبد خرید">' +
              '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function fill(sel, ids, cls) {
    var el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = ids.map(function (id) { return cardHtml(id, cls); }).join('');
  }

  /* جدیدترین محصولات — سطر اول ۱۰ تا ۶، سطر دوم ۵ تا ۱ */
  fill('#newest', ['p10', 'p9', 'p8', 'p7', 'p6', 'p5', 'p4', 'p3', 'p2', 'p1']);

  /* پیشنهادات ویژه — دو ستون */
  (function () {
    var el = document.querySelector('#special');
    if (!el) return;
    var ids = ['p10', 'p9', 'p8', 'p7', 'p6', 'p5'];
    el.innerHTML = ids.map(function (id) {
      var p = P[id];
      return '' +
        '<a class="sitem" href="#">' +
          '<span class="sitem__thumb"><img src="' + img(id) + '" alt="' + p.name + '" loading="lazy"></span>' +
          '<span class="sitem__body">' +
            '<span class="sitem__title">' + p.name + '</span>' +
            '<span class="sitem__cat">' + p.cat.replace('قطعات ', '') + '</span>' +
            '<span class="sitem__price">' + toman(p.price) + ' تومان</span>' +
          '</span>' +
        '</a>';
    }).join('');
  })();

  /* ---------------------------------------------------------
     جستجوی قطعه — نوار تیره
     --------------------------------------------------------- */
  (function () {
    var input = document.getElementById('finderInput');
    var panel = document.getElementById('finderPanel');
    var catSel = document.getElementById('finderCat');
    if (!input || !panel) return;

    var form = input.closest('form');
    var ids = Object.keys(P);
    var active = -1;
    var shown = [];

    /* ارقام فارسی/عربی و «ی/ک» عربی را یکدست می‌کند تا جستجو هر دو املا را بگیرد */
    function norm(str) {
      return String(str)
        .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
        .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
        .replace(/‌/g, ' ')
        .replace(/\s+/g, ' ')
        .trim().toLowerCase();
    }

    function haystack(id) {
      var p = P[id];
      return norm([p.name, p.part, p.cat, p.tags, p.sku, id].join(' '));
    }

    function search(q, cat) {
      var nq = norm(q);
      if (!nq) return [];
      var terms = nq.split(' ');
      return ids.filter(function (id) {
        if (cat && P[id].cat !== cat) return false;
        var hay = haystack(id);
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      }).sort(function (a, b) {
        /* تطابق در نام قطعه بالاتر از تطابق در برچسب‌ها می‌نشیند */
        var sa = norm(P[a].part).indexOf(terms[0]) === 0 ? 0 : 1;
        var sb = norm(P[b].part).indexOf(terms[0]) === 0 ? 0 : 1;
        return sa - sb;
      });
    }

    function mark(text, q) {
      var nq = norm(q).split(' ')[0];
      if (!nq) return text;
      var i = norm(text).indexOf(nq);
      if (i === -1) return text;
      return text.slice(0, i) + '<b>' + text.slice(i, i + nq.length) + '</b>' + text.slice(i + nq.length);
    }

    function close() {
      panel.hidden = true;
      panel.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
      shown = [];
    }

    function render(q) {
      var hits = search(q, catSel ? catSel.value : '');
      shown = hits;
      active = -1;
      if (!norm(q)) return close();

      if (!hits.length) {
        panel.innerHTML = '<div class="fres fres--empty">قطعه‌ای با این مشخصات پیدا نشد. ' +
                          'می‌توانید درخواست قطعه ثبت کنید.</div>';
      } else {
        panel.innerHTML = hits.map(function (id, i) {
          var p = P[id];
          return '' +
            '<a class="fres" id="fres-' + i + '" role="option" aria-selected="false" href="#">' +
              '<span class="fres__thumb"><img src="' + img(id) + '" alt="" loading="lazy"></span>' +
              '<span class="fres__body">' +
                '<span class="fres__name">' + mark(p.name, q) + '</span>' +
                '<span class="fres__meta">' + p.cat + ' • شماره فنی ' + p.sku + '</span>' +
              '</span>' +
              '<span class="fres__price">' + toman(p.price) + ' تومان</span>' +
            '</a>';
        }).join('');
      }
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function highlight(i) {
      var opts = panel.querySelectorAll('.fres:not(.fres--empty)');
      if (!opts.length) return;
      if (active > -1 && opts[active]) {
        opts[active].classList.remove('is-active');
        opts[active].setAttribute('aria-selected', 'false');
      }
      active = (i + opts.length) % opts.length;
      opts[active].classList.add('is-active');
      opts[active].setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value) render(input.value); });
    if (catSel) catSel.addEventListener('change', function () { render(input.value); });

    input.addEventListener('keydown', function (e) {
      if (panel.hidden) {
        if (e.key === 'ArrowDown' && input.value) { render(input.value); e.preventDefault(); }
        return;
      }
      if (e.key === 'ArrowDown') { highlight(active + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { highlight(active - 1); e.preventDefault(); }
      else if (e.key === 'Escape') { close(); }
      else if (e.key === 'Enter' && active > -1) {
        panel.querySelectorAll('.fres')[active].click();
        e.preventDefault();
      }
    });

    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); render(input.value); });

    document.addEventListener('click', function (e) {
      if (!panel.hidden && !e.target.closest('.finder__form')) close();
    });

    /* چیپ‌های جستجوی پرطرفدار */
    document.querySelectorAll('.finder__hot a[data-q]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        input.value = a.getAttribute('data-q');
        input.focus();
        render(input.value);
      });
    });

    /* ?q=... صفحه را با نتیجه باز می‌کند — برای لینک‌دهی و تست */
    var pre = new URLSearchParams(location.search).get('q');
    if (pre) { input.value = pre; render(pre); }
  })();

  /* ---------------------------------------------------------
     دکمه بازگشت به بالا
     --------------------------------------------------------- */
  (function () {
    var btn = document.getElementById('totop');
    if (!btn) return;
    function onScroll() {
      btn.classList.toggle('is-on', window.scrollY > 420);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();


  /* ---------------------------------------------------------
     ظهور تدریجی بخش‌ها هنگام اسکرول + سایه‌ی هدر چسبان
     --------------------------------------------------------- */
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var targets = document.querySelectorAll(
      '.promos__grid, .cats, .sechead, .pgrid, .finder__inner, .special__inner, .cta, .bgrid, .features__inner'
    );
    if (!reduce.matches && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
      targets.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
    }

    var bar = document.getElementById('topbar');
    if (bar) {
      var hero = document.querySelector('.hero');
      var onScroll = function () {
        bar.classList.toggle('is-top', !!hero && window.scrollY <= 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('load', onScroll);
      onScroll();
      /* an anchor jump can move the page before the first scroll event fires */
      requestAnimationFrame(onScroll);
    }
  })();

  /* ---------------------------------------------------------
     منوی موبایل
     --------------------------------------------------------- */
  (function () {
    var burger = document.querySelector('.burger');
    var menu = document.querySelector('.menu');
    if (!burger || !menu) return;
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      var bar = document.getElementById('topbar');
      if (bar) bar.classList.toggle('is-open', open);
    });
  })();
  /* ---------------------------------------------------------
     اسکرول دقیق لینک‌های داخلی، با احتساب ارتفاع هدر ثابت
     (دکمه‌ی هیرو، منو، دکمه‌ی دستیار). data-scroll-gap فاصله‌ی اضافه.
     --------------------------------------------------------- */
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();

      var burger = document.querySelector('.burger');
      if (document.querySelector('.menu.is-open') && burger) burger.click();

      var bar = document.getElementById('topbar');
      var offset = (bar ? bar.offsetHeight : 0) + (Number(a.getAttribute('data-scroll-gap')) || 0);
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: reduce.matches ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  })();
  /* ---------------------------------------------------------
     ارتفاع واقعی هدر (روی موبایل ردیف منو هم دارد) → --head-h
     هیرو و دستیار دقیقاً زیر هدر می‌نشینند.
     --------------------------------------------------------- */
  (function () {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    var set = function () {
      document.documentElement.style.setProperty('--head-h', bar.offsetHeight + 'px');
    };
    set();
    window.addEventListener('resize', set);
    window.addEventListener('load', set);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
  })();
  /* ---------------------------------------------------------
     دستیار عیب‌یابی روی موبایل تاشده است: با دکمه‌ی بزرگ باز می‌شود،
     و هر لینکی که به #diagnose می‌رود هم آن را باز می‌کند.
     --------------------------------------------------------- */
  (function () {
    var sec = document.getElementById('diagnose');
    var toggle = document.getElementById('aiToggle');
    if (!sec || !toggle) return;
    function setOpen(state) {
      sec.classList.toggle('is-open', state);
      toggle.setAttribute('aria-expanded', String(state));
      /* the assistant measures itself to fit one screen — nudge it once it becomes visible */
      if (state) window.dispatchEvent(new Event('resize'));
    }
    toggle.addEventListener('click', function () {
      var open = !sec.classList.contains('is-open');
      setOpen(open);
      /* the wizard is built to fill exactly one screen, so park it right under the header */
      if (open) {
        requestAnimationFrame(function () {
          var shell = document.getElementById('aiShell');
          var bar = document.getElementById('topbar');
          if (!shell) return;
          var top = shell.getBoundingClientRect().top + window.pageYOffset - (bar ? bar.offsetHeight : 0) - 8;
          var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: top, behavior: still ? 'auto' : 'smooth' });
        });
      }
    });
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('a[href="#diagnose"]') : null;
      if (el) setOpen(true);
    }, true);
    if (location.hash === '#diagnose') setOpen(true);
  })();
})();
