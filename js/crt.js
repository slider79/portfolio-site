/* ============================================================
   THE SET: snow on the glass, and a dial that tunes it out.

   Deliberately additive. The screen starts TUNED IN, at --tune 1, and
   only detunes once this script is alive and the section has been
   reached. A dead script, a blocked file or a stylesheet that never
   arrives therefore leaves plain legible copy rather than a wall of
   noise, which is the rule this site has broken enough times already:
   nothing decorative may stand between the visitor and the words.

   For the same reason the dial is a toy, not a gate. It plays itself in
   on arrival, so everyone sees the effect once without having to work
   out that a knob is draggable, and after that it is yours to twist.
   ============================================================ */
(function () {
  'use strict';

  var snow = document.getElementById('crtSnow');
  var dial = document.getElementById('crtDial');
  var bio  = document.querySelector('.lay--bio');
  var about = document.getElementById('about');
  if (!snow || !dial || !bio || !about) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 860px)');
  /* the set is not drawn at phone size, so neither is any of this */
  if (reduce || narrow.matches) { dial.remove(); snow.remove(); return; }

  /* ---------------------------------------------------------- */
  /* TUNING MODEL                                                */
  /*                                                             */
  /* The needle sweeps a full range but only one spot is signal.  */
  /* Distance from it is what makes the picture, so turning the   */
  /* wrong way walks back into the snow exactly as far as you go. */
  /* ---------------------------------------------------------- */
  var LOCK = 38;          // degrees: where the station actually sits
  var SPAN = 105;         // degrees either side before it is pure noise
  var MIN = -150, MAX = 150;

  var angle = LOCK;
  var tune = 1;

  function apply(a) {
    angle = Math.max(MIN, Math.min(MAX, a));
    var off = Math.abs(angle - LOCK) / SPAN;
    /* eased so the last few degrees do most of the work, which is what
       makes finding the station feel like finding it */
    tune = Math.max(0, 1 - off);
    tune = tune * tune * (3 - 2 * tune);
    about.style.setProperty('--tune', tune.toFixed(3));
    dial.style.setProperty('--dial', angle.toFixed(1) + 'deg');
    dial.setAttribute('aria-valuenow', Math.round(tune * 100));
    if (tune > 0.995 && raf) { cancelAnimationFrame(raf); raf = null; }
    else if (tune <= 0.995 && !raf && shown) raf = requestAnimationFrame(paint);
  }

  /* ---------------------------------------------------------- */
  /* SNOW                                                        */
  /* A small buffer scaled up by the CSS, so the grain is coarse  */
  /* like a real tube and the per frame cost stays trivial.       */
  /* ---------------------------------------------------------- */
  var W = 160, H = 120;
  snow.width = W; snow.height = H;
  var sx = snow.getContext('2d', { alpha: true });
  var buf = sx.createImageData(W, H);
  var raf = null, shown = false, last = 0;

  function paint(now) {
    raf = null;
    if (!shown || tune > 0.995) return;
    /* ~14fps: static reads as static without burning a frame budget on it */
    if (now - last > 70) {
      last = now;
      var d = buf.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      sx.putImageData(buf, 0, 0);
    }
    raf = requestAnimationFrame(paint);
  }

  /* ---------------------------------------------------------- */
  /* DRAG                                                        */
  /* ---------------------------------------------------------- */
  var dragging = false;

  function angleFrom(e) {
    var r = dial.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    /* atan2 measured from straight up, so the needle follows the pointer */
    return Math.atan2(dx, -dy) * 180 / Math.PI;
  }

  dial.addEventListener('pointerdown', function (e) {
    dragging = true;
    dial.setPointerCapture && dial.setPointerCapture(e.pointerId);
    apply(angleFrom(e));
    e.preventDefault();
  });
  dial.addEventListener('pointermove', function (e) {
    if (dragging) apply(angleFrom(e));
  });
  function stop() { dragging = false; }
  dial.addEventListener('pointerup', stop);
  dial.addEventListener('pointercancel', stop);

  dial.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 2 : 9;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { apply(angle - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { apply(angle + step); e.preventDefault(); }
    else if (e.key === 'Home') { apply(MIN); e.preventDefault(); }
    else if (e.key === 'End') { apply(LOCK); e.preventDefault(); }
  });
  /* a plain click, with no drag, snaps to the station */
  dial.addEventListener('click', function () { if (!dragging) sweep(MIN, LOCK, 900); });

  /* ---------------------------------------------------------- */
  /* THE ARRIVAL                                                 */
  /* Detune, then hunt for the station and settle on it, so the  */
  /* dial explains itself without a caption.                     */
  /* ---------------------------------------------------------- */
  function sweep(from, to, ms) {
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, ((now || performance.now()) - t0) / ms);
      var e = 1 - Math.pow(1 - p, 3);
      /* a little overshoot near the end, the way a tuner is nudged past
         the station and brought back */
      var wobble = Math.sin(p * Math.PI * 2.2) * (1 - p) * 16;
      apply(from + (to - from) * e + wobble);
      if (p < 1) requestAnimationFrame(step);
      else apply(to);
    })();
  }

  var played = false;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        shown = en.isIntersecting;
        if (shown && !played) {
          played = true;
          apply(MIN);                       // drop into snow
          if (!raf) raf = requestAnimationFrame(paint);
          setTimeout(function () { sweep(MIN, LOCK, 1500); }, 320);
        }
        if (shown && tune <= 0.995 && !raf) raf = requestAnimationFrame(paint);
      });
    }, { threshold: 0.35 });
    io.observe(about);
  } else {
    shown = true;
  }

  /* Whatever happens, never leave the copy buried. If the arrival is
     interrupted by a background tab or a throttled timer, the station is
     restored outright on the way back. */
  function rescue() { if (document.hidden) return; if (played && tune < 0.99) apply(LOCK); }
  window.addEventListener('pageshow', function () { apply(LOCK); });
  document.addEventListener('visibilitychange', rescue);

  apply(LOCK);
})();
