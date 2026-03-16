# wave-cell-visualizer-offline
q.s.i.m
# Wave Cell Visualizer

Interactive browser-based wave and cell-field visualization with rotating cube dynamics, pseudo-tesseract projection, saved presets, thumbnails, and offline export.

![Demo preview](assets/demo.gif)

## What it does

This project explores a conceptual field model built from many local cells responding to a global pulse. The system renders two opposing behaviors side by side:

- **Expansion / diffuse mode**
- **Reflect / collapse mode**

It also includes:

- rotating cube-field rendering
- pseudo-tesseract projection
- residual memory / trace behavior
- diagnostic waveform strip
- preset save/load with thumbnails
- preset tags and filtering
- PNG snapshot export
- WebM recording
- GIF export
- fully offline bundled GIF library

## Features

- **Interactive camera** with mouse or touch drag
- **Preset system** with built-in modes and custom saved modes
- **Preset gallery** with thumbnail previews
- **Tags and filtering** for browsing saved configurations
- **Import / export** preset library as JSON
- **Mode badge** that classifies the current state
- **Offline bundle** with local GIF export dependencies

## Project structure

```text
wave-cell-visualizer/
├── index.html
├── styles.css
├── app.js
├── README.md
├── NOTICE.txt
├── LICENSE-UPSTREAM.txt
└── vendor/
    ├── gif.js
    ├── gif.worker.js
    └── LICENSE-gif.js.optimized.txt
```

## Run locally

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- adjust cell count, speed, memory, coupling, contrast, expansion weight, and collapse weight
- switch projection modes
- drag the main canvas to rotate the view
- save named presets with tags
- browse saved presets visually
- export PNG, WebM, GIF, or preset JSON

## GitHub Pages

This repository is designed to run as a static site on GitHub Pages with no build step.

## Attribution

This project includes waveform visualization ideas inspired by:

**waveform-visualizer**  
by **Chris Weber**

Upstream license information is preserved in:

- `NOTICE.txt`
- `LICENSE-UPSTREAM.txt`

This repository also bundles a local copy of `gif.js.optimized` for offline GIF export. Its bundled license is included in:

- `vendor/LICENSE-gif.js.optimized.txt`

## Status

Current release target: **v0.1.0**

This is a conceptual visualization and interaction tool, not a finalized physical simulation.
