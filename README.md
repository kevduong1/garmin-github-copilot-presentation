# GitHub Copilot & LLMs — Garmin Tech Talk

An HTML slide deck. Each slide is its own file so multiple people can work on
slides in parallel without merge conflicts.

## Layout

```
index.html          Shell — fonts, stage, nav chrome. Rarely needs editing.
assets/deck.css     Shared theme + slide styles (Garmin brand tokens).
assets/deck.js      Slide loader, keyboard/wheel/touch nav, edit mode.
slides/manifest.js  Ordered list of slide files — defines deck order.
slides/NN-*.html    One file per slide.
```

## Working on a slide

Edit only your own `slides/NN-your-slide.html`. Each file contains a single
`<section class="slide">…</section>` fragment (no `<html>`/`<head>`/`<body>`).

To add a new slide:

1. Copy an existing slide file, e.g. `cp slides/02-contents.html slides/03-my-topic.html`.
2. Add `'03-my-topic.html'` to `slides/manifest.js` in the position you want.

`slides/manifest.js` is the only file two authors might both touch — conflicts
there are one-line and trivial to resolve.

Slide-specific styles can go in a `<style>` block inside your slide file
(prefix selectors with a class unique to your slide so they don't leak).
Shared/reusable styles belong in `assets/deck.css`.

## Previewing locally

Slides are loaded with `fetch()`, so you need a local HTTP server — opening
`index.html` directly via `file://` will not work:

```
npx serve            # or: python3 -m http.server 8000
```

Then open the printed URL (e.g. http://localhost:3000).

## Presenting

- **→ / ← / space / scroll / swipe** — navigate
- **E** — toggle inline edit mode (edits save to *your browser's* localStorage
  only; copy real changes back into the slide file)
- **Home / End** — first / last slide
