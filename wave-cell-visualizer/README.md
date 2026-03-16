# Wave Cell Expansion–Collapse Visualizer

A browser-based visualization project for exploring:

- distributed cell-based wave propagation
- expansion and collapse state contrast
- residual memory in local cells
- rotating cube-field rendering
- pseudo-tesseract projection
- waveform diagnostic history
- PNG, WebM, and GIF export
- mouse-driven camera control
- saved presets with thumbnails
- tags, tag filtering, duplicate, rename, import, and export

## Attribution

This project includes waveform visualization ideas inspired by:

**waveform-visualizer**  
https://github.com/chrisweb/waveform-visualizer

Author: **Chris Weber**

The upstream project is licensed under the **MIT License**.

If any upstream code is reused or substantially adapted, preserve the original
license notice and attribution in distributed copies.

## Files

- `index.html` — app shell and CDN script loading
- `styles.css` — layout and visual style
- `app.js` — simulation, rendering, preset management, export tools, and controls
- `NOTICE.txt` — upstream credit block
- `LICENSE-UPSTREAM.txt` — upstream MIT license notice
- `vendor/gif.js` — bundled local GIF encoder
- `vendor/gif.worker.js` — bundled local GIF worker
- `vendor/LICENSE-gif.js.optimized.txt` — bundled library notice

## Running

Open `index.html` in a browser.

For best results, serve it locally with a tiny web server:

```bash
python -m http.server 8000
```

Then open:

```bash
http://localhost:8000
```

## Export

- **Save PNG** exports a single composite frame
- **Start WebM** records a video
- **Start GIF** captures frames and renders an animated GIF
- **Export Presets** saves your preset library as JSON
- **Import Presets** restores presets from JSON

## Presets

Built-in presets:
- Fun speed
- Stress speed
- Calm memory
- Sharp collapse

Saved presets support:
- thumbnails
- tags
- filtering by tag or text
- duplicate
- rename
- delete
- import/export

## Notes

GIF export uses a bundled local copy of `gif.js.optimized` in `vendor/`, so the project runs offline after download. See `vendor/LICENSE-gif.js.optimized.txt` for the bundled library notice.
