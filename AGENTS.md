# Garmin GitHub Copilot & LLMs Presentation

An HTML slide deck (fixed 1920×1080 stage). Each slide is its own file so
multiple people can work in parallel without merge conflicts.

## Architecture

```
index.html          Shell — fonts, stage container, nav chrome. Rarely edited.
assets/deck.css     Shared theme + slide styles (Garmin brand tokens).
assets/deck.js      Slide loader, keyboard/wheel/touch nav, inline edit mode.
slides/manifest.js  Ordered list of slide files — defines deck order.
slides/NN-*.html    One file per slide.
```

At load, `assets/deck.js` fetches every file listed in `window.SLIDES`
(`slides/manifest.js`) and injects them into `#deckStage` in order. Slide
count, nav dots, and the counter are all derived from what loads — nothing
else needs updating when slides are added or removed.

## Adding a new slide

1. Create `slides/NN-short-name.html` (NN = two-digit position, e.g.
   `03-what-is-copilot.html`). Easiest: copy an existing slide as a starting
   point.
2. Add the filename to `slides/manifest.js` in the position it should appear.

That's it — do not touch `index.html` or `assets/deck.js`.

A slide file contains exactly one fragment — no `<html>`, `<head>`, or
`<body>`:

```html
<!-- ========== NN · SLIDE TITLE ========== -->
<section class="slide">
  <div class="brand"><svg class="delta" viewBox="0 0 44 40"><path d="M22 2 42 38H2L22 2Z" fill="#007cc3"/></svg><span class="wm">GARMIN</span></div>
  <div class="pad">
    ...content...
  </div>
</section>
```

## Working on an existing slide

- Edit only your own `slides/NN-*.html`; don't reformat or restructure other
  slides in the same change.
- Reusable classes live in `assets/deck.css`: `.kicker`, `.h2`, `.h-hero`,
  `.lead`, `.body`, `.date`, `.blue`, `.rule`, `.hair`, `.reveal` (staggered
  entrance animation), `.stagger` (animates children), `.center` (on the
  `<section>` to center content), agenda rows (`.agenda`/`.arow`).
- Slide-specific styles go in a `<style>` block inside your slide file.
  Prefix every selector with a class unique to your slide (e.g.
  `.s-copilot .chart {…}` with `class="slide s-copilot"`) so they can't leak
  into other slides. Shared/reusable styles belong in `assets/deck.css`.
- The stage is a fixed 1920×1080 canvas that scales to fit the window —
  design in absolute pixels at that size; no responsive breakpoints needed.
- `<script>` tags inside slide files will NOT execute (injected via
  innerHTML). Slide-level interactivity belongs in `assets/deck.js`.

## Design conventions

- Grayscale palette; Garmin blue (`var(--blue)`, #007cc3) only as a sparing
  accent — the delta mark, thin rules, one highlighted word.
- Headlines: condensed uppercase (`.h2` / `.h-hero`, Archivo Narrow).
  Labels/dates/code: JetBrains Mono (`.kicker`, `.date`). Body: Archivo.
- Every slide carries the brand mark (see fragment template above) —
  `.brand lg` on the cover, plain `.brand` elsewhere.

## Previewing

Slides load via `fetch()`, so a local HTTP server is required (`file://`
won't work):

```
npx serve            # or: python3 -m http.server 8000
```

Verify a change by loading the deck in a browser and navigating to the
affected slide (→/← keys). A red banner at the top means a slide file
failed to load — usually a manifest typo.

Deployed on Vercel; `vercel dev` also works locally.
