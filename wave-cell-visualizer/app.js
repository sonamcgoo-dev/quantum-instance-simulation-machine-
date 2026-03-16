/* =====================================================================
   Wave / Cell Visualization System

   This project includes waveform visualization ideas inspired by:

   waveform-visualizer
   https://github.com/chrisweb/waveform-visualizer

   Author:
   Chris Weber

   License:
   MIT License

   Keep upstream attribution and license notice if upstream code or
   substantial adapted portions are distributed.

   Additional systems in this file are original additions, including:
   - rotating cube cell fields
   - pseudo-tesseract projection
   - coupled wave propagation
   - residual memory dynamics
   - diagnostic waveform strip
   - PNG / WebM / GIF export
   - mouse-driven camera control
   - preset system
   - localStorage save/load presets
   - separate expansion / collapse weighting
   - live mode badge
   - preset thumbnail gallery
   - preset export/import
   - preset tags and tag filtering
   ===================================================================== */

const STORAGE_KEY = 'waveCellVisualizer.savedPresets.v4';

const canvasExpand = document.getElementById('canvasExpand');
const canvasCollapse = document.getElementById('canvasCollapse');
const canvasWave = document.getElementById('canvasWave');

const ctxExpand = canvasExpand.getContext('2d');
const ctxCollapse = canvasCollapse.getContext('2d');
const ctxWave = canvasWave.getContext('2d');

const ui = {
  presetSelect: document.getElementById('presetSelect'),
  savedPresetSelect: document.getElementById('savedPresetSelect'),
  presetNameInput: document.getElementById('presetNameInput'),
  presetTagsInput: document.getElementById('presetTagsInput'),
  savePresetBtn: document.getElementById('savePresetBtn'),
  deletePresetBtn: document.getElementById('deletePresetBtn'),
  exportPresetsBtn: document.getElementById('exportPresetsBtn'),
  importPresetsBtn: document.getElementById('importPresetsBtn'),
  importPresetsInput: document.getElementById('importPresetsInput'),

  modeBadge: document.getElementById('modeBadge'),
  modeHint: document.getElementById('modeHint'),
  presetGallery: document.getElementById('presetGallery'),
  presetTagChips: document.getElementById('presetTagChips'),
  galleryFilterInput: document.getElementById('galleryFilterInput'),
  clearGalleryFilterBtn: document.getElementById('clearGalleryFilterBtn'),

  gridSize: document.getElementById('gridSize'),
  speed: document.getElementById('speed'),
  memory: document.getElementById('memory'),
  coupling: document.getElementById('coupling'),
  rotation: document.getElementById('rotation'),
  contrast: document.getElementById('contrast'),
  expandWeight: document.getElementById('expandWeight'),
  collapseWeight: document.getElementById('collapseWeight'),
  projection: document.getElementById('projection'),
  toggleRun: document.getElementById('toggleRun'),
  resetBtn: document.getElementById('resetBtn'),
  snapshotBtn: document.getElementById('snapshotBtn'),
  recordBtn: document.getElementById('recordBtn'),
  gifBtn: document.getElementById('gifBtn'),
  statusText: document.getElementById('statusText'),

  gridSizeVal: document.getElementById('gridSizeVal'),
  speedVal: document.getElementById('speedVal'),
  memoryVal: document.getElementById('memoryVal'),
  couplingVal: document.getElementById('couplingVal'),
  rotationVal: document.getElementById('rotationVal'),
  contrastVal: document.getElementById('contrastVal'),
  expandWeightVal: document.getElementById('expandWeightVal'),
  collapseWeightVal: document.getElementById('collapseWeightVal')
};

const PRESETS = {
  custom: null,
  fun: {
    n: 12,
    speed: 0.9,
    memory: 0.82,
    coupling: 0.11,
    rotation: 0.5,
    contrast: 0.9,
    expandWeight: 1.35,
    collapseWeight: 0.72,
    projection: 'iso',
    camera: { basePitch: 0.48, baseYaw: 0.65 }
  },
  stress: {
    n: 14,
    speed: 1.7,
    memory: 0.70,
    coupling: 0.26,
    rotation: 1.1,
    contrast: 1.8,
    expandWeight: 0.72,
    collapseWeight: 1.55,
    projection: 'tesseract',
    camera: { basePitch: 0.72, baseYaw: 1.10 }
  },
  calm: {
    n: 10,
    speed: 0.5,
    memory: 0.92,
    coupling: 0.08,
    rotation: 0.3,
    contrast: 0.8,
    expandWeight: 1.10,
    collapseWeight: 0.62,
    projection: 'iso',
    camera: { basePitch: 0.40, baseYaw: 0.55 }
  },
  sharp: {
    n: 16,
    speed: 1.2,
    memory: 0.60,
    coupling: 0.22,
    rotation: 0.9,
    contrast: 2.1,
    expandWeight: 0.82,
    collapseWeight: 1.72,
    projection: 'front',
    camera: { basePitch: 0.60, baseYaw: 0.95 }
  }
};

const state = {
  n: 12,
  speed: 1.0,
  memory: 0.78,
  coupling: 0.16,
  rotation: 0.7,
  contrast: 1.2,
  expandWeight: 1.0,
  collapseWeight: 1.0,
  projection: 'iso',
  running: true,
  t: 0,

  expandField: null,
  collapseField: null,
  tempExpand: null,
  tempCollapse: null,

  historyExpand: [],
  historyCollapse: [],
  historyResidual: [],

  recorder: null,
  recordedChunks: [],
  compositeCanvas: null,
  compositeCtx: null,

  gifRecorder: {
    active: false,
    gif: null,
    frameIntervalMs: 100,
    lastCaptureTime: 0,
    maxFrames: 80,
    frameCount: 0,
    rendering: false
  },

  camera: {
    basePitch: 0.55,
    baseYaw: 0.8,
    dragPitch: 0.0,
    dragYaw: 0.0,
    isDragging: false,
    lastX: 0,
    lastY: 0
  },

  savedPresets: {},
  activeSavedPresetName: '',
  galleryFilterTag: '',
  galleryFilterText: ''
};

function setStatus(text) {
  ui.statusText.textContent = text;
}

function sanitizePresetName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

function sanitizeTag(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

function parseTagsInput(text) {
  const raw = String(text || '').split(',');
  const out = [];
  const seen = new Set();

  for (const item of raw) {
    const tag = sanitizeTag(item);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }

  return out.slice(0, 12);
}

function formatTagsForInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function resizeCanvas(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(2, Math.floor(rect.width * dpr));
  canvas.height = Math.max(2, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createField(n) {
  return new Float32Array(n * n * n);
}

function idx(x, y, z, n) {
  return x + y * n + z * n * n;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getSerializableState() {
  return {
    n: state.n,
    speed: state.speed,
    memory: state.memory,
    coupling: state.coupling,
    rotation: state.rotation,
    contrast: state.contrast,
    expandWeight: state.expandWeight,
    collapseWeight: state.collapseWeight,
    projection: state.projection,
    camera: {
      basePitch: state.camera.basePitch,
      baseYaw: state.camera.baseYaw
    }
  };
}

function normalizeSavedPresetRecord(record) {
  if (!record) return null;

  if (record.config) {
    return {
      config: record.config,
      thumbnail: record.thumbnail || '',
      createdAt: Number(record.createdAt || Date.now()),
      tags: Array.isArray(record.tags) ? record.tags.map(sanitizeTag).filter(Boolean) : []
    };
  }

  return {
    config: record,
    thumbnail: '',
    createdAt: Date.now(),
    tags: []
  };
}

function applySerializableState(config) {
  if (!config) return;

  state.n = Number(config.n);
  state.speed = Number(config.speed);
  state.memory = Number(config.memory);
  state.coupling = Number(config.coupling);
  state.rotation = Number(config.rotation);
  state.contrast = Number(config.contrast);
  state.expandWeight = Number(config.expandWeight ?? 1.0);
  state.collapseWeight = Number(config.collapseWeight ?? 1.0);
  state.projection = String(config.projection);

  const camera = config.camera || {};
  state.camera.basePitch = Number(camera.basePitch ?? 0.55);
  state.camera.baseYaw = Number(camera.baseYaw ?? 0.8);
  state.camera.dragPitch = 0;
  state.camera.dragYaw = 0;

  syncControlsFromState();
}

function savePresetsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedPresets));
  } catch (err) {
    console.error(err);
    setStatus('Could not save presets');
  }
}

function loadPresetsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state.savedPresets = {};

    for (const [name, record] of Object.entries(parsed)) {
      const normalized = normalizeSavedPresetRecord(record);
      if (normalized) state.savedPresets[name] = normalized;
    }
  } catch (err) {
    console.error(err);
    state.savedPresets = {};
    setStatus('Could not load presets');
  }
}

function capturePresetThumbnail() {
  drawCompositeForExport();

  const src = state.compositeCanvas;
  const thumb = document.createElement('canvas');
  const ratio = src.height / src.width;
  thumb.width = 320;
  thumb.height = Math.max(180, Math.round(320 * ratio));

  const tctx = thumb.getContext('2d');
  tctx.fillStyle = '#070707';
  tctx.fillRect(0, 0, thumb.width, thumb.height);
  tctx.drawImage(src, 0, 0, thumb.width, thumb.height);

  return thumb.toDataURL('image/jpeg', 0.82);
}

function buildPresetRecord() {
  return {
    config: getSerializableState(),
    thumbnail: capturePresetThumbnail(),
    createdAt: Date.now(),
    tags: parseTagsInput(ui.presetTagsInput.value)
  };
}

function formatPresetSummary(config) {
  const ex = Number(config.expandWeight ?? 1).toFixed(2);
  const co = Number(config.collapseWeight ?? 1).toFixed(2);
  return `E ${ex} · C ${co} · ${config.projection}`;
}

function buildPresetExportPayload() {
  return {
    app: 'wave-cell-visualizer',
    version: 1,
    exportedAt: Date.now(),
    presets: state.savedPresets
  };
}

function downloadTextFile(filename, text, mimeType = 'application/json') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportSavedPresets() {
  const names = Object.keys(state.savedPresets);
  if (!names.length) {
    setStatus('No saved presets to export');
    return;
  }

  const payload = buildPresetExportPayload();
  const text = JSON.stringify(payload, null, 2);
  downloadTextFile(`wave-cell-presets-${Date.now()}.json`, text);
  setStatus(`Exported ${names.length} preset${names.length === 1 ? '' : 's'}`);
}

function mergeImportedPresets(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid preset file');
  }

  const imported = payload.presets;
  if (!imported || typeof imported !== 'object') {
    throw new Error('Preset file missing presets object');
  }

  let count = 0;
  for (const [name, record] of Object.entries(imported)) {
    const cleanName = sanitizePresetName(name);
    if (!cleanName) continue;

    const normalized = normalizeSavedPresetRecord(record);
    if (!normalized) continue;

    state.savedPresets[cleanName] = normalized;
    count++;
  }

  savePresetsToStorage();
  refreshSavedPresetDropdown();
  setStatus(`Imported ${count} preset${count === 1 ? '' : 's'}`);
}

async function importPresetsFromFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    mergeImportedPresets(payload);
  } catch (err) {
    console.error(err);
    setStatus('Could not import preset file');
  } finally {
    ui.importPresetsInput.value = '';
  }
}

function markCustomPreset() {
  ui.presetSelect.value = 'custom';
}

function syncControlsFromState() {
  ui.gridSize.value = String(state.n);
  ui.speed.value = String(state.speed);
  ui.memory.value = String(state.memory);
  ui.coupling.value = String(state.coupling);
  ui.rotation.value = String(state.rotation);
  ui.contrast.value = String(state.contrast);
  ui.expandWeight.value = String(state.expandWeight);
  ui.collapseWeight.value = String(state.collapseWeight);
  ui.projection.value = state.projection;
  updateReadouts();
}

function getModeSignature() {
  const diff = state.expandWeight - state.collapseWeight;
  const absDiff = Math.abs(diff);
  const highContrast = state.contrast >= 1.45;
  const lowContrast = state.contrast <= 0.95;
  const highMemory = state.memory >= 0.86;
  const highSpeed = state.speed >= 1.35;

  if (absDiff < 0.12) {
    if (highContrast) {
      return { label: 'BALANCED-TENSE', hint: 'matched weights with elevated collapse tension' };
    }
    if (highMemory) {
      return { label: 'BALANCED-MEMORY', hint: 'matched weights with strong residual persistence' };
    }
    return { label: 'BALANCED', hint: 'equal expansion and collapse emphasis' };
  }

  if (diff > 0) {
    if (highMemory && lowContrast) {
      return { label: 'CALM-MEMORY', hint: 'expansion-led mode with soft retention and long residue' };
    }
    if (highSpeed) {
      return { label: 'SURGE-DIFFUSE', hint: 'expansion-led mode with faster outward pressure' };
    }
    return { label: 'FUN-DIFFUSE', hint: 'expansion-led mode with softer outward glow' };
  }

  if (highContrast && highSpeed) {
    return { label: 'STRESS-SHADOW', hint: 'collapse-led mode with strong shadowing and fast turnover' };
  }

  if (highContrast) {
    return { label: 'SHARP-COLLAPSE', hint: 'collapse-led mode with hard edge definition' };
  }

  return { label: 'COLLAPSE-LEAN', hint: 'collapse-led mode with restrained expansion' };
}

function updateModeBadge() {
  if (!ui.modeBadge || !ui.modeHint) return;

  const mode = getModeSignature();
  ui.modeBadge.textContent = mode.label;
  ui.modeHint.textContent = mode.hint;

  const funLike = state.expandWeight >= state.collapseWeight;

  if (mode.label.includes('BALANCED')) {
    ui.modeBadge.style.background = 'rgba(255,255,255,0.08)';
    ui.modeBadge.style.borderColor = 'rgba(255,255,255,0.20)';
    ui.modeBadge.style.color = '#f2f2f2';
    return;
  }

  if (funLike) {
    ui.modeBadge.style.background = 'rgba(120,220,255,0.14)';
    ui.modeBadge.style.borderColor = 'rgba(120,220,255,0.34)';
    ui.modeBadge.style.color = 'rgb(190,240,255)';
  } else {
    ui.modeBadge.style.background = 'rgba(255,120,120,0.14)';
    ui.modeBadge.style.borderColor = 'rgba(255,120,120,0.34)';
    ui.modeBadge.style.color = 'rgb(255,210,210)';
  }
}

function updateReadouts() {
  ui.gridSizeVal.textContent = String(state.n);
  ui.speedVal.textContent = state.speed.toFixed(1);
  ui.memoryVal.textContent = state.memory.toFixed(2);
  ui.couplingVal.textContent = state.coupling.toFixed(2);
  ui.rotationVal.textContent = state.rotation.toFixed(1);
  ui.contrastVal.textContent = state.contrast.toFixed(1);
  ui.expandWeightVal.textContent = state.expandWeight.toFixed(2);
  ui.collapseWeightVal.textContent = state.collapseWeight.toFixed(2);
  ui.toggleRun.textContent = state.running ? 'Pause' : 'Play';
  ui.recordBtn.textContent =
    state.recorder && state.recorder.state === 'recording' ? 'Stop WebM' : 'Start WebM';
  ui.gifBtn.textContent =
    state.gifRecorder.active ? 'Stop GIF' : 'Start GIF';

  updateModeBadge();
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;

  applySerializableState(preset);
  resetSimulation();
  setStatus(`Preset: ${name}`);
}

function refreshSavedPresetDropdown(selectedName = '') {
  ui.savedPresetSelect.innerHTML = '<option value="">Saved presets</option>';

  const names = Object.keys(state.savedPresets).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    ui.savedPresetSelect.appendChild(opt);
  }

  if (selectedName && state.savedPresets[selectedName]) {
    ui.savedPresetSelect.value = selectedName;
  }

  renderTagFilterChips();
  renderPresetGallery();
}

function updateGalleryFiltersFromUi() {
  state.galleryFilterText = String(ui.galleryFilterInput.value || '').trim().toLowerCase();
}

function getAllSavedTags() {
  const all = new Set();
  for (const record of Object.values(state.savedPresets)) {
    const normalized = normalizeSavedPresetRecord(record);
    for (const tag of normalized.tags) all.add(tag);
  }
  return [...all].sort((a, b) => a.localeCompare(b));
}

function renderTagFilterChips() {
  if (!ui.presetTagChips) return;

  ui.presetTagChips.innerHTML = '';

  const tags = getAllSavedTags();
  if (!tags.length) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'presetTagChip' + (state.galleryFilterTag === '' ? ' active' : '');
  allBtn.textContent = 'all';
  allBtn.addEventListener('click', () => {
    state.galleryFilterTag = '';
    renderTagFilterChips();
    renderPresetGallery();
  });
  ui.presetTagChips.appendChild(allBtn);

  for (const tag of tags) {
    const btn = document.createElement('button');
    btn.className = 'presetTagChip' + (state.galleryFilterTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      state.galleryFilterTag = state.galleryFilterTag === tag ? '' : tag;
      renderTagFilterChips();
      renderPresetGallery();
    });
    ui.presetTagChips.appendChild(btn);
  }
}

function doesPresetMatchFilters(name, record) {
  const text = state.galleryFilterText;
  const tag = state.galleryFilterTag;
  const lcName = name.toLowerCase();
  const tags = Array.isArray(record.tags) ? record.tags : [];

  const textMatch =
    !text ||
    lcName.includes(text) ||
    tags.some((t) => t.includes(text));

  const tagMatch =
    !tag ||
    tags.includes(tag);

  return textMatch && tagMatch;
}

function renderPresetGallery() {
  if (!ui.presetGallery) return;

  updateGalleryFiltersFromUi();
  ui.presetGallery.innerHTML = '';

  const names = Object.keys(state.savedPresets)
    .sort((a, b) => {
      const aa = state.savedPresets[a]?.createdAt || 0;
      const bb = state.savedPresets[b]?.createdAt || 0;
      return bb - aa;
    });

  const filtered = names.filter((name) => {
    const record = normalizeSavedPresetRecord(state.savedPresets[name]);
    return record && doesPresetMatchFilters(name, record);
  });

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'presetThumbPlaceholder';
    empty.textContent = 'NO MATCHING PRESETS';
    ui.presetGallery.appendChild(empty);
    return;
  }

  for (const name of filtered) {
    const record = normalizeSavedPresetRecord(state.savedPresets[name]);
    const config = record.config;

    const card = document.createElement('div');
    card.className = 'presetCard';
    if (state.activeSavedPresetName === name) {
      card.classList.add('active');
    }

    card.addEventListener('click', () => loadSavedPreset(name));

    if (record.thumbnail) {
      const img = document.createElement('img');
      img.className = 'presetThumb';
      img.src = record.thumbnail;
      img.alt = `${name} preset thumbnail`;
      card.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'presetThumbPlaceholder';
      ph.textContent = 'NO THUMB';
      card.appendChild(ph);
    }

    const meta = document.createElement('div');
    meta.className = 'presetMeta';

    const title = document.createElement('div');
    title.className = 'presetName';
    title.textContent = name;
    meta.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'presetSub';
    sub.textContent = formatPresetSummary(config);
    meta.appendChild(sub);

    if (record.tags && record.tags.length) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'presetTags';

      for (const tag of record.tags) {
        const el = document.createElement('span');
        el.className = 'presetTag';
        el.textContent = tag;
        tagsWrap.appendChild(el);
      }

      meta.appendChild(tagsWrap);
    }

    const row = document.createElement('div');
    row.className = 'presetRow';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'presetMiniBtn';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      loadSavedPreset(name);
    });

    const renameBtn = document.createElement('button');
    renameBtn.className = 'presetMiniBtn';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renameSavedPreset(name);
    });

    const tagsBtn = document.createElement('button');
    tagsBtn.className = 'presetMiniBtn';
    tagsBtn.textContent = 'Tags';
    tagsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editSavedPresetTags(name);
    });

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'presetMiniBtn';
    duplicateBtn.textContent = 'Duplicate';
    duplicateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateSavedPreset(name);
    });

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'presetMiniBtn';
    refreshBtn.textContent = 'Update Thumb';
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updatePresetThumbnail(name);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'presetMiniBtn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSavedPreset(name);
    });

    row.appendChild(loadBtn);
    row.appendChild(renameBtn);
    row.appendChild(tagsBtn);
    row.appendChild(duplicateBtn);
    row.appendChild(refreshBtn);
    row.appendChild(delBtn);

    meta.appendChild(row);
    card.appendChild(meta);
    ui.presetGallery.appendChild(card);
  }
}

function saveCurrentPresetToStorage() {
  const name = sanitizePresetName(ui.presetNameInput.value);
  if (!name) {
    setStatus('Enter a preset name');
    return;
  }

  state.savedPresets[name] = buildPresetRecord();
  state.activeSavedPresetName = name;
  savePresetsToStorage();
  refreshSavedPresetDropdown(name);
  ui.savedPresetSelect.value = name;
  setStatus(`Saved preset: ${name}`);
}

function loadSavedPreset(name) {
  const record = normalizeSavedPresetRecord(state.savedPresets[name]);
  if (!record) {
    setStatus('Saved preset not found');
    return;
  }

  applySerializableState(record.config);
  ui.presetNameInput.value = name;
  ui.presetTagsInput.value = formatTagsForInput(record.tags);
  ui.presetSelect.value = 'custom';
  ui.savedPresetSelect.value = name;
  state.activeSavedPresetName = name;
  resetSimulation();
  renderPresetGallery();
  setStatus(`Loaded preset: ${name}`);
}

function deleteSavedPreset(name) {
  if (!name || !state.savedPresets[name]) {
    setStatus('Select a saved preset');
    return;
  }

  delete state.savedPresets[name];
  savePresetsToStorage();
  refreshSavedPresetDropdown();

  if (ui.presetNameInput.value.trim() === name) {
    ui.presetNameInput.value = '';
    ui.presetTagsInput.value = '';
  }

  if (state.activeSavedPresetName === name) {
    state.activeSavedPresetName = '';
  }

  setStatus(`Deleted preset: ${name}`);
}

function duplicateSavedPreset(name) {
  const record = normalizeSavedPresetRecord(state.savedPresets[name]);
  if (!record) {
    setStatus('Saved preset not found');
    return;
  }

  let baseName = `${name} copy`;
  let newName = baseName;
  let i = 2;

  while (state.savedPresets[newName]) {
    newName = `${baseName} ${i}`;
    i++;
  }

  state.savedPresets[newName] = {
    config: JSON.parse(JSON.stringify(record.config)),
    thumbnail: record.thumbnail || '',
    createdAt: Date.now(),
    tags: Array.isArray(record.tags) ? [...record.tags] : []
  };

  state.activeSavedPresetName = newName;
  savePresetsToStorage();
  refreshSavedPresetDropdown(newName);
  ui.presetNameInput.value = newName;
  ui.presetTagsInput.value = formatTagsForInput(state.savedPresets[newName].tags);
  ui.savedPresetSelect.value = newName;
  setStatus(`Duplicated preset: ${newName}`);
}

function renameSavedPreset(oldName) {
  const record = normalizeSavedPresetRecord(state.savedPresets[oldName]);
  if (!record) {
    setStatus('Saved preset not found');
    return;
  }

  const proposed = window.prompt('Rename preset:', oldName);
  const newName = sanitizePresetName(proposed);

  if (!newName) {
    setStatus('Rename cancelled');
    return;
  }

  if (newName === oldName) {
    setStatus('Preset name unchanged');
    return;
  }

  if (state.savedPresets[newName]) {
    setStatus('A preset with that name already exists');
    return;
  }

  delete state.savedPresets[oldName];
  state.savedPresets[newName] = {
    config: JSON.parse(JSON.stringify(record.config)),
    thumbnail: record.thumbnail || '',
    createdAt: Date.now(),
    tags: Array.isArray(record.tags) ? [...record.tags] : []
  };

  if (state.activeSavedPresetName === oldName) {
    state.activeSavedPresetName = newName;
  }

  savePresetsToStorage();
  refreshSavedPresetDropdown(newName);
  ui.presetNameInput.value = newName;
  ui.presetTagsInput.value = formatTagsForInput(state.savedPresets[newName].tags);
  ui.savedPresetSelect.value = newName;
  setStatus(`Renamed preset: ${oldName} → ${newName}`);
}

function editSavedPresetTags(name) {
  const record = normalizeSavedPresetRecord(state.savedPresets[name]);
  if (!record) {
    setStatus('Saved preset not found');
    return;
  }

  const current = formatTagsForInput(record.tags);
  const proposed = window.prompt('Edit tags (comma separated):', current);
  if (proposed === null) {
    setStatus('Tag edit cancelled');
    return;
  }

  record.tags = parseTagsInput(proposed);
  record.createdAt = Date.now();
  state.savedPresets[name] = record;

  if (state.activeSavedPresetName === name) {
    ui.presetTagsInput.value = formatTagsForInput(record.tags);
  }

  savePresetsToStorage();
  refreshSavedPresetDropdown(name);
  setStatus(`Updated tags: ${name}`);
}

function updatePresetThumbnail(name) {
  const record = state.savedPresets[name];
  if (!record) {
    setStatus('Saved preset not found');
    return;
  }

  record.thumbnail = capturePresetThumbnail();
  record.createdAt = Date.now();
  state.savedPresets[name] = normalizeSavedPresetRecord(record);
  savePresetsToStorage();
  refreshSavedPresetDropdown(name);
  state.activeSavedPresetName = name;
  setStatus(`Updated thumbnail: ${name}`);
}

function radiusPulse(r, t, speed) {
  const w = 0.5 + 0.5 * Math.sin((r * 11.5) - (t * 2.8 * speed));
  return Math.pow(w, 2.4);
}

function angularBias(nx, ny, nz, t) {
  const a = Math.sin(t * 0.7 + nx * 5.0);
  const b = Math.cos(t * 0.9 + ny * 4.6);
  const c = Math.sin(t * 0.5 + nz * 3.2);
  return (a + b + c) / 3;
}

function pageFlip(nx, ny, nz, t) {
  return Math.sign(Math.sin(t * 1.45 + (nx - ny + nz) * 7.5));
}

function sourceTargets(nx, ny, nz, t) {
  const r = Math.sqrt(nx * nx + ny * ny + nz * nz) * 1.92;
  const base = radiusPulse(r, t, state.speed);
  const bias = angularBias(nx, ny, nz, t);
  const polar = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
  const flip = pageFlip(nx, ny, nz, t);

  let expandTarget = clamp(
    base * (1.0 - 0.42 * polar) +
    0.14 * ((bias + 1) * 0.5) +
    0.08 * (flip > 0 ? 1 : 0),
    0, 1
  );

  let collapseTarget = clamp(
    Math.pow(1.0 - base, 1.0 / state.contrast) * (0.38 + 0.92 * polar) +
    0.14 * (flip < 0 ? 1 : 0) +
    0.06 * (1.0 - ((bias + 1) * 0.5)),
    0, 1
  );

  expandTarget = clamp(expandTarget * state.expandWeight, 0, 1);
  collapseTarget = clamp(collapseTarget * state.collapseWeight, 0, 1);

  return { expandTarget, collapseTarget };
}

function neighborAverage(field, x, y, z, n) {
  let sum = 0;
  let count = 0;
  const neighbors = [
    [ 1, 0, 0], [-1, 0, 0],
    [ 0, 1, 0], [ 0,-1, 0],
    [ 0, 0, 1], [ 0, 0,-1]
  ];

  for (const [dx, dy, dz] of neighbors) {
    const xx = x + dx;
    const yy = y + dy;
    const zz = z + dz;
    if (xx >= 0 && yy >= 0 && zz >= 0 && xx < n && yy < n && zz < n) {
      sum += field[idx(xx, yy, zz, n)];
      count++;
    }
  }

  return count ? (sum / count) : 0;
}

function stepFields() {
  const n = state.n;
  const mem = state.memory;
  const coup = state.coupling;
  const t = state.t;

  let sumExpand = 0;
  let sumCollapse = 0;
  let sumResidual = 0;

  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = idx(x, y, z, n);
        const nx = x / (n - 1) - 0.5;
        const ny = y / (n - 1) - 0.5;
        const nz = z / (n - 1) - 0.5;

        const { expandTarget, collapseTarget } = sourceTargets(nx, ny, nz, t);
        const expNeighbors = neighborAverage(state.expandField, x, y, z, n);
        const colNeighbors = neighborAverage(state.collapseField, x, y, z, n);

        const expDriven = lerp(expandTarget, expNeighbors, coup);
        const colDriven = lerp(collapseTarget, colNeighbors, coup);

        const expPrev = state.expandField[i];
        const colPrev = state.collapseField[i];

        const expNext = clamp(expPrev * mem + expDriven * (1 - mem), 0, 1);
        const colNext = clamp(colPrev * mem + colDriven * (1 - mem), 0, 1);

        state.tempExpand[i] = expNext;
        state.tempCollapse[i] = colNext;

        sumExpand += expNext;
        sumCollapse += colNext;
        sumResidual += Math.abs(expNext - colNext);
      }
    }
  }

  const swapE = state.expandField;
  const swapC = state.collapseField;
  state.expandField = state.tempExpand;
  state.collapseField = state.tempCollapse;
  state.tempExpand = swapE;
  state.tempCollapse = swapC;

  const total = n * n * n;
  state.historyExpand.push(sumExpand / total);
  state.historyCollapse.push(sumCollapse / total);
  state.historyResidual.push(sumResidual / total);

  const maxLen = Math.max(180, Math.floor(canvasWave.clientWidth));
  if (state.historyExpand.length > maxLen) state.historyExpand.shift();
  if (state.historyCollapse.length > maxLen) state.historyCollapse.shift();
  if (state.historyResidual.length > maxLen) state.historyResidual.shift();
}

function rotate3D(x, y, z, ax, ay) {
  const cosY = Math.cos(ay), sinY = Math.sin(ay);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(ax), sinX = Math.sin(ax);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

function getCameraAngles(time) {
  const autoPitch = state.camera.basePitch + time * 0.12 * state.rotation;
  const autoYaw = state.camera.baseYaw + time * 0.16 * state.rotation;

  return {
    pitch: autoPitch + state.camera.dragPitch,
    yaw: autoYaw + state.camera.dragYaw
  };
}

function projectPoint(nx, ny, nz, w, h, mode, time) {
  if (mode === 'front') {
    return {
      x: w * 0.5 + nx * (Math.min(w, h) * 0.64),
      y: h * 0.5 + ny * (Math.min(w, h) * 0.64),
      depth: nz
    };
  }

  const cam = getCameraAngles(time);
  const rot = rotate3D(nx, ny, nz, cam.pitch, cam.yaw);

  if (mode === 'tesseract') {
    const outerScale = Math.min(w, h) * 0.32;
    const innerScale = outerScale * 0.62;
    const offsetX = rot.z * outerScale * 0.40;
    const offsetY = rot.z * outerScale * 0.34;

    const outerX = w * 0.5 + rot.x * outerScale;
    const outerY = h * 0.52 + rot.y * outerScale;

    const innerX = w * 0.5 + rot.x * innerScale + offsetX;
    const innerY = h * 0.52 + rot.y * innerScale + offsetY;

    return {
      x: lerp(outerX, innerX, (rot.z + 1) * 0.5),
      y: lerp(outerY, innerY, (rot.z + 1) * 0.5),
      depth: rot.z
    };
  }

  const scale = Math.min(w, h) * 0.34;
  const perspective = 1.0 / (1.8 - rot.z * 0.55);
  return {
    x: w * 0.5 + rot.x * scale * perspective,
    y: h * 0.52 + rot.y * scale * perspective,
    depth: rot.z
  };
}

function drawFrameGuides(ctx, canvas, mode, time) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;

  if (mode === 'front') {
    const s = Math.min(w, h) * 0.64;
    ctx.strokeRect(w * 0.5 - s * 0.5, h * 0.5 - s * 0.5, s, s);
  } else {
    const corners = [
      [-0.5,-0.5,-0.5], [0.5,-0.5,-0.5], [0.5,0.5,-0.5], [-0.5,0.5,-0.5],
      [-0.5,-0.5, 0.5], [0.5,-0.5, 0.5], [0.5,0.5, 0.5], [-0.5,0.5, 0.5]
    ];

    const pts = corners.map(([x,y,z]) => projectPoint(x, y, z, w, h, mode, time));
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];

    ctx.beginPath();
    for (const [a, b] of edges) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function getWaveStyle() {
  const funLike = state.expandWeight >= state.collapseWeight;

  return {
    expandFill: funLike ? 'rgba(120,220,255,0.20)' : 'rgba(255,210,120,0.18)',
    collapseFill: funLike ? 'rgba(255,150,120,0.24)' : 'rgba(255,110,110,0.28)',
    residualStroke: funLike ? 'rgba(255,255,255,0.78)' : 'rgba(255,240,180,0.82)',

    expandText: funLike ? 'expansion envelope · diffuse / fun' : 'expansion envelope · restrained',
    collapseText: funLike ? 'collapse envelope · soft counter' : 'collapse envelope · stress / shadow',
    residualText: funLike ? 'residual divergence · memory trace' : 'residual divergence · high tension'
  };
}

function getFieldStyle(modeLabel, value, polar) {
  const funLike = state.expandWeight >= state.collapseWeight;

  if (modeLabel === 'expand') {
    return {
      radius: 0.6 + value * (funLike ? 5.4 : 4.2) + (1 - polar) * 0.6,
      fill: funLike
        ? `rgba(120,220,255,${(0.03 + value * 0.48).toFixed(4)})`
        : `rgba(255,220,150,${(0.03 + value * 0.34).toFixed(4)})`
    };
  }

  const alpha = (0.04 + value * (funLike ? 0.54 : 0.74)) * (0.58 + polar * 0.85);
  const radius = 0.5 + value * (funLike ? 2.4 : 3.2) + polar * 0.4;

  return {
    radius,
    fill: funLike
      ? `rgba(255,150,120,${alpha.toFixed(4)})`
      : `rgba(255,110,110,${alpha.toFixed(4)})`
  };
}

function drawField(ctx, canvas, field, modeLabel) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, Math.min(w, h) * 0.52);
  grad.addColorStop(0, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  drawFrameGuides(ctx, canvas, state.projection, state.t);

  const pts = [];
  const n = state.n;

  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = idx(x, y, z, n);
        const v = field[i];
        const nx = x / (n - 1) - 0.5;
        const ny = y / (n - 1) - 0.5;
        const nz = z / (n - 1) - 0.5;
        const p = projectPoint(nx, ny, nz, w, h, state.projection, state.t);

        pts.push({ x: p.x, y: p.y, z: p.depth, v, nx, ny, nz });
      }
    }
  }

  pts.sort((a, b) => a.z - b.z);

  for (const p of pts) {
    const polar = Math.max(Math.abs(p.nx), Math.abs(p.ny), Math.abs(p.nz));
    const style = getFieldStyle(modeLabel, p.v, polar);

    let radius = style.radius;
    if (state.projection === 'tesseract') {
      radius *= 0.92 + (p.z + 1) * 0.08;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.fill;
    ctx.fill();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.15);
  ctx.lineTo(w * 0.5, h * 0.85);
  ctx.moveTo(w * 0.17, h * 0.5);
  ctx.lineTo(w * 0.83, h * 0.5);
  ctx.stroke();

  const cam = getCameraAngles(state.t);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px Arial';
  ctx.fillText(`pitch ${cam.pitch.toFixed(2)}  yaw ${cam.yaw.toFixed(2)}`, 12, h - 12);
  ctx.restore();
}

function drawWaveSeries(ctx, arr, width, yMid, amp, fillStyle, fillMirror, strokeStyle = null) {
  if (arr.length < 2) return;
  const step = width / Math.max(1, arr.length - 1);

  ctx.beginPath();
  for (let i = 0; i < arr.length; i++) {
    const x = i * step;
    const y = yMid - arr[i] * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  if (fillMirror) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const x = i * step;
      const y = yMid + arr[i] * amp;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  } else {
    ctx.strokeStyle = strokeStyle || fillStyle;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawWavePanel() {
  const w = canvasWave.clientWidth;
  const h = canvasWave.clientHeight;
  const style = getWaveStyle();

  ctxWave.clearRect(0, 0, w, h);
  ctxWave.fillStyle = 'rgba(255,255,255,0.02)';
  ctxWave.fillRect(0, 0, w, h);

  ctxWave.strokeStyle = 'rgba(255,255,255,0.12)';
  ctxWave.lineWidth = 1;
  ctxWave.beginPath();
  ctxWave.moveTo(0, h * 0.50);
  ctxWave.lineTo(w, h * 0.50);
  ctxWave.moveTo(0, h * 0.25);
  ctxWave.lineTo(w, h * 0.25);
  ctxWave.moveTo(0, h * 0.75);
  ctxWave.lineTo(w, h * 0.75);
  ctxWave.stroke();

  drawWaveSeries(ctxWave, state.historyExpand, w, h * 0.28, h * 0.19, style.expandFill, true);
  drawWaveSeries(ctxWave, state.historyCollapse, w, h * 0.72, h * 0.19, style.collapseFill, true);
  drawWaveSeries(ctxWave, state.historyResidual, w, h * 0.50, h * 0.18, style.residualStroke, false, style.residualStroke);

  ctxWave.fillStyle = 'rgba(255,255,255,0.78)';
  ctxWave.font = '12px Arial';
  ctxWave.fillText(style.expandText, 12, 18);
  ctxWave.fillText(style.residualText, 12, h * 0.50 - 8);
  ctxWave.fillText(style.collapseText, 12, h - 10);

  const legendX = Math.max(12, w - 170);
  const box = 12;

  ctxWave.fillStyle = style.expandFill;
  ctxWave.fillRect(legendX, 12, box, box);
  ctxWave.strokeStyle = 'rgba(255,255,255,0.25)';
  ctxWave.strokeRect(legendX, 12, box, box);

  ctxWave.fillStyle = style.collapseFill;
  ctxWave.fillRect(legendX, 30, box, box);
  ctxWave.strokeRect(legendX, 30, box, box);

  ctxWave.strokeStyle = style.residualStroke;
  ctxWave.beginPath();
  ctxWave.moveTo(legendX, 54 + box / 2);
  ctxWave.lineTo(legendX + box, 54 + box / 2);
  ctxWave.stroke();

  ctxWave.fillStyle = 'rgba(255,255,255,0.68)';
  ctxWave.fillText('expand', legendX + 18, 22);
  ctxWave.fillText('collapse', legendX + 18, 40);
  ctxWave.fillText('residual', legendX + 18, 60);
}

function ensureCompositeCanvas() {
  if (!state.compositeCanvas) {
    state.compositeCanvas = document.createElement('canvas');
    state.compositeCtx = state.compositeCanvas.getContext('2d');
  }
}

function drawCompositeForExport() {
  ensureCompositeCanvas();

  const w = Math.max(canvasExpand.width, canvasCollapse.width);
  const hTop = Math.max(canvasExpand.height, canvasCollapse.height);
  const hWave = canvasWave.height;

  state.compositeCanvas.width = w * 2;
  state.compositeCanvas.height = hTop + hWave;

  const c = state.compositeCtx;
  c.clearRect(0, 0, state.compositeCanvas.width, state.compositeCanvas.height);
  c.fillStyle = '#070707';
  c.fillRect(0, 0, state.compositeCanvas.width, state.compositeCanvas.height);

  c.drawImage(canvasExpand, 0, 0);
  c.drawImage(canvasCollapse, w, 0);
  c.drawImage(canvasWave, 0, hTop, w * 2, hWave);
}

function savePNG() {
  drawCompositeForExport();
  const link = document.createElement('a');
  link.download = `wave-cell-${Date.now()}.png`;
  link.href = state.compositeCanvas.toDataURL('image/png');
  link.click();
  setStatus('Saved PNG');
}

function startRecording() {
  drawCompositeForExport();
  state.recordedChunks = [];

  const stream = state.compositeCanvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  state.recorder = new MediaRecorder(stream, { mimeType: mime });

  state.recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
  };

  state.recorder.onstop = () => {
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave-cell-${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    updateReadouts();
    setStatus('Saved WebM');
  };

  state.recorder.start(250);
  updateReadouts();
  setStatus('Recording WebM...');
}

function stopRecording() {
  if (state.recorder && state.recorder.state === 'recording') {
    state.recorder.stop();
  }
}

function startGifCapture() {
  if (typeof GIF === 'undefined') {
    setStatus('GIF library not loaded');
    return;
  }

  drawCompositeForExport();

  state.gifRecorder.gif = new GIF({
    workers: 2,
    quality: 10,
    width: state.compositeCanvas.width,
    height: state.compositeCanvas.height,
    workerScript: 'vendor/gif.worker.js'
  });

  state.gifRecorder.active = true;
  state.gifRecorder.rendering = false;
  state.gifRecorder.frameCount = 0;
  state.gifRecorder.lastCaptureTime = 0;

  state.gifRecorder.gif.on('finished', (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave-cell-${Date.now()}.gif`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    state.gifRecorder.active = false;
    state.gifRecorder.rendering = false;
    state.gifRecorder.gif = null;
    updateReadouts();
    setStatus('Saved GIF');
  });

  updateReadouts();
  setStatus('Recording GIF...');
}

function stopGifCapture() {
  if (!state.gifRecorder.active || !state.gifRecorder.gif) return;

  state.gifRecorder.active = false;
  state.gifRecorder.rendering = true;
  updateReadouts();
  setStatus('Rendering GIF...');
  state.gifRecorder.gif.render();
}

function maybeCaptureGifFrame(nowMs) {
  const g = state.gifRecorder;
  if (!g.active || !g.gif) return;
  if (g.frameCount >= g.maxFrames) {
    stopGifCapture();
    return;
  }
  if (nowMs - g.lastCaptureTime < g.frameIntervalMs) return;

  drawCompositeForExport();
  g.gif.addFrame(state.compositeCanvas, {
    copy: true,
    delay: g.frameIntervalMs
  });

  g.lastCaptureTime = nowMs;
  g.frameCount++;
  setStatus(`Recording GIF... ${g.frameCount}/${g.maxFrames}`);
}

function resetSimulation() {
  state.expandField = createField(state.n);
  state.collapseField = createField(state.n);
  state.tempExpand = createField(state.n);
  state.tempCollapse = createField(state.n);
  state.historyExpand = [];
  state.historyCollapse = [];
  state.historyResidual = [];
  state.t = 0;
  renderAll();
  setStatus('Reset');
}

function renderAll() {
  drawField(ctxExpand, canvasExpand, state.expandField, 'expand');
  drawField(ctxCollapse, canvasCollapse, state.collapseField, 'collapse');
  drawWavePanel();
}

function pointerStart(clientX, clientY) {
  state.camera.isDragging = true;
  state.camera.lastX = clientX;
  state.camera.lastY = clientY;
  setStatus('Dragging camera');
}

function pointerMove(clientX, clientY) {
  if (!state.camera.isDragging) return;

  const dx = clientX - state.camera.lastX;
  const dy = clientY - state.camera.lastY;
  state.camera.lastX = clientX;
  state.camera.lastY = clientY;

  state.camera.dragYaw += dx * 0.005;
  state.camera.dragPitch += dy * 0.005;
  state.camera.dragPitch = clamp(state.camera.dragPitch, -1.4, 1.4);
  state.camera.dragYaw = clamp(state.camera.dragYaw, -3.0, 3.0);
}

function pointerEnd() {
  state.camera.isDragging = false;
  setStatus(state.running ? 'Running' : 'Paused');
}

function attachPointerControls(canvas) {
  canvas.addEventListener('mousedown', (e) => pointerStart(e.clientX, e.clientY));
  canvas.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY));
  canvas.addEventListener('mouseup', pointerEnd);
  canvas.addEventListener('mouseleave', pointerEnd);

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length < 1) return;
    const t = e.touches[0];
    pointerStart(t.clientX, t.clientY);
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length < 1) return;
    const t = e.touches[0];
    pointerMove(t.clientX, t.clientY);
  }, { passive: true });

  canvas.addEventListener('touchend', pointerEnd);
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state.running) {
    state.t += dt;
    stepFields();
  }

  renderAll();
  maybeCaptureGifFrame(now);
  requestAnimationFrame(frame);
}

function handleResize() {
  resizeCanvas(canvasExpand);
  resizeCanvas(canvasCollapse);
  resizeCanvas(canvasWave);
  renderAll();
}

ui.presetSelect.addEventListener('change', (e) => applyPreset(e.target.value));

ui.savedPresetSelect.addEventListener('change', (e) => {
  const name = e.target.value;
  if (!name) return;
  loadSavedPreset(name);
});

ui.savePresetBtn.addEventListener('click', () => saveCurrentPresetToStorage());

ui.deletePresetBtn.addEventListener('click', () => {
  deleteSavedPreset(ui.savedPresetSelect.value);
});

ui.exportPresetsBtn.addEventListener('click', () => exportSavedPresets());

ui.importPresetsBtn.addEventListener('click', () => {
  ui.importPresetsInput.click();
});

ui.importPresetsInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  importPresetsFromFile(file);
});

ui.presetNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveCurrentPresetToStorage();
});

ui.galleryFilterInput.addEventListener('input', () => {
  renderPresetGallery();
});

ui.clearGalleryFilterBtn.addEventListener('click', () => {
  ui.galleryFilterInput.value = '';
  state.galleryFilterTag = '';
  renderTagFilterChips();
  renderPresetGallery();
});

ui.gridSize.addEventListener('input', (e) => {
  state.n = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
  resetSimulation();
});

ui.speed.addEventListener('input', (e) => {
  state.speed = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.memory.addEventListener('input', (e) => {
  state.memory = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.coupling.addEventListener('input', (e) => {
  state.coupling = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.rotation.addEventListener('input', (e) => {
  state.rotation = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.contrast.addEventListener('input', (e) => {
  state.contrast = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.expandWeight.addEventListener('input', (e) => {
  state.expandWeight = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.collapseWeight.addEventListener('input', (e) => {
  state.collapseWeight = Number(e.target.value);
  markCustomPreset();
  updateReadouts();
});

ui.projection.addEventListener('change', (e) => {
  state.projection = e.target.value;
  markCustomPreset();
  renderAll();
  setStatus(`Projection: ${state.projection}`);
});

ui.toggleRun.addEventListener('click', () => {
  state.running = !state.running;
  updateReadouts();
  setStatus(state.running ? 'Running' : 'Paused');
});

ui.resetBtn.addEventListener('click', () => resetSimulation());
ui.snapshotBtn.addEventListener('click', () => savePNG());

ui.recordBtn.addEventListener('click', () => {
  if (state.recorder && state.recorder.state === 'recording') stopRecording();
  else startRecording();
  updateReadouts();
});

ui.gifBtn.addEventListener('click', () => {
  if (state.gifRecorder.rendering) return;
  if (state.gifRecorder.active) stopGifCapture();
  else startGifCapture();
  updateReadouts();
});

window.addEventListener('mouseup', pointerEnd);
window.addEventListener('resize', handleResize);

attachPointerControls(canvasExpand);
attachPointerControls(canvasCollapse);

loadPresetsFromStorage();
refreshSavedPresetDropdown();
updateReadouts();
syncControlsFromState();
resetSimulation();
handleResize();
requestAnimationFrame(frame);
