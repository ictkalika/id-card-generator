import { template } from './template-config.js';
import { normalizeName } from './validation.js';

export async function loadTemplate() {
  const image = new Image();
  image.src = template.image;
  await image.decode();
  if (image.naturalWidth !== template.width || image.naturalHeight !== template.height) {
    throw new Error('The template dimensions do not match its configuration.');
  }
  await document.fonts.load(`700 64px ${template.font}`);
  return image;
}

function photoPath(ctx) {
  // Curves follow the inset of the Canva hexagon, leaving its outline exposed.
  ctx.beginPath();
  ctx.moveTo(411, 404);
  ctx.lineTo(622, 404);
  ctx.quadraticCurveTo(646, 404, 658, 425);
  ctx.lineTo(767, 609);
  ctx.quadraticCurveTo(777, 628, 767, 647);
  ctx.lineTo(662, 833);
  ctx.quadraticCurveTo(648, 858, 622, 858);
  ctx.lineTo(411, 858);
  ctx.quadraticCurveTo(385, 858, 371, 833);
  ctx.lineTo(266, 647);
  ctx.quadraticCurveTo(256, 628, 266, 609);
  ctx.lineTo(375, 425);
  ctx.quadraticCurveTo(388, 404, 411, 404);
  ctx.closePath();
}

function drawPhoto(ctx, state) {
  if (!state.photo) return;
  const { x, y, width, height } = template.photo.bounds;
  const image = state.photo;
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * state.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const extraX = Math.max(0, (drawWidth - width) / 2);
  const extraY = Math.max(0, (drawHeight - height) / 2);
  const drawX = x + (width - drawWidth) / 2 + state.photoX * extraX;
  const drawY = y + (height - drawHeight) / 2 + state.photoY * extraY;
  ctx.save();
  photoPath(ctx);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawText(ctx, value, config, fit = false) {
  if (!value) return true;
  let size = config.size;
  ctx.textAlign = config.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = config.color;
  ctx.font = `700 ${size}px ${template.font}, sans-serif`;
  if (fit) {
    while (ctx.measureText(value).width > config.maxWidth && size > config.minSize) {
      size--;
      ctx.font = `700 ${size}px ${template.font}, sans-serif`;
    }
    if (ctx.measureText(value).width > config.maxWidth) return false;
  }
  ctx.fillText(value, config.x, config.baseline);
  return true;
}

export function render(canvas, background, state) {
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.clearRect(0, 0, template.width, template.height);
  ctx.drawImage(background, 0, 0);
  drawPhoto(ctx, state);
  const t = template.text;
  const nameFits = drawText(ctx, normalizeName(state.name), t.name, true);
  if (['9', '10', '11', '12'].includes(state.classValue)) drawText(ctx, state.classValue, t.class);
  if (/^[A-T]$/.test(state.section)) drawText(ctx, state.section, t.section);
  if (/^[0-9]{10}$/.test(state.phone)) drawText(ctx, state.phone, t.phone);
  return { nameFits };
}
