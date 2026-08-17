/* ============================================================
   THE WORK: the same library the machine holds, laid flat.

   Cards are generated from SJ_WORKS, never hand-written: the PSP and
   this rail are two views of one array, and maintaining fourteen
   projects in two places is a promise that they will disagree.

   The rail is a real horizontal scroll container. It used to be a
   page-scroll-driven transform inside a pinned section, which meant
   the section had to be four thousand pixels tall, so reaching
   anything below the rail required scrolling through every project
   first. A scroll container is one viewport tall, gets the platform's
   own momentum and snapping for free on touch, and lets vertical
   scrolling pass straight through.

   Snapping is lifted while a flick or a wheel burst is still moving
   and restored once it settles, so the rail glides and then locks on
   instead of fighting the gesture frame by frame.
   ============================================================ */
(function () {
  'use strict';

  var WORKS = window.SJ_WORKS || [];
  var track = document.getElementById('workTrack');
  var scroller = document.getElementById('workScroller');
  var prog = document.getElementById('workProg');
  var idxEl = document.getElementById('workIdx');
  var prevBtn = document.getElementById('workPrev');
  var nextBtn = document.getElementById('workNext');
  if (!track || !scroller || !WORKS.length) return;

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
      acts += '<a class="btn btn--live" href="' + esc(w.live) + '" target="_blank" rel="noopener">Open live &#8599;</a>';
    }
    acts += '<a class="btn" href="' + esc(w.repo) + '" target="_blank" rel="noopener">Source &#8599;</a>';
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

    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;                 // let links be links
      if (dragged) return;                               // a drag is not a tap
      if (window.SK && SK.psp) SK.psp.selectById(w.id);
      centre(i);
      if (e.target.closest('.btn--load')) {
        var m = document.getElementById('work');
        m && m.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }
    });

    track.appendChild(el);
    return el;
  });

  var current = -1;
  function mark(i) {
    if (i === current) return;
    current = i;
    for (var k = 0; k < cards.length; k++) cards[k].classList.toggle('is-sel', k === i);
    if (idxEl) idxEl.textContent = String(i + 1).padStart(2, '0');
    if (prevBtn) prevBtn.disabled = i <= 0;
    if (nextBtn) nextBtn.disabled = i >= cards.length - 1;
  }

  /* ---------------------------------------------------------- */
  /* POSITION                                                    */
  /* ---------------------------------------------------------- */

  /* The scroll position each card is centred at, clamped to the scrollable
     range. Cached because it is read on every scroll frame, and rebuilt
     whenever the layout can have changed. */
  var targets = [];
  function measure() {
    var max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    targets = cards.map(function (c) {
      return Math.max(0, Math.min(max, c.offsetLeft + c.offsetWidth / 2 - scroller.clientWidth / 2));
    });
    return max;
  }

  /* Index from the target table, not from linear progress and not from raw
     proximity to the viewport centre.

     Both of the simpler options break at the ends. On a viewport wide enough
     to show several cards, the first two and the last two all clamp to the
     same scroll position, so the card nearest the middle at rest is not the
     one that was selected. Linear progress fixes the extremes but then drifts
     by one through the middle, because that clamping makes the pitch between
     cards uneven across the range.

     Matching against the positions the rail actually scrolls to is exact by
     construction. Ties, which only occur inside a clamped run, resolve to the
     first of the group, and the two extremes are answered directly so that
     both the first and last card remain reachable. */
  function indexAt() {
    var max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    var l = scroller.scrollLeft;
    if (max <= 0 || l <= 1) return 0;
    if (l >= max - 1) return cards.length - 1;
    var best = 0, bd = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var d = Math.abs(targets[i] - l);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  var lastTarget = 0;

  function centre(i, instant) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    lastTarget = targets[i] != null ? targets[i] : 0;
    scroller.scrollTo({
      left: lastTarget,
      behavior: (instant || reduce) ? 'auto' : 'smooth'
    });
    mark(i);
  }

  function paint() {
    var max = scroller.scrollWidth - scroller.clientWidth;
    var p = max > 0 ? scroller.scrollLeft / max : 0;
    if (prog) prog.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(4) + ')';

    /* Sitting where we were last asked to sit means this scroll event is the
       tail of our own animation, so the committed selection stands. Only a
       position the visitor put us in re-derives the index, which is what stops
       a clamped card at either end from being marked as its neighbour. */
    if (Math.abs(scroller.scrollLeft - lastTarget) < 4) return;
    mark(indexAt());
  }

  /* ---------------------------------------------------------- */
  /* SNAP ON SETTLE                                              */
  /*                                                             */
  /* CSS mandatory snapping is right for a touch flick but wrong */
  /* for a wheel or a drag, where it re-snaps on every delta and */
  /* the rail feels glued. So the snap is lifted while input is  */
  /* actually arriving and restored a beat after it stops, which */
  /* is when the browser performs the snap: fast movement runs   */
  /* free, and slowing down locks onto a card.                   */
  /* ---------------------------------------------------------- */
  var freeTimer = null;
  function freeScroll(ms) {
    scroller.classList.add('is-free');
    clearTimeout(freeTimer);
    freeTimer = setTimeout(function () {
      scroller.classList.remove('is-free');
      /* Re-applying scroll-snap-type does not itself trigger a snap in every
         engine, so nudge it: scrolling to the nearest card is what the snap
         would have done anyway, and it is a no-op when already aligned. */
      centre(indexAt());
    }, ms || 140);
  }

  var ticking = false;
  scroller.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; paint(); });
  }, { passive: true });

  /* ---------------------------------------------------------- */
  /* WHEEL                                                       */
  /*                                                             */
  /* Only a horizontal wheel or a shift-wheel is claimed. A      */
  /* plain vertical wheel is deliberately left to the page: this */
  /* section must never be a scroll trap, which is exactly what  */
  /* the pinned version was.                                     */
  /* ---------------------------------------------------------- */
  scroller.addEventListener('wheel', function (e) {
    var horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontal && !e.shiftKey) return;              // let the page have it
    var d = horizontal ? e.deltaX : e.deltaY;
    if (!d) return;
    e.preventDefault();
    freeScroll();
    scroller.scrollLeft += d;
  }, { passive: false });

  /* ---------------------------------------------------------- */
  /* DRAG                                                        */
  /* A desktop mouse has no horizontal axis, so the rail has to  */
  /* be draggable or half of the projects are unreachable        */
  /* without the arrows.                                         */
  /* ---------------------------------------------------------- */
  var down = false, dragged = false, startX = 0, startLeft = 0, pid = null;

  scroller.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;               // native touch is better
    if (e.target.closest('a, button')) return;
    down = true; dragged = false;
    startX = e.clientX; startLeft = scroller.scrollLeft;
    pid = e.pointerId;
    scroller.classList.add('is-dragging');
  });

  scroller.addEventListener('pointermove', function (e) {
    if (!down || e.pointerId !== pid) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 4) dragged = true;
    scroller.scrollLeft = startLeft - dx;
  });

  function endDrag() {
    if (!down) return;
    down = false;
    scroller.classList.remove('is-dragging');
    if (dragged) centre(indexAt());
    /* let the click handler see `dragged`, then clear it */
    setTimeout(function () { dragged = false; }, 0);
  }
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('pointerleave', endDrag);

  /* ---------------------------------------------------------- */
  /* ARROWS + KEYS                                               */
  /* ---------------------------------------------------------- */
  /* Steps from the last committed index, not from the live scroll position. A
     takes a few hundred milliseconds, and reading scrollLeft during one gives
     the position the rail is leaving rather than the one it is heading for, so
     three quick taps on the arrow advanced a single card. `current` is updated
     synchronously by centre(), and by paint() whenever the visitor scrolls the
     rail themselves, so it is correct in both directions. */
  function step(dir) {
    var i = Math.max(0, Math.min(cards.length - 1, current + dir));
    if (i === current) return;
    centre(i);
    if (window.SK && SK.psp && cards[i]) SK.psp.selectById(cards[i].dataset.id);
  }
  if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

  scroller.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (e.key === 'Home') { centre(0); e.preventDefault(); }
    else if (e.key === 'End') { centre(cards.length - 1); e.preventDefault(); }
  });

  /* ---------------------------------------------------------- */
  /* SYNC WITH THE MACHINE                                       */
  /* ---------------------------------------------------------- */
  var syncing = false;
  window.addEventListener('sj:slot', function (e) {
    if (syncing) return;
    syncing = true;
    centre(e.detail.index);
    setTimeout(function () { syncing = false; }, 60);
  });

  function relayout() { measure(); paint(); }
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('load', relayout);
  /* card heights and therefore the track width settle once VCR arrives */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout, relayout);

  measure();
  mark(0);
  paint();
})();
