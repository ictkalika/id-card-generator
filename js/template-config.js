// Coordinates are measured on the supplied 1033 × 1757 Canva export.
// Changing this file adjusts both the live preview and every download.
export const template = {
  image: 'assets/id-card-template.png',
  width: 1033,
  height: 1757,
  printHeightMm: 86,
  font: 'Poppins',
  photo: {
    // Inset rounded hexagon keeps the dark outline in the background visible.
    topLeft: [411, 405], topRight: [622, 405],
    right: [771, 617], bottomRight: [651, 850],
    bottomLeft: [382, 850], left: [262, 617],
    bounds: { x: 258, y: 402, width: 517, height: 457 }
  },
  text: {
    name: { x: 516.5, baseline: 963, maxWidth: 890, size: 64, minSize: 30, color: '#000000', align: 'center' },
    class: { x: 471, baseline: 1140, maxWidth: 230, size: 49, color: '#000000', align: 'left' },
    section: { x: 529, baseline: 1220, maxWidth: 145, size: 49, color: '#000000', align: 'left' },
    phone: { x: 529, baseline: 1300, maxWidth: 450, size: 49, color: '#000000', align: 'left' }
  }
};
