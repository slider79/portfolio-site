/* ============================================================
   THE WORK: the same library the machine holds, laid flat.

   Cards are generated from SJ_WORKS, never hand-written: the PSP and
   this rail are two views of one array, and maintaining fourteen
   projects in two places is a promise that they will disagree.

   The rail is a pinned horizontal scroll. The section is made tall
   enough to absorb exactly the horizontal distance the track needs,
   so the pin releases at the moment the last card lands, with no dead
   scroll at either end, whatever the viewport or the card count.
   ============================================================ */
(function () {
  'use strict';

  var WORKS = window.SJ_WORKS || [];
  var track = document.getElementById('workTrack');
  var sec = document.getElementById('projects');
  var pin = sec && sec.querySelector('.work__pin');
  var prog = document.getElementById('workProg');
  if (!track || !sec || !WORKS.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- */
  /* BUILD                                                       */
  /* ---------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var cards = WORKS.map(function (w, i) {
    var el = document.createElement('article');
    el.className = 'pcard' + (w.live ? ' is-live' : '');
    el.id = 'p-' + w.id;
    el.dataset.id = w.id;
    el.style.setProperty('--accent', w.accent);

    var tech = w.tech.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');

    var acts = '';
    if (w.live) {
      acts += '<a class="btn btn--live" href="' + esc(w.live) + '" target="_blank" rel="noopener">Open live ↗</a>';
    }
    acts += '<a class="btn" href="' + esc(w.repo) + '" target="_blank" rel="noopener">Source ↗</a>';
    acts += '<button class="btn btn--load" type="button">Load cartridge</button>';

    el.innerHTML =
      '<div class="pcard__top">' +
        '<span class="pcard__org">' + esc(w.kind) + '</span>' +
        '<span class="pcard__no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '</div>' +
      '<h3 class="pcard__title">' + esc(w.title) + '</h3>' +
      '<p class="pcard__tag">' + esc(w.tagline) + '</p>' +
      '<p class="pcard__blurb">' + esc(w.blurb) + '</p>' +
      '<ul class="pcard__tech">' + tech + '</ul>' +
      '<div class="pcard__acts">' + acts + '</div>' +
      '<span class="pcard__state">' + (w.live ? 'DEPLOYED' : 'SOURCE ONLY') + '</span>';

    /* clicking the card loads that cartridge into the machine above, so
       the two views stay in agreement about what is selected */
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;                 // let links be links
      if (window.SK && SK.psp) SK.psp.selectById(w.id);
      mark(i);
      if (e.target.closest('.btn--load')) {
        var m = document.getElementById('work');
        m && m.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }
    });

    track.appendChild(el);
    return el;
  });

  function mark(i) {
    for (var k = 0; k < cards.length; k++) cards[k].classList.toggle('is-sel', k === i);
  }
  mark(0);

  /* the machine drives the rail as well as the other way round */
  window.addEventListener('sj:slot', function (e) {
    mark(e.detail.index);
  });

  /* ---------------------------------------------------------- */
  /* PINNED HORIZONTAL SCROLL                                    */
  /* ---------------------------------------------------------- */
  var span = 0;          // how far the track must travel, in px

  function measure() {
    /* Read the real laid-out width rather than summing card widths: gaps,
       padding and any wrap are already accounted for in scrollWidth. */
    var need = track.scrollWidth - track.clientWidth;
    span = Math.max(0, need);
    /* the pin lasts exactly as long as the horizontal distance requires */
    sec.style.setProperty('--pin-span', span + 'px');
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  function frame() {
    ticking = false;
    if (!span) { track.style.transform = ''; return; }

    var top = sec.offsetTop;
    var travel = sec.offsetHeight - window.innerHeight;   // scroll while pinned
    if (travel <= 0) return;

    var p = (window.scrollY - top) / travel;
    p = Math.max(0, Math.min(1, p));

    track.style.transform = 'translate3d(' + (-p * span).toFixed(1) + 'px,0,0)';
    if (prog) prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';

    /* highlight whichever card is nearest the centre of the viewport */
    var mid = window.innerWidth / 2;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      var d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (!cards[best].classList.contains('is-sel')) mark(best);
  }

  /* Under reduced motion the rail becomes an ordinary vertical list.
     A pinned sideways scroll is exactly the effect that setting exists
     to switch off. */
  function setup() {
    if (reduce) { sec.classList.add('is-static'); return; }
    measure();
    frame();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); frame(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup, setup);
  else setup();
  window.addEventListener('load', function () { measure(); frame(); });
})();
