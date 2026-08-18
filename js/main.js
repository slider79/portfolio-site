/* ============================================================
   PORTFOLIO OS: boot sequence, HUD, audio, navigation.
   Plain script; psp.js is the module and talks to us via
   window.SK (a tiny shared bus).
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* live, not a snapshot: a phone rotated to landscape crosses this boundary */
  var narrow = window.matchMedia('(max-width: 860px)');

  /* shared bus ------------------------------------------------ */
  var SK = window.SK = {
    ready: false,
    _onReady: [],
    onReady: function (fn) { this.ready ? fn() : this._onReady.push(fn); },
    fireReady: function () {
      this.ready = true;
      this._onReady.splice(0).forEach(function (f) { f(); });
    }
  };

  /* ---------------------------------------------------------- */
  /* BOOT SEQUENCE                                              */
  /* ---------------------------------------------------------- */
  var boot = document.getElementById('boot');
  var fillEl = document.getElementById('bootFill');
  var pctEl = document.getElementById('bootPct');

  var pct = 0, targetPct = 0;
  var bootDone = false;

  function setPct(v) {
    pct = v;
    if (fillEl) fillEl.style.right = (100 - v) + '%';
    if (pctEl) pctEl.textContent = String(Math.round(v)).padStart(3, '0');
  }

  /* creep toward 96 while the model streams in; finishBoot waits on the scene */
  function crawl() {
    targetPct = Math.min(96, targetPct + 6);
    if (targetPct < 96) setTimeout(crawl, reduce ? 30 : 90);
    else finishBoot();
  }

  function tickPct() {
    if (bootDone) return;
    setPct(pct + (targetPct - pct) * 0.14);
    requestAnimationFrame(tickPct);
  }

  function finishBoot() {
    // wait for the 3D scene (or bail after 9s so a slow CDN never traps anyone)
    var released = false;
    function release() {
      if (released) return; released = true;
      targetPct = 100; setPct(100);
      setTimeout(function () {
        bootDone = true;
        if (boot) boot.classList.add('is-done');
        document.body.classList.remove('is-booting');
        document.body.classList.add('is-lit');
      }, reduce ? 60 : 420);
    }
    SK.onReady(release);
    setTimeout(release, 9000);
  }

  requestAnimationFrame(tickPct);
  setTimeout(crawl, reduce ? 0 : 200);

  /* ---------------------------------------------------------- */
  /* AUDIO: on by default, remembered per session                 */
  /*                                                              */
  /* Browsers will not let a page make noise before the visitor    */
  /* has interacted with it. Two things follow, and the old code   */
  /* got both wrong:                                              */
  /*                                                              */
  /*  1. `wheel` and `scroll` are NOT user-activation gestures.    */
  /*     This is a scroll-driven site, so the first thing almost   */
  /*     every visitor does is scroll, the old arming used         */
  /*     {once:true} and tore down the pointer/key listeners on    */
  /*     the first wheel event, then called play(), which was      */
  /*     refused and swallowed. One scroll killed the music for    */
  /*     the whole visit, and no later click could revive it.      */
  /*     So: never disarm except on confirmed success.             */
  /*                                                              */
  /*  2. MUTED playback is always allowed. So the track is set     */
  /*     rolling silently from the very first frame and is fully   */
  /*     buffered by the time a gesture arrives, the gesture       */
  /*     only has to unmute, which cannot fail on a load or a      */
  /*     network stall the way a cold play() can.                  */
  /* ---------------------------------------------------------- */
  var audio = document.getElementById('bgAudio');
  var btn = document.getElementById('soundToggle');
  var wanted = false, fadeTimer = null, audible = false;
  var VOL = 0.42;

  function fadeTo(target, done) {
    if (!audio) return;
    clearInterval(fadeTimer);
    var step = (target - audio.volume) / 22;
    fadeTimer = setInterval(function () {
      var v = audio.volume + step;
      if ((step > 0 && v >= target) || (step < 0 && v <= target) || step === 0) {
        audio.volume = Math.max(0, Math.min(1, target));
        clearInterval(fadeTimer);
        done && done();
      } else {
        audio.volume = Math.max(0, Math.min(1, v));
      }
    }, 40);
  }

  function reflect() { btn && btn.setAttribute('aria-pressed', wanted ? 'true' : 'false'); }

  /* start it rolling with no sound, always permitted, and it warms the buffer */
  function rollSilently() {
    if (!audio) return;
    audio.muted = true;
    audio.volume = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* Try to actually make sound. Resolves true only if it worked.

     Single-flight, and that matters: a wheel and a scroll arrive back to back,
     so two attempts overlap. The second would read `wasMuted` off an element
     the first had already unmuted, then "restore" it to unmuted on failure,
     leaving the track silent AND paused, with nothing left rolling. */
  var inFlight = null;
  function goAudible() {
    if (!audio) return Promise.resolve(false);
    if (audible) return Promise.resolve(true);
    if (inFlight) return inFlight;

    var wasMuted = audio.muted;
    audio.muted = false;
    /* if it has been rolling silently the visitor has heard none of it, so
       give them the top of the track rather than dropping them mid-phrase */
    if (wasMuted) { try { audio.currentTime = 0; } catch (e) {} }
    audio.volume = 0;

    var p;
    try { p = audio.play(); } catch (e) { p = null; }
    var settle = function (ok) { inFlight = null; return ok; };
    var win = function () { audible = true; fadeTo(VOL); return settle(true); };
    var lose = function () {
      /* unmuting without activation makes Chrome pause it, put it back */
      audio.muted = wasMuted;
      if (wasMuted && audio.paused) rollSilently();
      return settle(false);
    };
    if (!p || !p.then) return Promise.resolve(audio.paused ? lose() : win());
    inFlight = p.then(win, lose);
    return inFlight;
  }

  var ARM = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchstart', 'touchend', 'wheel', 'scroll'];
  var armed = false;
  function kick() {
    if (!wanted || audible) { disarm(); return; }
    goAudible().then(function (ok) { if (ok) disarm(); });
  }
  function arm() {
    if (armed || !audio) return;
    armed = true;
    /* capture, passive, and NOT `once`, a wheel event that cannot grant
       activation must be free to fail without costing us the next real click */
    ARM.forEach(function (t) { window.addEventListener(t, kick, { capture: true, passive: true }); });
  }
  function disarm() {
    if (!armed) return;
    armed = false;
    ARM.forEach(function (t) { window.removeEventListener(t, kick, true); });
  }

  function setSound(on) {
    if (!audio) return;
    wanted = on;
    reflect();
    try { sessionStorage.setItem('sj_sound', on ? '1' : '0'); } catch (e) {}
    if (on) {
      goAudible().then(function (ok) { if (!ok) { rollSilently(); arm(); } });
    } else {
      audible = false;
      disarm();
      fadeTo(0, function () { audio.pause(); });
    }
  }

  if (btn) btn.addEventListener('click', function () { setSound(!wanted); });

  // pause when the tab is hidden, resume if it was wanted
  document.addEventListener('visibilitychange', function () {
    if (!audio) return;
    if (document.hidden) { audio.pause(); }
    else if (wanted) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
  });

  /* OFF by default now, and the toggle stays hidden until we know there is
     something to play. No track ships with the site, so the button would
     otherwise sit there promising audio that 404s. Drop a file at
     assets/audio/theme1.mp3 and it appears on its own. */
  var soundOnByDefault = false;
  try { if (sessionStorage.getItem('sj_sound') === '1') soundOnByDefault = true; } catch (e) {}

  /* Opt-in, so a site with no track never requests one. Probing for the file
     to decide whether to show the toggle meant a 404 in the console on every
     single load, which is the first thing anyone inspecting the page sees. */
  if (audio && window.SJ_MUSIC) {
    audio.src = 'assets/audio/theme1.mp3';
    var revealed = false;
    var reveal = function () {
      if (revealed) return;
      revealed = true;
      if (btn) btn.hidden = false;
      if (!soundOnByDefault) return;
      wanted = true;
      reflect();
      goAudible().then(function (ok) {
        if (ok) return;
        rollSilently();
        arm();
      });
    };
    audio.addEventListener('loadedmetadata', reveal, { once: true });
    audio.addEventListener('canplay', reveal, { once: true });
    audio.addEventListener('error', function () { if (btn) btn.hidden = true; }, { once: true });
    audio.preload = 'metadata';
    try { audio.load(); } catch (e) {}
  }

  /* ---------------------------------------------------------- */
  /* INVERT: swaps the ink and the paper, keeps pink/cyan         */
  /* ---------------------------------------------------------- */
  var invBtn = document.getElementById('invertToggle');
  function setInvert(on) {
    document.body.classList.toggle('is-invert', on);
    if (invBtn) invBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', on ? '#000000' : '#ffffff');
    if (SK.setShellInvert) SK.setShellInvert(on);   // the PSP casing goes white
    if (typeof onScroll === 'function') onScroll();  // repaint the backdrop tone
    try { localStorage.setItem('sj_invert', on ? '1' : '0'); } catch (e) {}
  }
  if (invBtn) {
    invBtn.addEventListener('click', function () {
      setInvert(!document.body.classList.contains('is-invert'));
    });
  }
  try { if (localStorage.getItem('sj_invert') === '1') setInvert(true); } catch (e) {}

  /* ---------------------------------------------------------- */
  /* SCROLL ENGINE                                               */
  /* Three jobs: bleed the backdrop tone across section seams,   */
  /* drift each element at its own rate, and reveal type as it   */
  /* enters. Everything runs off one rAF loop.                   */
  /* ---------------------------------------------------------- */
  var backdrop = document.querySelector('.backdrop');
  var secs = [].slice.call(document.querySelectorAll('.sec'));
  var movers = [].slice.call(document.querySelectorAll('.el, .lay'));

  /* how far each piece drifts, as a fraction of the viewport */
  var DEPTH = {
    'el--star-a': 0.16, 'el--star-b': -0.13, 'el--hero-cut': 0.07,
    'el--cd-a': 0.15, 'el--cd-b': -0.12, 'el--contact-cut': 0.08,
    'el--floppy': 0.13, 'el--umd': -0.10, 'el--terminal': 0.09,
    'lay--shuja': -0.05, 'lay--jamal': 0.05, 'lay--role': 0.02,
    'lay--abouth': -0.04, 'lay--bio': 0.035,
    'lay--contact': -0.05, 'lay--me': 0.05, 'lay--links': 0.03
  };
  movers.forEach(function (m) {
    var d = 0;
    for (var k in DEPTH) if (m.classList.contains(k)) d = DEPTH[k];
    m.__d = d;
  });

  function toneOf(sec) { return sec.classList.contains('sec--dark') ? 1 : 0; }

  var ticking = false;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var mid = window.scrollY + vh * 0.5;

    /* --- backdrop tone, blended across a band at each seam --- */
    if (backdrop && secs.length) {
      var band = vh * 0.6;
      var tone = toneOf(secs[secs.length - 1]);
      for (var i = 0; i < secs.length; i++) {
        var top = secs[i].offsetTop, bot = top + secs[i].offsetHeight;
        if (mid >= top && mid < bot) {
          tone = toneOf(secs[i]);
          if (i < secs.length - 1 && mid > bot - band) {
            tone += (toneOf(secs[i + 1]) - tone) * ((mid - (bot - band)) / band);
          } else if (i > 0 && mid < top + band) {
            tone += (toneOf(secs[i - 1]) - tone) * (1 - (mid - top) / band);
          }
          break;
        }
      }
      var inv = document.body.classList.contains('is-invert');
      var v = Math.round((inv ? tone : 1 - tone) * 255);
      backdrop.style.backgroundColor = 'rgb(' + v + ',' + v + ',' + v + ')';
    }

    /* --- per-element drift ---
       Skipped on narrow screens, where the stylesheet pins --ty to 0 anyway.
       Without this the loop still ran a getBoundingClientRect per mover per
       scroll frame, forcing layout, to compute a value nothing would use. */
    if (narrow.matches) return;
    for (var j = 0; j < movers.length; j++) {
      var m = movers[j];
      if (!m.__d) continue;
      var r = m.parentNode.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;      // far off-screen, skip
      var p = (r.top + r.height / 2 - vh / 2) / vh;        // -1 .. 1 through the viewport
      m.style.setProperty('--ty', (p * m.__d * vh).toFixed(1) + 'px');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();

  /* reveal the type and the cut-outs as each section arrives */
  if ('IntersectionObserver' in window && !reduce) {
    var lays = [].slice.call(document.querySelectorAll('.lay, .el'));
    lays.forEach(function (n) { n.classList.add('rev'); });
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-shown'); ro.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    lays.forEach(function (n) { ro.observe(n); });

    /* Failsafe, nothing may be left hidden because an observer misfired.
       PER ELEMENT, not blanket: it only shows what is actually on screen, so a
       section further down still gets its animation when you reach it. An
       earlier build force-showed everything 2.5s after load and killed every
       reveal past the fold; the one before that left all body text invisible.
       Do not remove this, and do not turn it back into a blanket timeout. */
    var showIfNear = function () {
      var vh = window.innerHeight, live = 0;
      for (var z = 0; z < lays.length; z++) {
        var el = lays[z];
        if (el.classList.contains('is-shown')) continue;
        live++;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { el.classList.add('is-shown'); ro.unobserve(el); }
      }
      if (!live && guard) { clearInterval(guard); guard = null; }
    };
    var guard = setInterval(showIfNear, 900);
    showIfNear();
    window.addEventListener('scroll', showIfNear, { passive: true });
    window.addEventListener('resize', showIfNear, { passive: true });
  }

  /* ---------------------------------------------------------- */
  /* SMOOTH IN-PAGE NAV                                          */
  /* ---------------------------------------------------------- */
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------------------------------------------------------- */
  /* SECTION REVEALS                                             */
  /* ---------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('.about, .contact, .exp, .stack, .work-rail')
      .forEach(function (el) { io.observe(el); });

    /* timeline rows arrive one after another, so the spine reads as drawing
       itself rather than as seven things appearing at once */
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var row = en.target;
        var sibs = [].slice.call(row.parentNode.children);
        row.style.transitionDelay = (Math.min(4, sibs.indexOf(row)) * 0.07) + 's';
        row.classList.add('is-in');
        tio.unobserve(row);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.tl__i, .stack__g').forEach(function (el) { tio.observe(el); });
  }

  /* ---------------------------------------------------------- */
  /* HERO CUT-OUT, swappable from data.js                        */
  /* The dice and the pack of cards live at different aspect      */
  /* ratios, so the class goes with the src; CSS sizes each by    */
  /* height on mobile off that class.                             */
  /* ---------------------------------------------------------- */
  (function () {
    var pick = window.SJ_HERO_CUTOUT === 'dice' ? 'dice' : 'cards';
    var other = pick === 'dice' ? 'cards' : 'dice';
    var hero = document.getElementById('heroCut');
    var contact = document.getElementById('contactCut');
    if (hero) { hero.src = 'assets/el/' + pick + '.png'; hero.dataset.cut = pick; }
    /* whichever one the hero did not take goes to the contact page, so no
       artwork is ever used twice and none of it goes unused */
    if (contact) { contact.src = 'assets/el/' + other + '.png'; contact.dataset.cut = other; }
  })();

  /* ---------------------------------------------------------- */
  /* ROLE ROTATOR: the typing line under the name                */
  /* ---------------------------------------------------------- */
  (function () {
    var out = document.getElementById('roleText');
    if (!out) return;
    var lines = [
      'full-stack developer + AI agent builder',
      'AI intern @ Spiral Labs',
      'networking intern @ NASTP',
      'building LLM apps, secure & distributed systems'
    ];
    if (reduce) { out.textContent = lines[0]; return; }

    var li = 0, ci = 0, dir = 1, hold = 0;
    (function step() {
      if (hold > 0) { hold--; setTimeout(step, 40); return; }
      ci += dir;
      out.textContent = lines[li].slice(0, ci);
      if (dir > 0 && ci >= lines[li].length) { dir = -1; hold = 46; }
      else if (dir < 0 && ci <= 0) { dir = 1; li = (li + 1) % lines.length; hold = 6; }
      setTimeout(step, dir > 0 ? 46 : 22);
    })();
  })();

  /* ---------------------------------------------------------- */
  /* GAUGE: scroll progress and which section you are in          */
  /* ---------------------------------------------------------- */
  (function () {
    var fill = document.getElementById('gaugeFill');
    var num = document.getElementById('secNum');
    var tot = document.querySelector('.gauge__tot');
    var all = [].slice.call(document.querySelectorAll('.sec'));
    if (!fill || !all.length) return;
    if (tot) tot.textContent = '/' + String(all.length).padStart(2, '0');

    var t2 = false;
    function paint() {
      t2 = false;
      var doc = document.documentElement.scrollHeight - window.innerHeight;
      var p = doc > 0 ? window.scrollY / doc : 0;
      fill.style.transform = 'scaleY(' + Math.max(0, Math.min(1, p)).toFixed(4) + ')';

      var mid = window.scrollY + window.innerHeight * 0.5;
      for (var i = all.length - 1; i >= 0; i--) {
        if (mid >= all[i].offsetTop) {
          if (num) num.textContent = String(i + 1).padStart(2, '0');
          document.body.dataset.sec = all[i].dataset.label || '';
          break;
        }
      }
    }
    function q() { if (!t2) { t2 = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', q, { passive: true });
    window.addEventListener('resize', q, { passive: true });
    paint();
  })();

  /* ---------------------------------------------------------- */
  /* VELOCITY SKEW: the page shears very slightly with scroll     */
  /* speed and springs back when you stop. Capped hard: past      */
  /* about a degree it stops reading as momentum and starts       */
  /* reading as a rendering fault.                                */
  /* ---------------------------------------------------------- */
  (function () {
    /* Desktop only. The skew is applied to .wrap and to all fourteen project
       cards, so every scroll frame re-rasterises them. That is affordable on a
       pointer device and is a large part of the mobile scroll stutter. */
    if (reduce || window.matchMedia('(max-width: 860px)').matches) return;
    var last = window.scrollY, sk = 0, raf = null;

    function loop() {
      var now = window.scrollY;
      var v = now - last;
      last = now;
      var target = Math.max(-1.1, Math.min(1.1, v * 0.045));
      sk += (target - sk) * 0.16;
      if (Math.abs(sk) < 0.004) sk = 0;
      document.documentElement.style.setProperty('--skew', sk.toFixed(3) + 'deg');
      if (sk !== 0 || v !== 0) raf = requestAnimationFrame(loop);
      else raf = null;
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  })();

  /* ---------------------------------------------------------- */
  /* CURSOR                                                      */
  /*                                                             */
  /* A disc painted white and composited with difference, so it   */
  /* is always the exact inverse of whatever sits beneath it.     */
  /* All of that is CSS. This only moves it, and decides when it  */
  /* should swell. It swells over things you can click and does   */
  /* nothing else: no press state, no trailing, no magnetism.     */
  /* ---------------------------------------------------------- */
  (function () {
    var dot = document.getElementById('cursor');
    if (!dot) return;
    /* Touch devices have no pointer to replace, and matchMedia is the honest
       test: a `touchstart` listener would also fire on hybrid laptops. */
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      dot.remove();
      return;
    }

    /* #pspCanvas is deliberately absent. The machine has its own cursor
       language, grab and pointer written straight onto the canvas by psp.js,
       and swelling the disc across the whole of it said nothing useful. The
       swell is reserved for discrete things you can click: cards, links,
       buttons, fields. */
    var HOT = 'a,button,summary,label,input,textarea,select,[data-mag],.pcard';

    /* Written straight from the event, with no interpolation and no rAF.

       This used to ease toward the pointer at 0.32 a frame, which trails
       behind the real cursor. On a site you navigate by pointing at things
       that reads as lag, not as polish: the disc is standing in for the
       system cursor, so anything less than exact tracking feels broken. */
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      dot.style.setProperty('--cx', e.clientX + 'px');
      dot.style.setProperty('--cy', e.clientY + 'px');
      dot.classList.remove('is-idle');
      dot.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
    }, { passive: true });

    /* Leaving the window entirely, rather than merely crossing an element */
    document.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget && !e.toElement) dot.classList.add('is-idle');
    }, { passive: true });
    window.addEventListener('blur', function () { dot.classList.add('is-idle'); });
  })();

  /* ---------------------------------------------------------- */
  /* MAGNETIC LINKS                                              */
  /* ---------------------------------------------------------- */
  (function () {
    if (reduce || !window.matchMedia('(hover:hover)').matches) return;
    [].slice.call(document.querySelectorAll('[data-mag]')).forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.setProperty('--mx', (dx * 14).toFixed(2) + 'px');
        el.style.setProperty('--my', (dy * 9).toFixed(2) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  })();
})();
