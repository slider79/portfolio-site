/* ============================================================
   COVER ART: every cartridge, drawn from nothing.

   There are no images here and no video. Each cover is composed at
   runtime onto the 960x544 screen canvas that psp.js feeds into the
   CRT shader, so the whole library costs a few KB of code instead of
   the 3.4MB of clips it replaces.

   Two rules that shaped this file:

     · A glyph must diagram what the project DOES, not what category
       it is in. A microphone icon says "audio"; a waveform being
       transcribed into words says "this thing listens and writes
       down what it heard". The second one is worth drawing.

     · The screen is the scene's main light source. psp.js averages
       this canvas ~6 times a second and drives three point lights
       off the result, so a cover is also a lighting decision: the
       accent is what colour the shell will be lit in.

   Every glyph is a pure function of (t), so nothing accumulates and
   a cover looks identical whether it was opened a second ago or has
   been running for an hour.
   ============================================================ */
(function () {
  'use strict';

  var F = '"VCR","Helv",monospace';

  /* ---------------------------------------------------------- */
  /* SMALL HELPERS                                               */
  /* ---------------------------------------------------------- */

  /* deterministic noise, same index always yields the same value, so
     layouts never reshuffle between frames the way Math.random would */
  function hash(n) {
    var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function hexToRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* accent at an arbitrary alpha, without string-concatenating hex */
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* accent pushed toward white, for highlights that must stay in hue */
  function lift(hex, amt) {
    var c = hexToRgb(hex);
    return 'rgb(' +
      Math.round(c[0] + (255 - c[0]) * amt) + ',' +
      Math.round(c[1] + (255 - c[1]) * amt) + ',' +
      Math.round(c[2] + (255 - c[2]) * amt) + ')';
  }

  function roundRect(x, g, y, w, h, r) {
    x.beginPath();
    x.moveTo(g + r, y);
    x.arcTo(g + w, y, g + w, y + h, r);
    x.arcTo(g + w, y + h, g, y + h, r);
    x.arcTo(g, y + h, g, y, r);
    x.arcTo(g, y, g + w, y, r);
    x.closePath();
  }

  /* a 0..1 ramp that holds at both ends, used for anything that should
     arrive, sit still long enough to be read, then leave */
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function hold(p, lead) {
    if (p < lead) return ease(p / lead);
    if (p > 1 - lead) return 1 - ease((p - (1 - lead)) / lead);
    return 1;
  }

  function label(x, text, px, ax, ay, col, tracking) {
    x.font = px + 'px ' + F;
    x.fillStyle = col;
    if (!tracking) { x.fillText(text, ax, ay); return; }
    var cx = ax;
    for (var i = 0; i < text.length; i++) {
      x.fillText(text[i], cx, ay);
      cx += x.measureText(text[i]).width + tracking;
    }
  }

  function trackedWidth(x, text, px, tracking) {
    x.font = px + 'px ' + F;
    var w = 0;
    for (var i = 0; i < text.length; i++) w += x.measureText(text[i]).width + tracking;
    return w - tracking;
  }

  /* ---------------------------------------------------------- */
  /* GLYPHS                                                      */
  /* Each receives a box (gx, gy, gw, gh), the loop time t, the   */
  /* accent, and the work record. Draw inside the box only.       */
  /* ---------------------------------------------------------- */
  var GLYPH = {};

  /* VOX: speech goes in as a waveform, comes out as written words,
     and goes back out as speech. The three stages of the pipeline. */
  GLYPH.waveform = function (x, gx, gy, gw, gh, t, a) {
    var midY = gy + gh * 0.42;
    var bars = 46;
    var bw = 6;
    var span = gw * 0.62;
    var x0 = gx + gw * 0.19;

    for (var i = 0; i < bars; i++) {
      var p = i / bars;
      /* an envelope so speech starts and stops rather than droning */
      var env = Math.sin(p * Math.PI) * (0.55 + 0.45 * Math.sin(t * 1.3 + p * 3));
      var h = Math.abs(Math.sin(p * 9 + t * 4.2) * Math.cos(p * 4 - t * 2.1)) * gh * 0.34 * env + 3;
      var bx = x0 + p * span;
      /* the leading edge is what is being heard right now */
      var head = (t * 0.42) % 1;
      var hot = Math.abs(p - head) < 0.06;
      x.fillStyle = hot ? lift(a, 0.55) : rgba(a, 0.42 + env * 0.4);
      x.fillRect(bx, midY - h, bw, h * 2);
    }

    /* the transcript the waveform is being turned into */
    var words = ['what', 'time', 'is', 'it', 'in', 'lahore'];
    var ty = gy + gh * 0.86;
    var cx = x0;
    var reveal = ((t * 0.42) % 1) * words.length * 1.25;
    x.font = '19px ' + F;
    for (var w = 0; w < words.length; w++) {
      var on = reveal > w;
      x.fillStyle = on ? 'rgba(226,240,252,.86)' : 'rgba(226,240,252,.13)';
      x.fillText(words[w], cx, ty);
      cx += x.measureText(words[w]).width + 11;
    }

    /* mic in, speaker out */
    x.strokeStyle = rgba(a, 0.8);
    x.lineWidth = 2;
    var mx = gx + gw * 0.08, my = midY;
    roundRect(x, mx - 7, my - 15, 14, 22, 7); x.stroke();
    x.beginPath(); x.arc(mx, my, 15, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();

    var sx = gx + gw * 0.9;
    x.beginPath();
    x.moveTo(sx - 12, my - 6); x.lineTo(sx - 4, my - 6); x.lineTo(sx + 4, my - 15);
    x.lineTo(sx + 4, my + 15); x.lineTo(sx - 4, my + 6); x.lineTo(sx - 12, my + 6);
    x.closePath(); x.stroke();
    for (var r = 0; r < 3; r++) {
      var pulse = (t * 1.6 + r * 0.33) % 1;
      x.strokeStyle = rgba(a, (1 - pulse) * 0.7);
      x.beginPath();
      x.arc(sx + 5, my, 12 + pulse * 20, -0.42 * Math.PI, 0.42 * Math.PI);
      x.stroke();
    }
  };

  /* MEMORY CHAT: the point is not that it stores facts, it is that the
     facts survive a restart. So a restart sweeps through, and they do. */
  GLYPH.memory = function (x, gx, gy, gw, gh, t, a) {
    var facts = ['age: 26', 'lahore', 'football', 'night owl'];
    var cycle = 7.5;
    var p = (t % cycle) / cycle;
    var sweep = gx - 60 + p * (gw + 120);   // the restart, crossing the frame

    var bw = 150, bh = 46;
    var y0 = gy + gh * 0.30;

    for (var i = 0; i < facts.length; i++) {
      var col = i % 2, row = (i / 2) | 0;
      var bx = gx + gw * 0.20 + col * (bw + 26);
      var by = y0 + row * (bh + 22);

      /* as the sweep passes, a chip dims but never clears */
      var d = Math.abs(bx + bw / 2 - sweep);
      var dip = d < 70 ? 1 - d / 70 : 0;

      x.fillStyle = rgba(a, 0.13 + 0.1 * (1 - dip));
      roundRect(x, bx, by, bw, bh, 6); x.fill();
      x.strokeStyle = rgba(a, 0.75 - dip * 0.5);
      x.lineWidth = 1.5;
      roundRect(x, bx, by, bw, bh, 6); x.stroke();

      x.fillStyle = 'rgba(232,240,252,' + (0.92 - dip * 0.55) + ')';
      x.font = '19px ' + F;
      x.fillText(facts[i], bx + 14, by + bh / 2 + 1);
    }

    /* the restart itself */
    x.strokeStyle = 'rgba(255,255,255,.5)';
    x.lineWidth = 2;
    x.setLineDash([5, 7]);
    x.beginPath(); x.moveTo(sweep, gy); x.lineTo(sweep, gy + gh); x.stroke();
    x.setLineDash([]);
    if (sweep > gx && sweep < gx + gw) {
      label(x, 'RESTART', 15, sweep + 9, gy + 13, 'rgba(255,255,255,.62)', 1.5);
    }

    /* the store they live in */
    x.strokeStyle = rgba(a, 0.55);
    x.lineWidth = 2;
    var dx = gx + gw * 0.05, dy = gy + gh * 0.5;
    for (var k = 0; k < 3; k++) {
      x.beginPath();
      x.ellipse(dx, dy - 18 + k * 18, 26, 9, 0, 0, Math.PI * 2);
      x.stroke();
    }
    label(x, 'MEM0', 14, dx - 20, dy + 42, rgba(a, 0.8), 1.5);
  };

  /* CODEX: documents are chunked, embedded, and land in a vector grid.
     The cell a chunk lands in is the one that lights. */
  GLYPH.vectors = function (x, gx, gy, gw, gh, t, a) {
    /* source documents */
    var dx = gx + gw * 0.04;
    for (var d = 0; d < 3; d++) {
      var dy = gy + gh * 0.22 + d * 42;
      x.strokeStyle = rgba(a, 0.6); x.lineWidth = 1.5;
      roundRect(x, dx, dy, 54, 34, 3); x.stroke();
      x.fillStyle = rgba(a, 0.14);
      roundRect(x, dx, dy, 54, 34, 3); x.fill();
      for (var l = 0; l < 3; l++) {
        x.fillStyle = rgba(a, 0.5);
        x.fillRect(dx + 8, dy + 9 + l * 8, 38 - l * 11, 2);
      }
    }

    /* the grid they are embedded into */
    var cols = 12, rows = 6, cell = 21;
    var grx = gx + gw * 0.46, gry = gy + gh * 0.16;

    /* which cells are currently hot, derived from time so it is stable */
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var phase = (t * 0.55 + hash(idx) * 6) % 6;
        var heat = phase < 1 ? 1 - phase : 0;
        var cxp = grx + c * cell, cyp = gry + r * cell;
        x.fillStyle = heat > 0 ? rgba(a, 0.25 + heat * 0.7) : 'rgba(150,170,195,.14)';
        x.fillRect(cxp, cyp, cell - 6, cell - 6);
      }
    }

    /* chunks in flight between the two */
    for (var f = 0; f < 4; f++) {
      var fp = ((t * 0.42 + f * 0.25) % 1);
      var sx = dx + 54, sy = gy + gh * 0.22 + (f % 3) * 42 + 17;
      var tx = grx + (2 + ((f * 5) % cols)) * cell;
      var ty = gry + ((f * 3) % rows) * cell;
      /* arc rather than a straight line, reads as a transform, not a wire */
      var mx = (sx + tx) / 2, my = (sy + ty) / 2 - 46;
      var q = 1 - fp;
      var px = q * q * sx + 2 * q * fp * mx + fp * fp * tx;
      var py = q * q * sy + 2 * q * fp * my + fp * fp * ty;
      x.fillStyle = lift(a, 0.4);
      x.fillRect(px - 4, py - 4, 8, 8);
    }

    label(x, 'CHUNK', 14, dx + 2, gy + gh * 0.12, rgba(a, 0.7), 1.5);
    label(x, 'VECTOR STORE', 14, grx, gry - 14, rgba(a, 0.7), 1.5);
  };

  /* DELPHI: a spoken question, retrieval fanning out to sources, a
     spoken answer. The orb is Vapi; the fan is the RAG underneath. */
  GLYPH.orb = function (x, gx, gy, gw, gh, t, a) {
    var cx = gx + gw * 0.5, cy = gy + gh * 0.46;
    var beat = 0.5 + 0.5 * Math.sin(t * 2.4);

    /* documents around the rim, lighting in sequence as they are hit */
    var n = 7;
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI * 0.82 + (i / (n - 1)) * Math.PI * 1.64;
      var rr = gh * 0.52;
      var px = cx + Math.cos(ang) * rr * 1.5;
      var py = cy + Math.sin(ang) * rr;
      var lit = Math.max(0, Math.sin(t * 1.5 - i * 0.5));

      x.strokeStyle = rgba(a, 0.25 + lit * 0.7);
      x.lineWidth = 1 + lit * 1.4;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, py); x.stroke();

      x.fillStyle = rgba(a, 0.18 + lit * 0.6);
      roundRect(x, px - 13, py - 9, 26, 18, 2); x.fill();
      x.strokeStyle = rgba(a, 0.55 + lit * 0.45);
      x.lineWidth = 1.2;
      roundRect(x, px - 13, py - 9, 26, 18, 2); x.stroke();
    }

    /* the orb */
    for (var k = 3; k >= 1; k--) {
      x.fillStyle = rgba(a, 0.09 * k * (0.6 + beat * 0.5));
      x.beginPath(); x.arc(cx, cy, 24 + k * 13 + beat * 7, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = lift(a, 0.35 + beat * 0.3);
    x.beginPath(); x.arc(cx, cy, 22 + beat * 4, 0, Math.PI * 2); x.fill();

    /* inner speech rings */
    x.strokeStyle = 'rgba(255,255,255,' + (0.35 + beat * 0.35) + ')';
    x.lineWidth = 2;
    for (var w = 0; w < 3; w++) {
      var h2 = 5 + Math.abs(Math.sin(t * 3.1 + w)) * 11;
      x.beginPath();
      x.moveTo(cx - 10 + w * 10, cy - h2);
      x.lineTo(cx - 10 + w * 10, cy + h2);
      x.stroke();
    }
    label(x, 'VAPI', 14, cx - 18, cy + 54, rgba(a, 0.85), 1.5);
  };

  /* DISPATCH: three agents in sequence, then a fan-out to two sinks.
     A packet actually travels the chain so the order is legible. */
  GLYPH.relay = function (x, gx, gy, gw, gh, t, a) {
    var names = ['RESEARCH', 'EDIT', 'DISTRIBUTE'];
    var bw = 128, bh = 54;
    var y = gy + gh * 0.30;
    var gap = (gw * 0.72 - bw * 3) / 2;
    var x0 = gx + gw * 0.05;

    var cycle = 6;
    var p = (t % cycle) / cycle;
    var stage = Math.min(2.999, p * 3.6);

    for (var i = 0; i < 3; i++) {
      var bx = x0 + i * (bw + gap);
      var active = stage >= i && stage < i + 1;
      var done = stage >= i + 1;

      x.fillStyle = active ? rgba(a, 0.34) : rgba(a, done ? 0.16 : 0.08);
      roundRect(x, bx, y, bw, bh, 5); x.fill();
      x.strokeStyle = rgba(a, active ? 1 : 0.45);
      x.lineWidth = active ? 2.2 : 1.4;
      roundRect(x, bx, y, bw, bh, 5); x.stroke();

      label(x, names[i], 15, bx + 12, y + bh / 2 + 1,
        active ? '#ffffff' : 'rgba(226,240,252,.6)', 1.6);

      if (i < 2) {
        x.strokeStyle = rgba(a, 0.5); x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(bx + bw, y + bh / 2); x.lineTo(bx + bw + gap, y + bh / 2); x.stroke();
      }
    }

    /* the packet, riding the chain */
    if (stage < 3) {
      var seg = Math.floor(stage), fr = stage - seg;
      var px = x0 + seg * (bw + gap) + fr * (bw + gap);
      x.fillStyle = lift(a, 0.5);
      x.beginPath(); x.arc(px + 10, y + bh / 2, 6, 0, Math.PI * 2); x.fill();
    }

    /* the two sinks */
    var sinks = ['SLACK', 'SHEETS'];
    var sx = x0 + 3 * (bw + gap) - gap + 26;
    for (var s = 0; s < 2; s++) {
      var sy = y + (s === 0 ? -18 : bh + 6);
      var on = stage > 2.6;
      x.strokeStyle = rgba(a, on ? 0.95 : 0.35); x.lineWidth = 1.5;
      roundRect(x, sx, sy, 96, 34, 4); x.stroke();
      if (on) { x.fillStyle = rgba(a, 0.28); roundRect(x, sx, sy, 96, 34, 4); x.fill(); }
      label(x, sinks[s], 14, sx + 10, sy + 18,
        on ? '#ffffff' : 'rgba(226,240,252,.5)', 1.5);

      x.strokeStyle = rgba(a, on ? 0.8 : 0.3);
      x.beginPath();
      x.moveTo(sx - 26, y + bh / 2); x.lineTo(sx - 13, y + bh / 2);
      x.lineTo(sx - 13, sy + 17); x.lineTo(sx, sy + 17);
      x.stroke();
    }
  };

  /* SCRIBE: a playhead crosses a video, and the transcript writes
     itself behind it. Search happens first, so the bar fills in. */
  GLYPH.timeline = function (x, gx, gy, gw, gh, t, a) {
    var barX = gx + gw * 0.06, barW = gw * 0.88;
    var barY = gy + gh * 0.24;

    /* the found video, as a filmstrip */
    x.fillStyle = 'rgba(150,170,195,.14)';
    x.fillRect(barX, barY, barW, 40);
    for (var f = 0; f < 22; f++) {
      var fx = barX + f * (barW / 22);
      x.fillStyle = rgba(a, 0.1 + hash(f) * 0.3);
      x.fillRect(fx + 2, barY + 4, barW / 22 - 5, 32);
    }
    x.strokeStyle = rgba(a, 0.6); x.lineWidth = 1.4;
    x.strokeRect(barX, barY, barW, 40);

    var p = (t * 0.2) % 1;
    var head = barX + p * barW;

    /* progress */
    x.fillStyle = rgba(a, 0.22);
    x.fillRect(barX, barY, p * barW, 40);

    /* playhead */
    x.fillStyle = lift(a, 0.6);
    x.fillRect(head - 1.5, barY - 8, 3, 56);
    x.beginPath();
    x.moveTo(head - 7, barY - 8); x.lineTo(head + 7, barY - 8); x.lineTo(head, barY + 1);
    x.closePath(); x.fill();

    /* transcript, written as the head passes */
    var lines = [
      'the leaf absorbs light in the',
      'chloroplast, where water is',
      'split and carbon dioxide is'
    ];
    for (var i = 0; i < lines.length; i++) {
      var ly = barY + 78 + i * 27;
      var lineP = Math.max(0, Math.min(1, (p - i * 0.28) / 0.28));
      var shown = lines[i].slice(0, Math.floor(lineP * lines[i].length));
      x.font = '19px ' + F;
      x.fillStyle = 'rgba(150,170,195,.16)';
      x.fillText(lines[i], barX, ly);
      x.fillStyle = 'rgba(232,240,252,.9)';
      x.fillText(shown, barX, ly);
      if (lineP > 0 && lineP < 1) {
        var cw = x.measureText(shown).width;
        x.fillStyle = lift(a, 0.5);
        x.fillRect(barX + cw + 2, ly - 12, 9, 17);
      }
    }
  };

  /* PERSONA: five scoped characters, one live at a time, and a
     question outside the scope bouncing off. */
  GLYPH.masks = function (x, gx, gy, gw, gh, t, a) {
    var n = 5;
    var cw = 108, chh = 128;
    var gap = (gw * 0.86 - cw * n) / (n - 1);
    var x0 = gx + gw * 0.07;
    var y = gy + gh * 0.16;
    var active = Math.floor(t * 0.42) % n;
    var sub = (t * 0.42) % 1;

    for (var i = 0; i < n; i++) {
      var bx = x0 + i * (cw + gap);
      var on = i === active;
      var pop = on ? hold(sub, 0.12) : 0;
      var oy = y - pop * 10;

      x.fillStyle = on ? rgba(a, 0.3) : 'rgba(150,170,195,.08)';
      roundRect(x, bx, oy, cw, chh, 6); x.fill();
      x.strokeStyle = on ? rgba(a, 1) : 'rgba(150,170,195,.3)';
      x.lineWidth = on ? 2.2 : 1.2;
      roundRect(x, bx, oy, cw, chh, 6); x.stroke();

      /* a different abstract face per card, stable per index */
      var fx2 = bx + cw / 2, fy = oy + 50;
      x.strokeStyle = on ? lift(a, 0.5) : 'rgba(150,170,195,.34)';
      x.lineWidth = 2;
      x.beginPath(); x.arc(fx2, fy, 22, 0, Math.PI * 2); x.stroke();
      /* eyes */
      x.fillStyle = on ? lift(a, 0.5) : 'rgba(150,170,195,.34)';
      x.fillRect(fx2 - 11, fy - 7, 5, 5 + (i % 3) * 2);
      x.fillRect(fx2 + 6, fy - 7, 5, 5 + ((i + 1) % 3) * 2);
      /* a different mouth each */
      x.beginPath();
      if (i % 3 === 0) x.arc(fx2, fy + 4, 10, 0.15 * Math.PI, 0.85 * Math.PI);
      else if (i % 3 === 1) { x.moveTo(fx2 - 9, fy + 10); x.lineTo(fx2 + 9, fy + 10); }
      else x.arc(fx2, fy + 16, 10, 1.15 * Math.PI, 1.85 * Math.PI);
      x.stroke();

      x.fillStyle = on ? 'rgba(255,255,255,.9)' : 'rgba(150,170,195,.4)';
      x.font = '15px ' + F;
      var nm = ['CHEF', 'COACH', 'TUTOR', 'MEDIC', 'BARD'][i];
      x.fillText(nm, bx + (cw - x.measureText(nm).width) / 2, oy + chh - 18);
    }

    /* the out-of-scope question, refused */
    var refuse = sub > 0.55 ? (sub - 0.55) / 0.45 : 0;
    if (refuse > 0) {
      var rx = x0 + active * (cw + gap) + cw / 2;
      x.strokeStyle = 'rgba(255,90,90,' + (1 - refuse) * 0.9 + ')';
      x.lineWidth = 2.5;
      var rr2 = 16 + refuse * 26;
      x.beginPath(); x.arc(rx, y + chh + 26, rr2, 0, Math.PI * 2); x.stroke();
      x.beginPath();
      x.moveTo(rx - rr2 * 0.6, y + chh + 26 - rr2 * 0.6);
      x.lineTo(rx + rr2 * 0.6, y + chh + 26 + rr2 * 0.6);
      x.stroke();
    }
  };

  /* MIRAGE: noise resolving into a picture, then dissolving back.
     A diffusion model, drawn as the thing it literally is. */
  GLYPH.diffusion = function (x, gx, gy, gw, gh, t, a) {
    var cols = 34, rows = 17;
    /* 0.80 rather than the full box height: the step counter sits above the
       grid and the prompt below it, and both are inside the glyph clip. At
       full height the counter was clipped off the top entirely. */
    var cell = Math.min((gw * 0.5) / cols, (gh * 0.80) / rows);
    var w = cols * cell, h = rows * cell;
    var ox = gx + gw * 0.5 - w / 2, oy = gy + (gh - h) / 2;

    var cycle = 8;
    var p = (t % cycle) / cycle;
    /* resolve over the first 65%, hold, then re-noise */
    var clarity = p < 0.65 ? ease(p / 0.65) : 1 - ease((p - 0.65) / 0.35);

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c;
        /* the target picture: a horizon with a sun */
        var nx = c / cols, ny = r / rows;
        var sun = Math.hypot(nx - 0.66, ny - 0.34) < 0.13;
        var ground = ny > 0.62;
        var hill = ny > 0.62 - Math.sin(nx * Math.PI) * 0.16 && ny <= 0.62;
        var v = sun ? 1 : hill ? 0.55 : ground ? 0.25 : 0.08;

        var noise = hash(i + Math.floor(t * 11) * (1 - clarity) * 97);
        var val = v * clarity + noise * (1 - clarity);

        x.fillStyle = sun && clarity > 0.4
          ? rgba(a, 0.35 + val * 0.65)
          : 'rgba(' +
            Math.round(120 + val * 120) + ',' +
            Math.round(110 + val * 130) + ',' +
            Math.round(150 + val * 105) + ',' + (0.2 + val * 0.7) + ')';
        x.fillRect(ox + c * cell, oy + r * cell, cell - 1, cell - 1);
      }
    }

    x.strokeStyle = rgba(a, 0.6); x.lineWidth = 1.5;
    x.strokeRect(ox - 2, oy - 2, w + 3, h + 3);

    var steps = Math.round(clarity * 24);
    label(x, 'STEP ' + String(steps).padStart(2, '0') + '/24', 15,
      ox, oy - 12, rgba(a, 0.8), 1.5);
    label(x, '"a sunset over hills"', 15, ox, oy + h + 22, 'rgba(226,240,252,.55)', 0);
  };

  /* ANON MESH: a message propagating hop by hop across peers that are
     themselves joining and leaving. Churn is the whole design problem,
     so nodes really do drop out here. */
  GLYPH.gossip = function (x, gx, gy, gw, gh, t, a) {
    var N = 15;
    var nodes = [];
    for (var i = 0; i < N; i++) {
      nodes.push({
        x: gx + gw * (0.08 + hash(i) * 0.84),
        y: gy + gh * (0.1 + hash(i + 91) * 0.8),
        /* each peer has its own online/offline rhythm */
        up: Math.sin(t * 0.55 + hash(i + 40) * 6.5) > -0.55
      });
    }

    /* hop distance from the origin, recomputed as a simple BFS over
       whichever peers happen to be up this frame */
    var dist = new Array(N).fill(-1);
    dist[0] = 0;
    for (var pass = 0; pass < 5; pass++) {
      for (var u = 0; u < N; u++) {
        if (dist[u] < 0 || !nodes[u].up) continue;
        for (var v = 0; v < N; v++) {
          if (v === u || !nodes[v].up) continue;
          if (Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y) < gw * 0.26) {
            if (dist[v] < 0 || dist[v] > dist[u] + 1) dist[v] = dist[u] + 1;
          }
        }
      }
    }

    var wave = (t * 0.55) % 4.2;

    /* edges */
    for (var e = 0; e < N; e++) {
      if (!nodes[e].up) continue;
      for (var f = e + 1; f < N; f++) {
        if (!nodes[f].up) continue;
        var d = Math.hypot(nodes[e].x - nodes[f].x, nodes[e].y - nodes[f].y);
        if (d > gw * 0.26) continue;
        var carrying = dist[e] >= 0 && dist[f] >= 0 &&
          Math.abs(Math.min(dist[e], dist[f]) - wave) < 0.55;
        x.strokeStyle = carrying ? rgba(a, 0.95) : 'rgba(150,170,195,.16)';
        x.lineWidth = carrying ? 2.2 : 1;
        x.beginPath(); x.moveTo(nodes[e].x, nodes[e].y); x.lineTo(nodes[f].x, nodes[f].y); x.stroke();
      }
    }

    /* peers */
    for (var n = 0; n < N; n++) {
      var nd = nodes[n];
      if (!nd.up) {
        x.strokeStyle = 'rgba(150,170,195,.22)';
        x.lineWidth = 1;
        x.setLineDash([2, 3]);
        x.beginPath(); x.arc(nd.x, nd.y, 6, 0, Math.PI * 2); x.stroke();
        x.setLineDash([]);
        continue;
      }
      var reached = dist[n] >= 0 && dist[n] <= wave;
      var justNow = dist[n] >= 0 && Math.abs(dist[n] - wave) < 0.5;
      if (justNow) {
        x.fillStyle = rgba(a, 0.28);
        x.beginPath(); x.arc(nd.x, nd.y, 17, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = reached ? lift(a, justNow ? 0.55 : 0.1) : 'rgba(150,170,195,.42)';
      x.beginPath(); x.arc(nd.x, nd.y, n === 0 ? 9 : 6.5, 0, Math.PI * 2); x.fill();
    }

    label(x, 'GOSSIP · EIGENTRUST · CHURN', 15, gx + gw * 0.06, gy + gh - 2,
      rgba(a, 0.72), 1.6);
  };

  /* ONYOURWAY: two people on a campus map whose routes overlap, which
     is the entire premise of carpooling. */
  GLYPH.route = function (x, gx, gy, gw, gh, t, a) {
    /* street grid */
    x.strokeStyle = 'rgba(150,170,195,.11)';
    x.lineWidth = 1;
    for (var i = 1; i < 9; i++) {
      var lx = gx + (gw / 9) * i;
      x.beginPath(); x.moveTo(lx, gy); x.lineTo(lx, gy + gh); x.stroke();
    }
    for (var j = 1; j < 5; j++) {
      var ly = gy + (gh / 5) * j;
      x.beginPath(); x.moveTo(gx, ly); x.lineTo(gx + gw, ly); x.stroke();
    }

    /* the shared route, drawn as orthogonal legs like a real map */
    var pts = [
      [gx + gw * 0.08, gy + gh * 0.78],
      [gx + gw * 0.30, gy + gh * 0.78],
      [gx + gw * 0.30, gy + gh * 0.34],
      [gx + gw * 0.62, gy + gh * 0.34],
      [gx + gw * 0.62, gy + gh * 0.62],
      [gx + gw * 0.90, gy + gh * 0.62]
    ];

    x.strokeStyle = rgba(a, 0.28);
    x.lineWidth = 9; x.lineJoin = 'round'; x.lineCap = 'round';
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (var k = 1; k < pts.length; k++) x.lineTo(pts[k][0], pts[k][1]);
    x.stroke();

    /* total length, so the car moves at a constant speed through corners */
    var segs = [], total = 0;
    for (var s = 1; s < pts.length; s++) {
      var L = Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]);
      segs.push(L); total += L;
    }
    var p = (t * 0.16) % 1;
    var travelled = p * total, acc = 0, cxp = pts[0][0], cyp = pts[0][1];
    for (var q = 0; q < segs.length; q++) {
      if (travelled <= acc + segs[q]) {
        var fr = (travelled - acc) / segs[q];
        cxp = pts[q][0] + (pts[q + 1][0] - pts[q][0]) * fr;
        cyp = pts[q][1] + (pts[q + 1][1] - pts[q][1]) * fr;
        break;
      }
      acc += segs[q];
    }

    /* travelled portion, brighter */
    x.strokeStyle = rgba(a, 0.95);
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    var run = 0;
    for (var m = 1; m < pts.length; m++) {
      var segL = segs[m - 1];
      if (run + segL <= travelled) { x.lineTo(pts[m][0], pts[m][1]); run += segL; }
      else { x.lineTo(cxp, cyp); break; }
    }
    x.stroke();
    x.lineCap = 'butt'; x.lineJoin = 'miter';

    /* pins */
    [[pts[0], 'A'], [pts[pts.length - 1], 'B']].forEach(function (pin) {
      var px = pin[0][0], py = pin[0][1];
      x.fillStyle = rgba(a, 0.95);
      x.beginPath(); x.arc(px, py - 14, 11, Math.PI, 0); x.lineTo(px, py + 4); x.closePath(); x.fill();
      x.fillStyle = '#05070a';
      x.font = '14px ' + F;
      x.fillText(pin[1], px - 4, py - 11);
    });

    /* the car, plus the second rider it picks up */
    x.fillStyle = lift(a, 0.55);
    roundRect(x, cxp - 11, cyp - 8, 22, 16, 4); x.fill();
    x.fillStyle = '#05070a';
    x.fillRect(cxp - 6, cyp - 4, 5, 5);
    x.fillRect(cxp + 1, cyp - 4, 5, 5);

    var picked = p > 0.42;
    var rx = gx + gw * 0.30, ry = gy + gh * 0.34;
    if (!picked) {
      x.strokeStyle = rgba(a, 0.8); x.lineWidth = 2;
      x.beginPath(); x.arc(rx, ry - 18, 6, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(rx, ry - 12); x.lineTo(rx, ry - 1); x.stroke();
      var bob = Math.sin(t * 4) * 3;
      label(x, 'RIDER', 14, rx + 14, ry - 16 + bob, rgba(a, 0.85), 1.5);
    }
  };

  /* BSDI FTS: a file moving through departments, collecting a stamp at
     each desk. Government routing, made literal. */
  GLYPH.flow = function (x, gx, gy, gw, gh, t, a) {
    var depts = ['INTAKE', 'REVIEW', 'FINANCE', 'ARCHIVE'];
    var bw = 116, bh = 62;
    var gap = (gw * 0.84 - bw * 4) / 3;
    var x0 = gx + gw * 0.08;
    var y = gy + gh * 0.28;

    var cycle = 8;
    var p = (t % cycle) / cycle;
    var pos = p * 3.4;

    for (var i = 0; i < 4; i++) {
      var bx = x0 + i * (bw + gap);
      var here = pos >= i && pos < i + 1;
      var past = pos >= i + 1;

      x.fillStyle = here ? rgba(a, 0.3) : rgba(a, past ? 0.14 : 0.06);
      roundRect(x, bx, y, bw, bh, 4); x.fill();
      x.strokeStyle = rgba(a, here ? 1 : 0.4);
      x.lineWidth = here ? 2.2 : 1.3;
      roundRect(x, bx, y, bw, bh, 4); x.stroke();

      label(x, depts[i], 14, bx + 10, y + 20,
        here ? '#ffffff' : 'rgba(226,240,252,.55)', 1.5);

      /* a desk, so it reads as a place rather than a state */
      x.strokeStyle = rgba(a, here ? 0.85 : 0.3);
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(bx + 12, y + 44); x.lineTo(bx + bw - 12, y + 44);
      x.stroke();

      /* the stamp it applies, once the file has cleared */
      if (past) {
        x.strokeStyle = rgba(a, 0.8); x.lineWidth = 1.6;
        x.save();
        x.translate(bx + bw - 24, y + bh - 14);
        x.rotate(-0.18);
        x.strokeRect(-16, -8, 32, 16);
        label(x, 'OK', 12, -8, 1, rgba(a, 0.9), 1);
        x.restore();
      }

      if (i < 3) {
        x.strokeStyle = rgba(a, 0.45); x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(bx + bw, y + bh / 2); x.lineTo(bx + bw + gap - 6, y + bh / 2);
        x.lineTo(bx + bw + gap - 12, y + bh / 2 - 5);
        x.moveTo(bx + bw + gap - 6, y + bh / 2);
        x.lineTo(bx + bw + gap - 12, y + bh / 2 + 5);
        x.stroke();
      }
    }

    /* the file itself */
    if (pos < 4) {
      var seg = Math.floor(Math.min(3, pos)), fr = Math.min(1, pos - seg);
      var fx = x0 + seg * (bw + gap) + fr * (bw + gap) + bw / 2 - 13;
      var fy = y - 34 + Math.sin(p * Math.PI * 8) * 3;
      x.fillStyle = lift(a, 0.5);
      roundRect(x, fx, fy, 26, 32, 2); x.fill();
      x.fillStyle = 'rgba(5,7,10,.65)';
      for (var l = 0; l < 3; l++) x.fillRect(fx + 5, fy + 7 + l * 7, 16, 2);
    }
  };

  /* LLMS COMPARISON: the actual scoreboard, animating up to the real
     numbers. The tie at the top is the finding, so it is not hidden. */
  GLYPH.bars = function (x, gx, gy, gw, gh, t, a) {
    var rows = [
      ['CLAUDE OPUS 4.8', 9.0],
      ['DEEPSEEK-V3', 9.0],
      ['GEMINI 3 PRO', 8.75],
      ['GPT-5.2', 8.5],
      ['MISTRAL LARGE', 6.5]
    ];
    var maxW = gw * 0.46;
    var lx = gx + gw * 0.06;
    var bx = gx + gw * 0.40;
    var rh = 30;
    var y0 = gy + gh * 0.16;

    var grow = Math.min(1, ((t * 0.5) % 6) / 1.6);

    for (var i = 0; i < rows.length; i++) {
      var y = y0 + i * rh;
      var top = i < 2;

      label(x, rows[i][0], 15, lx, y + 11, top ? 'rgba(255,255,255,.92)' : 'rgba(226,240,252,.55)', 1.2);

      x.fillStyle = 'rgba(150,170,195,.1)';
      x.fillRect(bx, y + 2, maxW, 17);

      var w = (rows[i][1] / 10) * maxW * ease(Math.min(1, grow * 1.2 - i * 0.06));
      if (w > 0) {
        x.fillStyle = top ? rgba(a, 0.95) : rgba(a, 0.45);
        x.fillRect(bx, y + 2, w, 17);
      }

      label(x, rows[i][1].toFixed(2), 15, bx + maxW + 12, y + 11,
        top ? lift(a, 0.5) : 'rgba(226,240,252,.5)', 1);

      if (top) {
        label(x, '★', 16, lx - 18, y + 11, lift(a, 0.5), 0);
      }
    }

    label(x, '1 HALLUCINATION ACROSS 5 SUMMARIES', 15, lx, y0 + rows.length * rh + 20,
      rgba(a, 0.75), 1.6);
  };

  /* WEB SCRAPING: the finding was that a JS-rendered page separates the
     tools that download HTML from the ones that render. So: two panes,
     and only one of them fills. */
  GLYPH.scrape = function (x, gx, gy, gw, gh, t, a) {
    var pw = gw * 0.40, ph = gh * 0.78;
    var ax = gx + gw * 0.04, bx2 = gx + gw * 0.56;
    var y = gy + gh * 0.14;

    /* left: raw page */
    x.strokeStyle = 'rgba(150,170,195,.4)'; x.lineWidth = 1.4;
    x.strokeRect(ax, y, pw, ph);
    label(x, 'JS-RENDERED PAGE', 14, ax, y - 10, 'rgba(226,240,252,.55)', 1.4);

    var p = (t * 0.28) % 1;
    for (var i = 0; i < 9; i++) {
      var ly = y + 18 + i * 20;
      var appear = Math.max(0, Math.min(1, (p * 12 - i) / 1.5));
      x.fillStyle = 'rgba(150,170,195,' + (0.1 + appear * 0.35) + ')';
      x.fillRect(ax + 12, ly, (pw - 40) * (0.4 + hash(i) * 0.55) * appear, 7);
    }

    /* right: clean markdown, arriving only for the renderers */
    x.strokeStyle = rgba(a, 0.7); x.lineWidth = 1.4;
    x.strokeRect(bx2, y, pw, ph);
    label(x, 'CLEAN MARKDOWN', 14, bx2, y - 10, rgba(a, 0.85), 1.4);

    for (var j = 0; j < 9; j++) {
      var my = y + 18 + j * 20;
      var arrive = Math.max(0, Math.min(1, (p * 12 - j - 1.8) / 1.5));
      if (j % 4 === 0) {
        x.fillStyle = rgba(a, 0.35 + arrive * 0.6);
        x.fillRect(bx2 + 12, my, 13, 7);
        x.fillStyle = rgba(a, 0.2 + arrive * 0.5);
        x.fillRect(bx2 + 30, my, (pw - 58) * (0.35 + hash(j + 9) * 0.5) * arrive, 7);
      } else {
        x.fillStyle = rgba(a, 0.15 + arrive * 0.5);
        x.fillRect(bx2 + 12, my, (pw - 40) * (0.4 + hash(j + 9) * 0.55) * arrive, 7);
      }
    }

    /* the transfer */
    for (var k = 0; k < 3; k++) {
      var tp = ((t * 0.7 + k * 0.33) % 1);
      var tx = ax + pw + (bx2 - ax - pw) * tp;
      x.fillStyle = rgba(a, Math.sin(tp * Math.PI));
      x.fillRect(tx - 3, y + ph * 0.42 + k * 16, 7, 4);
    }
  };

  /* FRONTEND SHORTCUTS: the install that succeeds, and the one that
     quietly pulls a framework you are not using into your project. */
  GLYPH.registry = function (x, gx, gy, gw, gh, t, a) {
    var cw = gw * 0.86, chh = gh * 0.86;
    var cx = gx + gw * 0.07, cy = gy + gh * 0.07;

    /* terminal chrome */
    x.fillStyle = 'rgba(8,12,18,.72)';
    roundRect(x, cx, cy, cw, chh, 6); x.fill();
    x.strokeStyle = rgba(a, 0.55); x.lineWidth = 1.4;
    roundRect(x, cx, cy, cw, chh, 6); x.stroke();
    x.fillStyle = rgba(a, 0.18);
    roundRect(x, cx, cy, cw, 24, 6); x.fill();
    for (var d = 0; d < 3; d++) {
      x.fillStyle = rgba(a, 0.5);
      x.beginPath(); x.arc(cx + 14 + d * 14, cy + 12, 4, 0, Math.PI * 2); x.fill();
    }

    var cmd = '$ npx shadcn@latest add 21st.dev/hero';
    var cycle = 9;
    var p = (t % cycle) / cycle;
    var typed = Math.min(cmd.length, Math.floor(p * cmd.length * 3.4));

    x.font = '18px ' + F;
    x.fillStyle = 'rgba(232,240,252,.92)';
    x.fillText(cmd.slice(0, typed), cx + 14, cy + 46);
    if (typed < cmd.length && Math.sin(t * 9) > 0) {
      x.fillStyle = lift(a, 0.5);
      x.fillRect(cx + 14 + x.measureText(cmd.slice(0, typed)).width + 2, cy + 36, 9, 15);
    }

    /* files landing, one of which is the problem */
    var files = [
      ['+ components/hero.tsx', 0],
      ['+ components/marquee.tsx', 0],
      ['+ 39 more files', 0],
      ['+ imports next/dynamic', 1]
    ];
    for (var i = 0; i < files.length; i++) {
      var fy = cy + 76 + i * 26;
      var show = Math.max(0, Math.min(1, (p * 3.4 - 1.05 - i * 0.16) / 0.2));
      if (show <= 0) continue;
      var bad = files[i][1];
      x.globalAlpha = show;
      x.fillStyle = bad ? 'rgba(255,96,96,.95)' : rgba(a, 0.8);
      x.font = '17px ' + F;
      x.fillText(files[i][0], cx + 22, fy);
      if (bad) {
        x.fillStyle = 'rgba(255,96,96,.14)';
        x.fillRect(cx + 14, fy - 15, cw - 28, 22);
        x.fillStyle = 'rgba(255,96,96,.95)';
        x.fillText('✗', cx + 4, fy);
      }
      x.globalAlpha = 1;
    }

    var warn = p > 0.52;
    if (warn) {
      label(x, 'NOT A NEXT.JS PROJECT. NOTHING WARNED ME.', 15,
        cx + 14, cy + chh - 14, 'rgba(255,96,96,.8)', 1.4);
    }
  };

  /* ---------------------------------------------------------- */
  /* THE COVER ITSELF                                            */
  /* ---------------------------------------------------------- */

  /* One cached gradient per accent. Building a CanvasGradient is not
     free and there are only fourteen of them, so they are made once
     rather than sixty times a second. */
  var gradCache = {};
  function bedFor(ctx, accent, W, H) {
    if (gradCache[accent]) return gradCache[accent];
    var g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, rgba(accent, 0.30));
    g.addColorStop(0.55, rgba(accent, 0.09));
    g.addColorStop(1, 'rgba(4,7,11,.96)');
    gradCache[accent] = g;
    return g;
  }

  function paint(ctx, W, H, work, t) {
    var a = work.accent;

    /* --- bed ------------------------------------------------- */
    ctx.fillStyle = '#04070b';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bedFor(ctx, a, W, H);
    ctx.fillRect(0, 0, W, H);

    /* a slow diagonal sheen, so a static cover is never fully still */
    var sheen = ((t * 0.06) % 1) * 2 - 0.5;
    var sg = ctx.createLinearGradient(sheen * W - 300, 0, sheen * W + 300, H);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,.035)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

    /* --- boxart frame ---------------------------------------- */
    var pad = 26;
    ctx.strokeStyle = rgba(a, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    ctx.strokeStyle = rgba(a, 0.18);
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 7, pad + 7, W - pad * 2 - 14, H - pad * 2 - 14);

    /* corner ticks, a UMD case detail, and they anchor the frame */
    ctx.strokeStyle = lift(a, 0.35);
    ctx.lineWidth = 3;
    [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]]
      .forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0] + 22 * c[2], c[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0], c[1] + 22 * c[3]);
        ctx.stroke();
      });

    /* --- the glyph ------------------------------------------- */
    ctx.textBaseline = 'middle';
    var g = GLYPH[work.glyph];
    if (g) {
      ctx.save();
      /* clipped so a glyph can never scribble over the type below it */
      ctx.beginPath();
      ctx.rect(pad + 10, 74, W - pad * 2 - 20, 236);
      ctx.clip();
      g(ctx, pad + 30, 82, W - pad * 2 - 60, 220, t, a, work);
      ctx.restore();
    }

    /* --- corner stamp, top right ------------------------------
       The project's own category, not who commissioned it. */
    var stamp = work.kind;
    var sw = trackedWidth(ctx, stamp, 15, 2.4) + 20;
    ctx.fillStyle = rgba(a, 0.85);
    ctx.fillRect(W - pad - 12 - sw, pad + 14, sw, 24);
    label(ctx, stamp, 15, W - pad - 12 - sw + 10, pad + 26, '#05070a', 2.4);

    /* --- title ----------------------------------------------- */
    ctx.textBaseline = 'alphabetic';
    var titleY = 372;
    ctx.font = '54px ' + F;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = rgba(a, 0.75);
    ctx.shadowBlur = 22;
    ctx.fillText(work.title, 58, titleY);
    ctx.shadowBlur = 0;

    /* year, riding the baseline of the title. The category moved up to the
       corner stamp, so repeating it here would say it twice. */
    var tw = ctx.measureText(work.title).width;
    label(ctx, work.year, 16, 58 + tw + 22, titleY - 4, rgba(a, 0.9), 2);

    /* --- tagline --------------------------------------------- */
    ctx.font = '22px ' + F;
    ctx.fillStyle = 'rgba(226,240,252,.72)';
    ctx.fillText(work.tagline, 58, titleY + 32);

    /* --- tech tags ------------------------------------------- */
    var tx = 58, ty = titleY + 74;
    for (var i = 0; i < work.tech.length; i++) {
      var label2 = work.tech[i];
      ctx.font = '15px ' + F;
      var w2 = ctx.measureText(label2).width + 20;
      if (tx + w2 > W - 150) break;              // never collide with the pips
      ctx.strokeStyle = rgba(a, 0.5);
      ctx.lineWidth = 1;
      roundRect(ctx, tx, ty - 15, w2, 24, 3);
      ctx.stroke();
      ctx.fillStyle = 'rgba(226,240,252,.66)';
      ctx.fillText(label2, tx + 10, ty + 1);
      tx += w2 + 9;
    }

    /* --- the disc state --------------------------------------
       Right-aligned off measured text, not off a magic left offset: at
       15px the old constant put the last two glyphs of PRESS START
       outside the boxart frame. */
    var edge = W - pad - 14;
    if (work.live) {
      var msg = 'PRESS START';
      var mw = trackedWidth(ctx, msg, 15, 1.8);
      var pulse = 0.55 + 0.45 * Math.sin(t * 3);
      label(ctx, msg, 15, edge - mw, titleY - 10, 'rgba(70,230,140,.9)', 1.8);
      ctx.fillStyle = 'rgba(70,230,140,' + pulse + ')';
      ctx.beginPath(); ctx.arc(edge - mw - 15, titleY - 14, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      var vs = 'VIEW SOURCE';
      var vw = trackedWidth(ctx, vs, 15, 1.8);
      ctx.save();
      ctx.translate(edge - 118, titleY - 20);
      ctx.rotate(-0.13);
      ctx.strokeStyle = 'rgba(226,240,252,.36)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -20, 126, 34);
      label(ctx, 'NO DISC', 19, 2, 2, 'rgba(226,240,252,.5)', 2.6);
      ctx.restore();
      label(ctx, vs, 15, edge - vw, titleY + 30, 'rgba(226,240,252,.4)', 1.8);
    }

    ctx.textBaseline = 'middle';
  }

  window.SJ_COVERS = { paint: paint, glyphs: GLYPH };
})();
