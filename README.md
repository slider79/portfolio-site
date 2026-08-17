# Portfolio: Shuja Jamal

A static portfolio built around a real-time 3D PSP you can operate. Every
project I have shipped is a cartridge; the d-pad browses them, ✕ launches the
deployment, ○ opens the source.

**Live:** _add the Vercel URL here after the first deploy_

No build step, no framework, no bundler. Open `index.html` off any static
server and it runs.

---

## The machine

`js/psp.js` loads `assets/models/psp.glb`, re-derives the model's orientation
from the screen plane rather than trusting the export, and replaces the screen
material with a CRT shader (pixel grid, scanlines, phosphor mask, barrel warp,
chromatic split). The screen is the scene's main light source: its average
colour is read back a few times a second and drives three point lights, so a
green cover really does throw green light across the shell.

### Covers, not video

The design this is based on played a short video clip per slot. This one draws
its screen instead. `js/covers.js` composes every cartridge at runtime onto the
960×544 screen canvas: a gradient bed in the project's accent, an animated
diagram of what that project actually does, then title, tagline, tech tags and
disc state.

That is the whole reason there are no media files here. Fourteen animated
covers cost a few KB of code; fourteen clips cost megabytes and a decode per
frame.

Each glyph is a pure function of elapsed time, so a cover looks identical
whether it was just opened or has been running for an hour.

### Controls

| Input | Does |
| :--- | :--- |
| ◀ ▶ / d-pad, arrow keys | previous / next cartridge |
| ✕, START, the screen, Enter | open the live deployment |
| ○ | open the GitHub repo |
| △ | jump to that project's write-up |
| □ / SELECT / HOME | scroll to About |
| drag | spin the machine; it springs back |

Undeployed projects show a `NO DISC` stamp and ✕ falls through to source, so
no button is ever inert.

---

## Adding a project

Append to `window.SJ_WORKS` in [`js/data.js`](js/data.js). Everything else
(the cartridge, the pip row, the card in the work rail, the △ jump target)
derives from that array. Nothing is duplicated in the HTML.

```js
{
  id: 'thing',              // also the DOM id of its card: #p-thing
  title: 'Thing',
  tagline: 'One line, lower case',
  org: 'SPIRAL LABS',       // or PERSONAL / WORK, printed as the corner stamp
  kind: 'RAG',
  year: '2026',
  accent: '#5b57ef',        // drives the cover AND the light it casts
  glyph: 'vectors',         // a renderer in js/covers.js
  live: 'https://…',        // null gives it the NO DISC stamp
  repo: 'https://github.com/…',
  tech: ['Python', 'Groq'],
  blurb: 'A paragraph for the card in the work rail.'
}
```

To draw a new glyph, add a function to `GLYPH` in `js/covers.js`. It is handed
`(ctx, x, y, w, h, t, accent, work)` and must draw inside that box; the caller
clips to it. Diagram the mechanism, not the category.

## Swapping the hero cut-out

Last line of `js/data.js`:

```js
window.SJ_HERO_CUTOUT = 'cards';   // or 'dice'
```

Whichever one the hero does not take goes to the contact section, so no artwork
is used twice and none goes unused.

## Music

There is no audio file in the repo and the toggle stays hidden. Drop an
`assets/audio/theme.mp3` you have the rights to and the control appears on its
own, defaulting to off.

---

## Layout systems

Two, deliberately, and they do not mix:

- **Composed** sections (hero, machine, about, contact) sit on a 16:9 `.stage`
  with coordinates in percent. Art-directed: they scale rather than reflow.
- **Flowed** sections (work rail, history, stack) use a centred `.wrap`.
  Prose and cards have no comp to honour and should rewrap.

A `.lay` inside a `.wrap` will not position, and a percentage coordinate
outside a `.stage` has nothing to resolve against.

## Motion trackers

`js/track.js` draws hairline contour trackers welded to each cut-out.
Silhouettes for the original PNGs are baked into `js/contours.js`. Anything
added later gets traced at load from its own artwork by radial sampling: cast
rays from the centroid, keep the furthest solid pixel along each. The cut-outs
are dark ink on opaque white rather than alpha cut-outs (CSS does the cutting
out with invert + screen), so the tracer keys on darkness when an image is
fully opaque and on alpha when it is not.

Drop a new `.png` or `.svg` in `assets/el/`, position it with a class, and it
gets a tracker with no build step.

> Authoring SVG cut-outs: no double hyphens anywhere in an XML comment. It is
> illegal, and the file then fails to parse as a silent broken image with no
> console error naming the cause.

## Reduced motion

`prefers-reduced-motion` stops the cover animating (it paints once per
selection), turns the pinned horizontal rail into an ordinary vertical list,
freezes the trackers, and drops the scramble, skew and parallax.

---

## Local

Any static server over the repo root:

```bash
npx serve .
```

`file://` does **not** work. It gives every image an opaque origin, which
taints the canvas the contour tracer reads, so the cut-outs silently lose
their motion trackers.

## Credits

The 3D machine, the CRT treatment, the boot sequence, the tracking overlay and
the collage cut-outs are adapted from
[shutterkif-oss.github.io](https://github.com/shutterkif-oss/shutterkif-oss.github.io).
