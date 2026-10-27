import { template } from './template-config.js';
import { sections, normalizeName, validate } from './validation.js';
import { loadTemplate, render } from './renderer.js';
import { downloadCard } from './export.js';

const form = document.getElementById('card-form');
const canvas = document.getElementById('card-canvas');
const grid = document.getElementById('section-grid');
const photoInput = document.getElementById('photo');
const controls = document.getElementById('photo-controls');
const exportError = document.getElementById('export-error');
const fields = {
  classValue: document.getElementById('class'),
  name: document.getElementById('full-name'),
  phone: document.getElementById('phone')
};
const errorNodes = {
  classValue: document.getElementById('class-error'),
  section: document.getElementById('section-error'),
  name: document.getElementById('name-error'),
  phone: document.getElementById('phone-error'),
  photo: document.getElementById('photo-error')
};

for (const letter of sections) {
  const label = document.createElement('label');
  label.className = 'section-option';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'section';
  radio.value = letter;
  radio.required = true;
  const span = document.createElement('span');
  span.textContent = letter;
  label.append(radio, span);
  grid.append(label);
}

const state = { classValue: '', section: '', name: '', phone: '', photo: null, zoom: 1, photoX: 0, photoY: 0 };
let background;
let photoUrl;
let lastResult = { nameFits: true };
let touched = new Set();
let pointer = null;

function syncState() {
  state.classValue = fields.classValue.value;
  state.section = form.querySelector('input[name="section"]:checked')?.value || '';
  state.name = fields.name.value;
  state.phone = fields.phone.value;
  state.zoom = Number(document.getElementById('zoom').value) / 100;
  state.photoX = Number(document.getElementById('photo-x').value) / 100;
  state.photoY = Number(document.getElementById('photo-y').value) / 100;
  document.getElementById('zoom-value').value = `${Math.round(state.zoom * 100)}%`;
}

function draw() {
  if (!background) return;
  syncState();
  lastResult = render(canvas, background, state);
  showErrors(false);
}

function showErrors(all) {
  const errors = validate(state, lastResult.nameFits);
  for (const [key, node] of Object.entries(errorNodes)) {
    const show = all || touched.has(key);
    node.textContent = show ? (errors[key] || '') : '';
    const input = fields[key] || (key === 'photo' ? photoInput : null);
    if (input) input.setAttribute('aria-invalid', show && !!errors[key] ? 'true' : 'false');
  }
  grid.setAttribute('data-invalid', String((all || touched.has('section')) && !!errors.section));
  return errors;
}

function clearExportError() {
  exportError.hidden = true;
  exportError.textContent = '';
}

form.addEventListener('input', event => {
  if (event.target === fields.name) touched.add('name');
  if (event.target === fields.phone) touched.add('phone');
  if (event.target.matches('input[type="range"]')) touched.add('photo');
  clearExportError();
  draw();
});
form.addEventListener('change', event => {
  if (event.target === fields.classValue) touched.add('classValue');
  if (event.target.name === 'section') touched.add('section');
  clearExportError();
  draw();
});
fields.name.addEventListener('blur', () => {
  fields.name.value = normalizeName(fields.name.value);
  touched.add('name');
  draw();
});
fields.phone.addEventListener('blur', () => { touched.add('phone'); draw(); });

photoInput.addEventListener('change', async () => {
  touched.add('photo');
  const file = photoInput.files?.[0];
  state.photo = null;
  controls.hidden = true;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  if (!file) { draw(); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    errorNodes.photo.textContent = 'Choose a JPG, PNG, or WebP photograph.';
    draw();
    return;
  }
  const url = URL.createObjectURL(file);
  photoUrl = url;
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (photoUrl !== url) return;
    state.photo = image;
    document.getElementById('zoom').value = '100';
    document.getElementById('photo-x').value = '0';
    document.getElementById('photo-y').value = '0';
    controls.hidden = false;
    draw();
  } catch {
    if (photoUrl === url) {
      state.photo = null;
      errorNodes.photo.textContent = 'The selected image could not be opened.';
      draw();
    }
  }
});

function pointerInPhoto(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * template.width / rect.width;
  const y = (event.clientY - rect.top) * template.height / rect.height;
  const b = template.photo.bounds;
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}
canvas.addEventListener('pointerdown', event => {
  if (!state.photo || !pointerInPhoto(event)) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: state.photoX, startY: state.photoY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  const dx = (event.clientX - pointer.x) * template.width / rect.width;
  const dy = (event.clientY - pointer.y) * template.height / rect.height;
  // Range values are normalized offsets; sliders remain an accessible alternative.
  document.getElementById('photo-x').value = String(Math.max(-100, Math.min(100, Math.round((pointer.startX + dx / 200) * 100))));
  document.getElementById('photo-y').value = String(Math.max(-100, Math.min(100, Math.round((pointer.startY + dy / 200) * 100))));
  draw();
});
function endPointer(event) {
  if (pointer?.id !== event.pointerId) return;
  pointer = null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
  if (!background) return;
  syncState();
  lastResult = render(canvas, background, state);
  const errors = showErrors(true);
  if (Object.keys(errors).length) {
    exportError.textContent = 'Complete the highlighted fields before downloading.';
    exportError.hidden = false;
    const first = Object.keys(errors)[0];
    (fields[first] || (first === 'section' ? grid.querySelector('input') : photoInput))?.focus();
    return;
  }
  clearExportError();
  downloadCard(canvas, button.dataset.format, normalizeName(state.name));
}));

document.getElementById('reset-button').addEventListener('click', () => {
  form.reset();
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  state.photo = null;
  controls.hidden = true;
  document.getElementById('zoom').value = '100';
  document.getElementById('photo-x').value = '0';
  document.getElementById('photo-y').value = '0';
  touched = new Set();
  for (const node of Object.values(errorNodes)) node.textContent = '';
  clearExportError();
  draw();
  fields.classValue.focus();
});

try {
  background = await loadTemplate();
  draw();
} catch (error) {
  exportError.textContent = `The card template could not be loaded: ${error.message}`;
  exportError.hidden = false;
  document.querySelectorAll('[data-format]').forEach(button => { button.disabled = true; });
}
