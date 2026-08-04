// Cosmetic band-aid for a defect baked into room2.glb's source textures:
// many of the Sims4Studio-exported diffuse maps have irregular near-black
// blobs painted directly into the pixel data (confirmed by inspecting the
// raw image — it's not a UV, transparency, or loading issue). This module
// detects those blobs per-texture at runtime and clone-stamps over them
// using a nearby offset of the SAME image, which works well because these
// are small repeating fabric patterns (checks, spots, etc.) — copying a
// same-size patch from a few dozen/hundred pixels away usually lands back
// on an in-phase, matching part of the pattern. Falls back to a flat
// average-color fill (with light dithering) for blobs too big to find a
// clean donor for.
//
// This is a stopgap: it can't recover detail that was never in the file.
// Two known limitations, both traded off deliberately rather than fixed,
// because the alternatives tried were worse:
//  - minComponentFraction skips small blobs (a component has to cover
//    ~0.15% of the working canvas to get patched). Tried going much lower
//    to catch tiny residual blobs, but without a way to tell a soft-edged
//    bug blob apart from a legitimate hard-edged black design element
//    (checker squares, triangles), the lower threshold started eating
//    real pattern detail. A proper fix needs an edge-softness check that
//    correctly handles donut-shaped blobs (a bad region with a small
//    untouched "island" of real pattern inside it, which fools a naive
//    ring-sample into reading as a hard edge) — not implemented here.
//  - Very large/complex blobs (60-80% of a texture, or blobs with holes
//    like the one above) may still show a soft blur or a faint residual
//    edge under extreme close-up. In practice this hasn't been visible at
//    any of the camera's actual constrained viewing distances — only
//    when manually flying the camera in far closer than the site allows.
// Fixing the source textures in Blender is the real fix — see the note in
// main.js.

const MAX_WORK_SIZE = 1024; // downscale before processing; plenty for how these read in-scene

function isBadPixel(data, idx, threshold) {
  return data[idx] <= threshold && data[idx + 1] <= threshold && data[idx + 2] <= threshold;
}

function buildMask(data, width, height, threshold) {
  const mask = new Uint8Array(width * height);
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    if (isBadPixel(data, i, threshold)) mask[p] = 1;
  }
  return mask;
}

// Multi-source BFS connected-component labeling over the bad mask (4-connectivity).
function findComponents(mask, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  const components = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    let qHead = 0;
    let qTail = 0;
    queue[qTail++] = start;
    labels[start] = components.length;
    const pixels = [start];
    let minX = start % width;
    let maxX = minX;
    let minY = (start / width) | 0;
    let maxY = minY;

    while (qHead < qTail) {
      const idx = queue[qHead++];
      const x = idx % width;
      const y = (idx / width) | 0;
      const neighbors = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < width - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - width);
      if (y < height - 1) neighbors.push(idx + width);
      for (const n of neighbors) {
        if (mask[n] && labels[n] === -1) {
          labels[n] = components.length;
          queue[qTail++] = n;
          pixels.push(n);
          const nx = n % width;
          const ny = (n / width) | 0;
          if (nx < minX) minX = nx;
          if (nx > maxX) maxX = nx;
          if (ny < minY) minY = ny;
          if (ny > maxY) maxY = ny;
        }
      }
    }
    components.push({ pixels, minX, minY, maxX, maxY });
  }
  return components;
}

// Checks (on a sampled subset, for speed) whether shifting this component's
// pixels by (dx,dy) lands entirely — or almost entirely — on good pixels.
function shiftBadFraction(mask, width, height, pixels, dx, dy, sampleSize) {
  const step = Math.max(1, Math.floor(pixels.length / sampleSize));
  let sampled = 0;
  let bad = 0;
  for (let i = 0; i < pixels.length; i += step) {
    const idx = pixels[i];
    const x = idx % width;
    const y = (idx / width) | 0;
    const sx = x + dx;
    const sy = y + dy;
    sampled++;
    if (sx < 0 || sx >= width || sy < 0 || sy >= height || mask[sy * width + sx]) bad++;
  }
  return sampled ? bad / sampled : 1;
}

function findDonorShift(mask, width, height, comp) {
  const w = comp.maxX - comp.minX + 1;
  const h = comp.maxY - comp.minY + 1;
  const maxRadius = Math.max(width, height) * 0.5;
  let best = null;
  let bestFrac = 0.04; // accept up to ~4% still-bad on the sampled check

  for (let radius = Math.max(w, h) * 0.65; radius < maxRadius; radius += Math.max(6, radius * 0.35)) {
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * radius);
      const dy = Math.round(Math.sin(angle) * radius);
      const frac = shiftBadFraction(mask, width, height, comp.pixels, dx, dy, 250);
      if (frac === 0) return [dx, dy]; // perfect donor, stop immediately
      if (frac < bestFrac) {
        bestFrac = frac;
        best = [dx, dy];
      }
    }
    if (best) return best; // good enough donor found at this radius, don't search further out
  }
  return best;
}

function applyShift(srcData, dstData, width, height, pixels, dx, dy) {
  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i];
    const x = idx % width;
    const y = (idx / width) | 0;
    let sx = x + dx;
    let sy = y + dy;
    sx = Math.min(Math.max(sx, 0), width - 1);
    sy = Math.min(Math.max(sy, 0), height - 1);
    const srcIdx = (sy * width + sx) * 4;
    const dstIdx = idx * 4;
    dstData[dstIdx] = srcData[srcIdx];
    dstData[dstIdx + 1] = srcData[srcIdx + 1];
    dstData[dstIdx + 2] = srcData[srcIdx + 2];
    dstData[dstIdx + 3] = 255;
  }
}

// Flat average-color fill (from a ring around the blob) with light dithering,
// for components too large to find a clean clone-stamp donor for.
function applyAverageFill(srcData, dstData, width, height, mask, comp) {
  const pad = 24;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.max(0, comp.minY - pad); y <= Math.min(height - 1, comp.maxY + pad); y++) {
    for (let x = Math.max(0, comp.minX - pad); x <= Math.min(width - 1, comp.maxX + pad); x++) {
      const idx = y * width + x;
      if (mask[idx]) continue;
      const i = idx * 4;
      r += srcData[i];
      g += srcData[i + 1];
      b += srcData[i + 2];
      n++;
    }
  }
  if (n === 0) {
    r = 200; g = 170; b = 190; n = 1; // last-resort neutral pink-gray
  }
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);

  for (let i = 0; i < comp.pixels.length; i++) {
    const idx = comp.pixels[i];
    const dstIdx = idx * 4;
    const jitter = (Math.random() - 0.5) * 10;
    dstData[dstIdx] = Math.min(255, Math.max(0, r + jitter));
    dstData[dstIdx + 1] = Math.min(255, Math.max(0, g + jitter));
    dstData[dstIdx + 2] = Math.min(255, Math.max(0, b + jitter));
    dstData[dstIdx + 3] = 255;
  }
}

/**
 * Detects near-black blobs in `image` and clone-stamps/blur-fills over them.
 * Returns a canvas the same aspect ratio as the source (downscaled to a
 * max of MAX_WORK_SIZE on the long edge), or `null` if nothing needed fixing.
 */
export function patchBlackBlobs(image, { threshold = 22, minComponentFraction = 0.0015 } = {}) {
  const srcW = image.width || image.videoWidth;
  const srcH = image.height || image.videoHeight;
  if (!srcW || !srcH) return null;

  const scale = Math.min(1, MAX_WORK_SIZE / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const mask = buildMask(data, width, height, threshold);

  const totalBad = mask.reduce((a, b) => a + b, 0);
  if (totalBad === 0) return null; // nothing to do — don't touch clean textures

  const srcData = data.slice(); // read from the untouched original throughout
  const dstData = data; // write in place, then putImageData once at the end

  const components = findComponents(mask, width, height);
  const minPixels = width * height * minComponentFraction;
  const affected = components.filter((c) => c.pixels.length >= minPixels);
  if (affected.length === 0) return null;

  for (const comp of affected) {
    const shift = findDonorShift(mask, width, height, comp);
    if (shift) {
      applyShift(srcData, dstData, width, height, comp.pixels, shift[0], shift[1]);
    } else {
      applyAverageFill(srcData, dstData, width, height, mask, comp);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
