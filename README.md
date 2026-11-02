# Mahavishnu E — Portfolio

A cinematic, scroll-driven personal portfolio for **Mahavishnu E**, a frontend web developer based in Nagercoil, Tamil Nadu. Built with plain HTML, CSS and JavaScript — no frameworks, no build step.

**Live site:** https://vishnu-e-11.vercel.app

---

## Highlights

- **Scroll-controlled video background.** A 240-frame image sequence is painted onto a full-screen `<canvas>` and tied to scroll position. The final frame lands exactly when the footer's top edge enters the viewport, then holds through the footer. There is no extra scroll space below it.
- **Fully animated page, not just the background.** Split-letter hero entrance, staggered pop-in for cards and badges, a timeline that draws itself as you scroll, count-up stats, a skills marquee, parallax glows, cursor-lit cards and a scroll progress bar.
- **Six live client websites** showcased with screenshots, key features and links.
- **Tech-stack icons** on every skill and project badge.
- **Two pages** with a shared design: `index.html` (landing) and `projects.html` (full project details).
- **Responsive and accessible.** Works from phone to desktop, with a skip link, keyboard focus styles, semantic landmarks, and a mobile menu that supports `Esc`.
- **Respects `prefers-reduced-motion`.** Visitors who ask for less motion get a static background and fully visible content.

## Tech

| Area | Details |
| --- | --- |
| Markup | Semantic HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox, `clamp()`), no preprocessor |
| Behaviour | Vanilla JavaScript — `requestAnimationFrame`, `IntersectionObserver`, Canvas 2D |
| Icons | [Devicon](https://devicon.dev) and [Simple Icons](https://simpleicons.org) via jsDelivr (degrades to text if blocked) |
| Fonts | System font stack — nothing to download |
| Hosting | Vercel (static) |

## Project structure

```text
portfolio-site/
├── index.html          Landing page: hero, experience, skills, projects, contact
├── projects.html       Detailed project cards
├── styles.css          Base design system, layout, components
├── animations.css      Scroll/entrance animations, project showcase, icons
├── script.js           Canvas sequence, UI, reveal animations, icons
├── vercel.json         Cache and security headers for Vercel
├── resume.pdf          Downloadable resume
├── frames/             frame_001.jpg … frame_240.jpg (background sequence)
└── images/             Project screenshots
```

## Run locally

The site loads images through the canvas, so it must be served over HTTP — opening `index.html` directly from disk will not work.

```bash
cd portfolio-site
python -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works (`npx serve`, VS Code Live Server, etc.).

## Configure the image sequence

All settings live in `FRAME_CONFIG` at the top of [`script.js`](script.js):

```js
const FRAME_CONFIG = {
  count: 240,                                   // total number of frames
  path: (n) => `frames/frame_${String(n).padStart(3, '0')}.jpg`, // n is 1-based
  smoothing: 0.14,                              // 0–1; lower = floatier, 1 = instant
  reducedMotionFrame: 240,                      // frame shown when motion is reduced
  loadBatch: 8,                                 // frames fetched in parallel
  watermark: { x: 0.906, y: 0.833, r: 0.05 },   // soft patch over a corner watermark; null to disable
};
```

To use your own footage, extract frames with [ffmpeg](https://ffmpeg.org) (16:9 works best) and update `count`:

```bash
mkdir frames
ffmpeg -i your-video.mp4 -q:v 4 -start_number 1 frames/frame_%03d.jpg
```

Missing or failed frames are skipped gracefully — the nearest loaded frame is shown instead.

> **Cache note:** `vercel.json` caches `/frames/*` for a year. If you replace the frames, put them in a new folder (for example `frames-v2/`) and update `path`, otherwise returning visitors keep the old ones.

## Customise content

| To change… | Edit… |
| --- | --- |
| Name, tagline, bio, contact details | `index.html` |
| Experience, skills, education | `index.html` (`#experience`, `#skills`) |
| Add a project | Copy a card in `index.html` (`.project-tile`) and `projects.html` (`.project-split`); add a screenshot to `images/` |
| Colours, spacing | CSS variables at the top of `styles.css` |
| Animation timing and order | `rules` list in the *Page animations* section of `script.js` |
| Add a tech icon | `ICONS` map at the bottom of `script.js` |

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel choose **Add New → Project** and import the repo.
3. Set **Framework Preset** to **Other**. Leave the build command and output directory empty.
4. Deploy. Every push to `main` redeploys automatically.

`vercel.json` adds long-lived caching for the frames, a short cache for screenshots, and basic security headers.

## Featured projects

Client websites built at Artic9:

| Project | Site |
| --- | --- |
| Theosis Health & Care — wellness equipment retailer | https://theosis.in |
| Sudha Saseendran Siddha Medical College | https://sudhasaseendransiddha.org.in |
| PIPES N TILES — sanitaryware and tiles retailer | https://pipesntiles.in |
| Corpus Christi School — ICSE school | https://ccs.edu.in |
| Spacey Interiors — architecture and interior design | https://spacey.in |
| Emmanuel Inn — homestay in Kodaikanal | https://emmanuelinn.com |

The client sites, their names, logos and the screenshots in `images/` belong to their respective owners and are shown only to demonstrate my work.

## Accessibility and performance

- Skip-to-content link, visible focus outlines, `aria-expanded` on the mobile menu, and decorative elements hidden from assistive tech.
- Content stays readable with JavaScript disabled or reduced motion enabled.
- The first frame loads immediately and the rest stream in small batches, so the page is usable before the whole sequence has downloaded.
- Canvas rendering is coordinated with `requestAnimationFrame`, and layout is re-measured on resize and content changes.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. The animation layer uses the individual `translate` and `scale` CSS properties, which require reasonably recent browsers; older browsers still show the content.

## Contact

- **Email:** mahavish1411@gmail.com
- **LinkedIn:** [Maha Vishnu](https://www.linkedin.com/in/maha-vishnu-68766635a)
- **GitHub:** [@mahavish1411-cyber](https://github.com/mahavish1411-cyber)
- **Location:** Nagercoil, Tamil Nadu, India

## License

© Mahavishnu E. All rights reserved. This repository is a personal portfolio; please don't reuse the content, photos or video frames without permission.
