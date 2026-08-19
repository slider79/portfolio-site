/* ============================================================
   HYPER TEXT: headings resolve out of a letter storm.

   A vanilla port of the 21st.dev / Magic UI HyperText component,
   which ships as React plus framer-motion plus Tailwind. None of
   those exist here and none should: this is a zero-build static
   site, and pulling a bundler, React and a CSS framework in to
   animate four headings is the exact trade the Frontend Shortcuts
   writeup argued against.

   The algorithm is kept faithful to the original:
     · one <span> per character, so the box never reflows mid-run
     · an interval of duration / (length * 10)
     · a counter advancing 0.1 per tick, so a character locks once
       the counter passes its index, left to right
     · unlocked characters show a random A-Z
     · re-triggers on pointer enter

   What is deliberately NOT ported: the original uppercases every
   glyph on render. These headings are lower case by design, so the
   real casing is preserved. Flip UPPERCASE below to match the
   component exactly.

   What is added, because the original can strand a heading:
   every run has a hard stop that restores the real text whatever
   the frame timer does, and the text is restored outright when the
   page is shown again. A run interrupted by a bfcache navigation
   or a throttled background tab used to leave the heading frozen
   part way through, showing its first letter and a row of noise.
   ============================================================ */
(function () {
  'use strict';

  var UPPERCASE = false;
  var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var DEFAULT_DURATION = 800;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var targets = [].slice.call(document.querySelectorAll('[data-hyper]'));
  if (!targets.length) return;

  /* Desktop only, and that is a deliberate retreat.

     The effect is driven by setInterval, and mobile browsers throttle timers
     hard during a scroll and in backgrounded tabs. When that happens the run
     stalls part way and the heading sits there reading its first character
     followed by a row of noise. The hard stop below cannot rescue it either,
     because a setTimeout is throttled by exactly the same mechanism.

     A decorative flourish is not worth a heading nobody can read, and at phone
     size the storm is barely perceptible anyway. Headings are left as plain
     text there, untouched. */
  if (window.matchMedia('(max-width: 860px)').matches) return;

  function build(el) {
    /* The real text is stashed on the node before anything mutates it, so
       it can always be recovered no matter how a run ends. */
    var real = el.dataset.hyperReal;
    if (real == null) real = el.dataset.hyperReal = el.textContent;

    el.textContent = '';
    var spans = [];
    for (var i = 0; i < real.length; i++) {
      var s = document.createElement('span');
      s.className = 'ht' + (real[i] === ' ' ? ' ht--sp' : '');
      s.textContent = real[i];
      el.appendChild(s);
      spans.push(s);
    }
    return (el.__ht = { real: real, spans: spans, tick: null, hard: null });
  }

  function settle(st) {
    clearInterval(st.tick); clearTimeout(st.hard);
    st.tick = st.hard = null;
    for (var i = 0; i < st.spans.length; i++) st.spans[i].textContent = st.real[i];
  }

  function play(el) {
    var st = el.__ht || build(el);
    if (reduce) return settle(st);

    clearInterval(st.tick); clearTimeout(st.hard);

    var n = st.real.length;
    var dur = parseInt(el.dataset.hyperDuration, 10) || DEFAULT_DURATION;
    var step = Math.max(16, dur / (n * 10));
    var at = 0;

    st.tick = setInterval(function () {
      if (at >= n) return settle(st);
      for (var i = 0; i < n; i++) {
        var c = st.real[i];
        if (c === ' ') continue;
        var ch = i <= at ? c : POOL[(Math.random() * POOL.length) | 0];
        st.spans[i].textContent = UPPERCASE ? ch.toUpperCase() : ch;
      }
      at += 0.1;
    }, step);

    /* The guarantee. setInterval is throttled hard in background tabs and
       stops outright in some mobile states, so completion cannot depend on
       it alone: this restores the real text regardless. */
    st.hard = setTimeout(function () { settle(st); }, dur + 600);
  }

  targets.forEach(function (el) {
    build(el);
    /* re-run on hover, as the original does on mouse enter */
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      play(el);
    });
  });

  /* Anything restored from bfcache, or returning from a background tab, is
     put back to its real text outright. The effect has already been seen;
     replaying it matters far less than never leaving a heading unreadable. */
  function restoreAll() {
    targets.forEach(function (el) { if (el.__ht) settle(el.__ht); });
  }
  window.addEventListener('pageshow', restoreAll);
  window.addEventListener('pagehide', restoreAll);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) restoreAll();
  });

  if (reduce) { targets.forEach(function (el) { settle(el.__ht); }); return; }

  if (!('IntersectionObserver' in window)) { targets.forEach(play); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      play(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  targets.forEach(function (el) { io.observe(el); });
})();
