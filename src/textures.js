import * as THREE from "three";

// Tiny seeded PRNG so the print looks the same every reload.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Procedural leopard-print canvas texture (no external image needed).
 * Draws cream base + dark rosette blobs with a lighter brown center.
 */
export function createLeopardTexture({
  size = 512,
  base = "#f4d999",
  spotDark = "#3b2113",
  spotMid = "#a9702f",
  spotCount = 70,
  repeatX = 3,
  repeatY = 3,
  seed = 42,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < spotCount; i++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const rBase = size * (0.028 + rng() * 0.03);

    // dark irregular rosette ring made of overlapping blobs
    const petals = 4 + Math.floor(rng() * 3);
    ctx.fillStyle = spotDark;
    for (let p = 0; p < petals; p++) {
      const angle = (p / petals) * Math.PI * 2 + rng() * 0.6;
      const dist = rBase * (0.55 + rng() * 0.3);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const pr = rBase * (0.55 + rng() * 0.4);
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.8 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // warm brown center
    ctx.fillStyle = spotMid;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rBase * 0.55, rBase * 0.45, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Soft fuzzy speckle texture, used for the pink shag rug / beanbag.
 */
export function createFuzzTexture({
  size = 256,
  base = "#ff6fb0",
  speckle = "#ff9ecf",
  speckleCount = 900,
  repeatX = 4,
  repeatY = 4,
  seed = 7,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = speckle;
  for (let i = 0; i < speckleCount; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = rng() * 1.6 + 0.4;
    ctx.globalAlpha = 0.35 + rng() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural zebra-print canvas texture — wavy black stripes on white,
 * used for the dresser drawer fronts.
 */
export function createZebraTexture({
  size = 256,
  base = "#f8f4f0",
  stripe = "#231a17",
  stripeCount = 9,
  repeatX = 1,
  repeatY = 1,
  seed = 21,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = stripe;
  const gap = size / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    const cx = i * gap + rng() * gap * 0.3;
    const wobble = 4 + rng() * 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    const segs = 6;
    for (let s = 1; s <= segs; s++) {
      const y = (s / segs) * size;
      const x = cx + Math.sin(s * 1.7 + rng() * 2) * wobble;
      ctx.lineTo(x, y);
    }
    const w = gap * (0.45 + rng() * 0.25);
    for (let s = segs; s >= 0; s--) {
      const y = (s / segs) * size;
      const x = cx + Math.sin(s * 1.7 + rng() * 2) * wobble + w;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawMiniHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.32);
  ctx.bezierCurveTo(cx - size, cy - size * 0.5, cx - size * 0.35, cy - size * 1.1, cx, cy - size * 0.35);
  ctx.bezierCurveTo(cx + size * 0.35, cy - size * 1.1, cx + size, cy - size * 0.5, cx, cy + size * 0.32);
  ctx.closePath();
  ctx.fill();
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Round metallic speaker-grille texture (concentric rings + dark center),
 * used for the princess TV's speaker "ears".
 */
export function createSpeakerGrilleTexture({ size = 128, base = "#3a3a44", ring = "#9a9aa8" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ring;
  ctx.lineWidth = size * 0.05;
  for (let r = size * 0.16; r < size * 0.47; r += size * 0.13) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#121216";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The princess TV's control-panel decal: power icon, a row of heart
 * buttons with labels, and a "DVD" pill slot.
 */
export function createTvPanelTexture({ width = 512, height = 256, bg = "#e79fc4" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // power icon, top-left
  ctx.strokeStyle = "#7a3b63";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(46, 40, 15, 0.35 * Math.PI, 1.65 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(46, 22);
  ctx.lineTo(46, 38);
  ctx.stroke();

  // heart buttons + labels
  const heartXs = [180, 258, 336, 414];
  const labels = ["BACK", "CHANNEL", "VOLUME", "MENU"];
  ctx.fillStyle = "#ff5fa8";
  heartXs.forEach((hx) => drawMiniHeart(ctx, hx, 40, 15));
  ctx.fillStyle = "#5a2c46";
  ctx.font = "bold 14px 'Space Mono', monospace";
  ctx.textAlign = "center";
  heartXs.forEach((hx, i) => ctx.fillText(labels[i], hx, 78));

  // DVD pill slot
  ctx.fillStyle = "#c9a8ea";
  drawRoundRect(ctx, 70, 150, width - 140, 62, 31);
  ctx.fill();
  ctx.fillStyle = "#4a2f5a";
  ctx.font = "bold 26px 'Space Mono', monospace";
  ctx.fillText("DVD", width / 2, 190);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Simple vertical stripe texture, used for the accent wall.
 */
export function createStripeTexture({
  size = 256,
  colorA = "#ffb6d9",
  colorB = "#ff8fc4",
  stripes = 10,
  repeatX = 1,
  repeatY = 1,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const w = size / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * w, 0, w, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
