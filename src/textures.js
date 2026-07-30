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
