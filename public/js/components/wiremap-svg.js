/**
 * components/wiremap-svg.js — HTML/SVG Rendering for Wire Map
 */

'use strict';

const WireMapSVG = (() => {

  function svgFloor() {
    const W = WireMapService.W;
    const H = WireMapService.H;
    const R = WireMapService.R;
    const E = WireMapService.E;

    const wall  = '#5a6090';
    const grid  = 'rgba(255,255,255,0.028)';
    const fill  = 'rgba(255,255,255,0.012)';
    const wallW = 3.5;

    let g = '';
    // grid lines inside main room
    for (let x = R.x1; x <= R.x2; x += 50)
      g += `<line x1="${x}" y1="${R.y1}" x2="${x}" y2="${R.y2}" stroke="${grid}" stroke-width="1"/>`;
    for (let y = R.y1; y <= R.y2; y += 50)
      g += `<line x1="${R.x1}" y1="${y}" x2="${R.x2}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
    // grid inside extension
    for (let x = E.x1; x <= E.x2; x += 50)
      g += `<line x1="${x}" y1="${E.y1}" x2="${x}" y2="${E.y2}" stroke="${grid}" stroke-width="1"/>`;
    for (let y = E.y1; y <= E.y2; y += 50)
      g += `<line x1="${E.x1}" y1="${y}" x2="${E.x2}" y2="${E.y2}" stroke="${grid}" stroke-width="1"/>`;

    // Main room rectangle
    const mainRoom = `<rect x="${R.x1}" y="${R.y1}" width="${R.x2-R.x1}" height="${R.y2-R.y1}"
      fill="${fill}" stroke="${wall}" stroke-width="${wallW}" rx="2"/>`;

    // Extension — draw left/bottom/right walls only
    const ext = `
      <rect x="${E.x1}" y="${E.y1}" width="${E.x2-E.x1}" height="${E.y2-E.y1}" fill="${fill}"/>
      <line x1="${E.x1}" y1="${E.y1}" x2="${E.x1}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x1}" y1="${E.y2}" x2="${E.x2}" y2="${E.y2}" stroke="${wall}" stroke-width="${wallW}"/>
      <line x1="${E.x2}" y1="${E.y2}" x2="${E.x2}" y2="${E.y1}" stroke="${wall}" stroke-width="${wallW}"/>
    `;

    // Erase the bottom-wall segment over the opening
    const opening = `<line x1="${E.x1+wallW/2}" y1="${R.y2}" x2="${E.x2-wallW/2}" y2="${R.y2}"
      stroke="#0f1117" stroke-width="${wallW+2}"/>`;

    // Room labels
    const labels = `
      <text x="${(R.x1+R.x2)/2}" y="${R.y2-7}"
        text-anchor="middle" fill="rgba(255,255,255,0.06)"
        font-size="11" font-family="Inter,sans-serif" letter-spacing="5">WELDING FLOOR</text>
      <text x="${(E.x1+E.x2)/2}" y="${E.y2-8}"
        text-anchor="middle" fill="rgba(255,255,255,0.07)"
        font-size="9" font-family="Inter,sans-serif" letter-spacing="2">STORAGE</text>
    `;

    return `<svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
      style="position:absolute;top:0;left:0;pointer-events:none;z-index:0;">
      ${g}${mainRoom}${ext}${opening}${labels}
    </svg>`;
  }

  // Placeholder for overlay/connection drawing
  function svgOverlay() {
    return '';
  }

  return {
    svgFloor,
    svgOverlay
  };

})();
