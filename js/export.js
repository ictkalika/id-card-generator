import { template } from './template-config.js';

function decodeBase64(dataUrl) {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pdfFromJpeg(jpegBytes) {
  // Minimal one-page PDF: a JPEG image at the card's physical dimensions.
  // This avoids a network dependency and preserves the single canvas pipeline.
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const add = value => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (number, parts) => {
    offsets[number] = length;
    add(`${number} 0 obj\n`);
    for (const part of parts) add(part);
    add('\nendobj\n');
  };
  const widthPt = template.printHeightMm * template.width / template.height * 72 / 25.4;
  const heightPt = template.printHeightMm * 72 / 25.4;
  const w = widthPt.toFixed(4), h = heightPt.toFixed(4);
  add('%PDF-1.4\n');
  object(1, [`<< /Type /Catalog /Pages 2 0 R >>`]);
  object(2, [`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`]);
  object(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  object(4, [`<< /Type /XObject /Subtype /Image /Width ${template.width} /Height ${template.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`, jpegBytes, '\nendstream']);
  const commands = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ\n`;
  object(5, [`<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`]);
  const xrefOffset = length;
  add('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  const result = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length; }
  return new Blob([result], { type: 'application/pdf' });
}

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadCard(canvas, format, name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member';
  const filename = `ict-kalika-${slug}`;
  if (format === 'png') {
    canvas.toBlob(blob => blob && save(blob, `${filename}.png`), 'image/png');
    return;
  }
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.96);
  const jpeg = decodeBase64(jpegUrl);
  if (format === 'jpg') save(new Blob([jpeg], { type: 'image/jpeg' }), `${filename}.jpg`);
  else if (format === 'pdf') save(pdfFromJpeg(jpeg), `${filename}.pdf`);
}
