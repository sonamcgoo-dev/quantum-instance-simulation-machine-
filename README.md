[README.md](https://github.com/user-attachments/files/26047059/README.md)
# wave-cell-visualizer-offline
q.s.i.m
# Wave Cell Visualizer

Interactive browser-based wave and cell-field visualization with rotating cube dynamics, pseudo-tesseract projection, saved presets, thumbnails, and offline export.

![Demo preview](assets/demo.gif)

## What this is

This project is a **fun speculative simulation** and visualization toy for exploring a hypothetical computing framework built from many local cells. Each local state is influenced by neighboring cells in a sheet / field, while the overall system presents a larger pulse pattern.

It is meant to act as a bridge between two very different instincts:

- **Plato-style abstraction** — models, forms, structure, symbolic framing
- **Diogenes-style contact** — observation, friction, direct interaction, material behavior

The point is not to claim a finished scientific model. The point is to make the idea playable, visible, and discussable.

## What it does

The system renders two contrasting behaviors side by side:

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

## What it is not

This repository is **not** a validated physical simulation, psychological instrument, or finished scientific framework.

Current purpose:

- visualize a hypothetical framework
- compare parameter states quickly
- support discussion and iteration
- package the idea into something people can actually open and use

## Features

- **Interactive camera** with mouse or touch drag
- **Preset system** with built-in modes and custom saved modes
- **Preset gallery** with thumbnail previews
- **Tags and filtering** for browsing saved configurations
- **Import / export** preset library as JSON
- **Mode badge** that classifies the current state
- **Offline bundle** with local GIF export dependencies

## Quick start

### Requirements

You only need:

- a modern desktop browser
- optional: Python 3 for a simple local server

No npm install. No build step. No external runtime required.

### Run locally

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

## Why this exists

A lot of ideas die because they stay too abstract for practical people and too unstructured for theoretical people.

This project tries to sit in the middle:

- abstract enough to suggest a framework
- concrete enough to poke, drag, record, compare, and argue with

## Current status

Current release target: **v0.1.0**

This is a conceptual visualization and interaction tool, not a finalized physical simulation.

## Known rough edges

- export can be heavier on weaker hardware
- very large saved preset libraries may increase localStorage usage
- the implementation is still being cleaned up for public-facing presentation

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
