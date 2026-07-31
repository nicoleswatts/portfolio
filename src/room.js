import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  createLeopardTexture,
  createFuzzTexture,
  createStripeTexture,
  createZebraTexture,
  createSpeakerGrilleTexture,
  createTvPanelTexture,
  createTuftingTexture,
} from "./textures.js";

const PALETTE = {
  hotPink: 0xff2d93,
  pink: 0xff6fb0,
  babyPink: 0xffc2e0,
  softPink: 0xffe0ef,
  cream: 0xfff1e6,
  chrome: 0xe8e8f0,
  gold: 0xf9c74f,
  brown: 0x4a2f1a,
  darkBrown: 0x2c1c10,
  glassPink: 0xff8fc4,
  screenPink: 0xffd6ec,
  lavender: 0xc9a8ea,
  screenOff: 0x100c14,
  rose: 0xe08fb8,
  leopardPinkBase: 0xff8fc4,
  black: 0x17141a,
};

// Classic three.js "heart" bezier shape, centered on its own bounding box
// and normalized so `makeHeartMesh(width, depth, material)` produces a
// heart roughly `width` units wide.
function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.25, 0.25);
  shape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  shape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  shape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  shape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  shape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  shape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  return shape;
}

function makeHeartMesh(width, depth, material) {
  const shape = createHeartShape();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.25,
    bevelSegments: 2,
    steps: 1,
  });
  geo.center();
  // createHeartShape()'s single smooth peak is at max-Y with the two-lobe
  // cleft at min-Y (i.e. authored point-up). The shape is symmetric about
  // its own vertical centerline, so rotating 180° flips it to the
  // conventional orientation (point down, cleft up) without the inverted
  // normals a negative-axis scale would cause.
  geo.rotateZ(Math.PI);
  const scale = width / 1.1; // shape spans ~1.1 x ~0.95 units before normalizing
  geo.scale(scale, scale, scale);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

// Same heart shape, but width/height scale independently (uniform scaling
// would lock the proportions to the shape's natural ~1.16:1 ratio, which is
// too narrow for a wide heart-shaped headboard).
function makeFlatHeartPanel(width, height, depth, material) {
  const shape = createHeartShape();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.2,
    bevelSize: depth * 0.15,
    bevelSegments: 2,
    steps: 1,
  });
  geo.center();
  geo.rotateZ(Math.PI); // flip to point-down orientation — see note in makeHeartMesh
  geo.scale(width / 1.1, height / 0.95, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Hand-tuned 3-bump scalloped silhouette (big-small-big, like a crown with
// two round "ear" bumps flanking a smaller center bump) spanning local
// x: -1..1, y: 0 (flat base) .. ~1.25 (bump peaks). Used for the princess
// TV's speaker/heart crown.
function createScallopShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1, 0);
  shape.lineTo(-1, 0.55);
  shape.bezierCurveTo(-1, 0.95, -0.85, 1.25, -0.62, 1.25);
  shape.bezierCurveTo(-0.4, 1.25, -0.35, 1.0, -0.3, 0.85);
  shape.bezierCurveTo(-0.15, 0.98, -0.12, 1.15, 0, 1.15);
  shape.bezierCurveTo(0.12, 1.15, 0.15, 0.98, 0.3, 0.85);
  shape.bezierCurveTo(0.35, 1.0, 0.4, 1.25, 0.62, 1.25);
  shape.bezierCurveTo(0.85, 1.25, 1, 0.95, 1, 0.55);
  shape.lineTo(1, 0);
  shape.lineTo(-1, 0);
  return shape;
}

// NOTE: unlike makeHeartMesh, this does NOT call geo.center() — the shape's
// local origin (x=0 horizontal center, y=0 flat base) is kept intact so the
// bump peak coordinates below (SCALLOP_PEAK) stay valid for positioning the
// speakers/heart that sit on top of it.
const SCALLOP_PEAK = { outer: { x: 0.62, y: 1.25 }, center: { y: 1.15 } };

function makeScallopMesh(width, depth, material) {
  const shape = createScallopShape();
  const s = width / 2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth / s,
    bevelEnabled: true,
    bevelThickness: (depth / s) * 0.3,
    bevelSize: (depth / s) * 0.2,
    bevelSegments: 2,
    steps: 1,
  });
  geo.scale(s, s, s);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function makeStandard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...opts });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Soft radial-gradient sprite used to mark clickable objects with a glow.
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

let glowTexture = null;
function addGlow(parent, color, scale, yOffset = 0) {
  if (!glowTexture) glowTexture = createGlowTexture();
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  sprite.position.y += yOffset;
  sprite.userData.baseScale = scale;
  parent.add(sprite);
  return sprite;
}

/**
 * Builds the entire bedroom and adds it to the scene.
 * Returns:
 *  - clickable: THREE.Object3D[] with userData.id matching content.js keys
 *  - glows: THREE.Sprite[] to animate (pulse) each frame
 *  - animated: { update(t): void }[] for ambient motion (disco ball, lava lamp blobs)
 */
export function buildRoom(scene) {
  const clickable = [];
  const glows = [];
  const animated = [];

  const ROOM_W = 6; // x: -3..3
  const ROOM_D = 6; // z: -3..3
  const ROOM_H = 3;

  const room = new THREE.Group();
  scene.add(room);

  // ---------------- floor & walls ----------------
  const floorMat = makeStandard(0xf6e3c8, { roughness: 0.85 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const stripeTex = createStripeTexture({ colorA: "#ffb6d9", colorB: "#ff8fc4", stripes: 14, repeatX: 1, repeatY: 1 });
  const backWallMat = makeStandard(0xffffff, { map: stripeTex, roughness: 0.9 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), backWallMat);
  backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  backWall.receiveShadow = true;
  room.add(backWall);

  const sideWallMat = makeStandard(PALETTE.babyPink, { roughness: 0.95 });
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), sideWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  leftWall.receiveShadow = true;
  room.add(leftWall);

  const rightWallMat = makeStandard(PALETTE.softPink, { roughness: 0.95 });
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), rightWallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  rightWall.receiveShadow = true;
  room.add(rightWall);

  // baseboard trim
  const trim = box(ROOM_W, 0.12, 0.06, makeStandard(0xffffff, { roughness: 0.6 }));
  trim.position.set(0, 0.06, -ROOM_D / 2 + 0.03);
  room.add(trim);

  // ---------------- rug (leopard print) ----------------
  const leopardTex = createLeopardTexture({ repeatX: 3, repeatY: 3 });
  const rugMat = makeStandard(0xffffff, { map: leopardTex, roughness: 1 });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.55, 32), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.008, 1.15);
  rug.receiveShadow = true;
  room.add(rug);

  // ================= BED (ambient, not clickable) =================
  const bed = new THREE.Group();
  bed.position.set(0, 0, -1.6);
  room.add(bed);

  const frameMat = makeStandard(PALETTE.black, { roughness: 0.45 });
  const frame = box(1.5, 0.4, 2.7, frameMat);
  frame.position.y = 0.2;
  bed.add(frame);

  const legMat = makeStandard(PALETTE.black, { roughness: 0.4 });
  for (const [dx, dz] of [
    [-0.68, -1.25],
    [0.68, -1.25],
    [-0.68, 1.25],
    [0.68, 1.25],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), legMat);
    leg.position.set(dx, 0.1, dz);
    bed.add(leg);
  }

  const mattress = box(1.42, 0.22, 2.6, makeStandard(PALETTE.cream, { roughness: 0.9 }));
  mattress.position.y = 0.51;
  bed.add(mattress);

  // black comforter covering most of the mattress (foot end left showing)
  const comforter = box(1.46, 0.14, 1.9, makeStandard(PALETTE.black, { roughness: 0.6 }));
  comforter.position.set(0, 0.64, 0.35);
  bed.add(comforter);

  // leopard bolster spanning the width, between the pillows and the comforter
  const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.4, 16), rugMat);
  bolster.rotation.z = Math.PI / 2;
  bolster.position.set(0, 0.7, -0.68);
  bolster.castShadow = true;
  bed.add(bolster);

  // ---- heart-shaped tufted headboard ----
  const tuftingTex = createTuftingTexture({ cols: 4, rows: 3 });
  const headboardMat = makeStandard(0xffffff, { map: tuftingTex, roughness: 0.55 });
  const headboard = makeFlatHeartPanel(1.6, 1.05, 0.12, headboardMat);
  headboard.position.set(0, 0.78, -1.34);
  bed.add(headboard);

  // real gold studs across the headboard face, matching the tufted-diamond grid
  const studMat = makeStandard(PALETTE.gold, { metalness: 0.75, roughness: 0.25 });
  const studCols = 4;
  const studRows = 3;
  const studAreaW = 1.15;
  const studAreaH = 0.62;
  for (let j = 0; j <= studRows; j++) {
    for (let i = 0; i <= studCols; i++) {
      const rowOffset = j % 2 !== 0 ? studAreaW / studCols / 2 : 0;
      const sx = -studAreaW / 2 + (i / studCols) * studAreaW + rowOffset;
      if (sx < -studAreaW / 2 - 0.01 || sx > studAreaW / 2 + 0.01) continue;
      const sy = 0.78 - studAreaH / 2 + (j / studRows) * studAreaH;
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), studMat);
      stud.position.set(sx, sy, -1.34 + 0.07);
      bed.add(stud);
    }
  }

  // pillows: black with a leopard-print corner fold
  for (const dx of [-0.42, 0.42]) {
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), makeStandard(PALETTE.black, { roughness: 0.8 }));
    pillow.scale.set(1, 0.55, 0.75);
    pillow.position.set(dx, 0.8, -0.95);
    pillow.castShadow = true;
    bed.add(pillow);

    const fold = box(0.42, 0.05, 0.16, rugMat);
    fold.position.set(dx, 0.97, -1.08);
    fold.rotation.x = -0.25;
    bed.add(fold);
  }

  // canopy: wall-mounted curtain rod with pom-pom trim and draped zebra
  // fabric panels flanking the headboard
  const canopyRodMat = makeStandard(0x1a1418, { metalness: 0.6, roughness: 0.3 });
  const canopyRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 12), canopyRodMat);
  canopyRod.rotation.z = Math.PI / 2;
  canopyRod.position.set(0, 1.95, -1.25);
  bed.add(canopyRod);

  for (let i = -9; i <= 9; i++) {
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), makeStandard(0x1a1418, { roughness: 0.8 }));
    pom.position.set(i * 0.105, 1.9, -1.25);
    bed.add(pom);
  }

  const canopyZebraTex = createZebraTexture({ seed: 33, repeatX: 1.2, repeatY: 2 });
  const canopyMat = new THREE.MeshStandardMaterial({ map: canopyZebraTex, roughness: 0.7, side: THREE.DoubleSide });
  for (const dx of [-0.85, 0.85]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.7), canopyMat);
    panel.position.set(dx, 1.05, -1.23);
    panel.rotation.y = dx > 0 ? -0.15 : 0.15;
    bed.add(panel);
  }

  // ================= NIGHTSTANDS (ambient, flanking the bed) =================
  const nightstandZebraTex = createZebraTexture({ seed: 44, repeatX: 1.3, repeatY: 0.8 });
  const nightstandLeopardTex = createLeopardTexture({
    base: "#ff8fc4",
    spotDark: "#1a1216",
    spotMid: "#c2185b",
    repeatX: 1.6,
    repeatY: 0.9,
    seed: 61,
  });
  const nightstandBandMats = [
    makeStandard(0xffffff, { map: nightstandZebraTex, roughness: 0.5 }),
    makeStandard(0xffffff, { map: nightstandLeopardTex, roughness: 0.5 }),
  ];

  function buildNightstand(x, z) {
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    room.add(stand);

    const body = box(0.5, 0.5, 0.42, makeStandard(PALETTE.black, { roughness: 0.4 }));
    body.position.y = 0.25;
    stand.add(body);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.03, 0.46),
      new THREE.MeshPhysicalMaterial({ color: 0x100c10, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 })
    );
    top.position.y = 0.515;
    top.castShadow = true;
    top.receiveShadow = true;
    stand.add(top);

    [0.35, 0.13].forEach((y, i) => {
      const drawer = box(0.46, 0.19, 0.05, nightstandBandMats[i]);
      drawer.position.set(0, y, 0.19);
      stand.add(drawer);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), makeStandard(PALETTE.gold, { metalness: 0.7 }));
      knob.position.set(0, y, 0.23);
      stand.add(knob);
    });

    return stand;
  }

  buildNightstand(-1.2, -2.7);
  buildNightstand(1.2, -2.7);

  // small round mirror with a pink-leopard frame above the left nightstand
  const nightstandMirrorFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.045, 10, 24),
    makeStandard(0xffffff, { map: nightstandLeopardTex, roughness: 0.6 })
  );
  nightstandMirrorFrame.position.set(-1.2, 1.55, -2.94);
  room.add(nightstandMirrorFrame);
  const nightstandMirrorGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.23, 24),
    makeStandard(0xcfe8ff, { metalness: 0.9, roughness: 0.05 })
  );
  nightstandMirrorGlass.position.set(-1.2, 1.55, -2.93);
  room.add(nightstandMirrorGlass);

  // ================= DESK + LAVA LAMP (clickable) =================
  const desk = new THREE.Group();
  desk.position.set(2.3, 0, -2.6);
  room.add(desk);

  const deskLegMat = makeStandard(PALETTE.chrome, { metalness: 0.9, roughness: 0.15 });
  const deskZebraTex = createZebraTexture({ seed: 71, repeatX: 2, repeatY: 0.9 });
  const deskTop = box(1.3, 0.06, 0.6, makeStandard(0xffffff, { map: deskZebraTex, roughness: 0.4 }));
  deskTop.position.y = 0.75;
  desk.add(deskTop);
  for (const [dx, dz] of [
    [-0.58, -0.24],
    [0.58, -0.24],
    [-0.58, 0.24],
    [0.58, 0.24],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), deskLegMat);
    leg.position.set(dx, 0.375, dz);
    desk.add(leg);
  }

  // small chair, pink-leopard upholstery
  const chairLeopardTex = createLeopardTexture({
    base: "#ff8fc4",
    spotDark: "#1a1216",
    spotMid: "#c2185b",
    repeatX: 1.4,
    repeatY: 1.4,
    seed: 82,
  });
  const chairMat = makeStandard(0xffffff, { map: chairLeopardTex, roughness: 0.6 });
  const chair = new THREE.Group();
  chair.position.set(0.1, 0, 0.75);
  const seat = box(0.5, 0.06, 0.5, chairMat);
  seat.position.y = 0.45;
  chair.add(seat);
  const seatBack = box(0.5, 0.5, 0.06, chairMat);
  seatBack.position.set(0, 0.7, -0.22);
  chair.add(seatBack);
  const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), deskLegMat);
  chairPole.position.y = 0.22;
  chair.add(chairPole);
  desk.add(chair);

  // lips-shaped phone (hot pink, coiled cord) and a small remote, resting on the desk
  const lipsMat = makeStandard(PALETTE.hotPink, { roughness: 0.3 });
  const lips = new THREE.Group();
  lips.position.set(-0.45, 0.785, 0.12);
  desk.add(lips);
  for (const [dx, s] of [
    [-0.045, 1],
    [0.045, 1],
  ]) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lipsMat);
    lobe.scale.set(1, 0.75, 0.65);
    lobe.position.set(dx, 0.012, 0);
    lips.add(lobe);
  }
  const lipsCenter = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), lipsMat);
  lipsCenter.scale.set(1, 0.6, 0.5);
  lipsCenter.position.set(0, -0.008, 0.01);
  lips.add(lipsCenter);
  const earpieceCord = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12), lipsMat);
  earpieceCord.position.set(0.09, 0.01, -0.03);
  earpieceCord.rotation.x = Math.PI / 2.2;
  lips.add(earpieceCord);

  const remoteMat = makeStandard(PALETTE.babyPink, { roughness: 0.45 });
  const remote = box(0.05, 0.014, 0.16, remoteMat);
  remote.position.set(0.3, 0.782, -0.05);
  remote.rotation.y = 0.3;
  desk.add(remote);
  const btnMat = makeStandard(0xffffff, { roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8), btnMat);
    btn.position.set(0, 0.009, -0.04 + i * 0.035);
    remote.add(btn);
  }

  // --- lava lamp ---
  const lavaLamp = new THREE.Group();
  lavaLamp.position.set(0.35, 0.78, -0.1);
  lavaLamp.userData.id = "lavaLamp";
  desk.add(lavaLamp);

  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.12, 16),
    makeStandard(PALETTE.chrome, { metalness: 0.85, roughness: 0.2 })
  );
  lampBase.position.y = 0.06;
  lavaLamp.add(lampBase);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.glassPink,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.3,
  });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 16), glassMat);
  glass.position.y = 0.32;
  lavaLamp.add(glass);

  const lampCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.07, 16),
    makeStandard(PALETTE.chrome, { metalness: 0.85, roughness: 0.2 })
  );
  lampCap.position.y = 0.53;
  lavaLamp.add(lampCap);

  const blobs = [];
  const blobMat = makeStandard(0xff4fa8, { emissive: 0xff2d93, emissiveIntensity: 0.5, roughness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.028 + Math.random() * 0.018, 10, 8), blobMat);
    blob.position.set((Math.random() - 0.5) * 0.06, 0.18 + i * 0.06, (Math.random() - 0.5) * 0.06);
    lavaLamp.add(blob);
    blobs.push({ mesh: blob, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.3 });
  }
  const lampGlowLight = new THREE.PointLight(0xff4fa8, 1.2, 1.6);
  lampGlowLight.position.y = 0.3;
  lavaLamp.add(lampGlowLight);

  animated.push({
    update(t) {
      blobs.forEach((b) => {
        b.mesh.position.y = 0.18 + b.phase * 0 + 0.16 * Math.sin(t * b.speed + b.phase) + 0.18;
      });
      lampGlowLight.intensity = 1.0 + Math.sin(t * 1.5) * 0.3;
    },
  });

  addGlow(lavaLamp, 0xff6fb0, 0.5, 0.28);
  clickable.push(lavaLamp);
  glows.push(lavaLamp.children[lavaLamp.children.length - 1]);

  // ================= DRESSER + PRINCESS TV (clickable) =================
  const dresser = new THREE.Group();
  dresser.position.set(2.55, 0, 0.3);
  room.add(dresser);

  const dresserBody = box(0.55, 0.85, 1.3, makeStandard(0x1a1418, { roughness: 0.4 }));
  dresserBody.position.y = 0.425;
  dresser.add(dresserBody);

  // glossy black lacquer top slab the TV sits on
  const dresserTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.04, 1.36),
    new THREE.MeshPhysicalMaterial({ color: 0x100c10, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.1 })
  );
  dresserTop.position.y = 0.87;
  dresserTop.castShadow = true;
  dresserTop.receiveShadow = true;
  dresser.add(dresserTop);

  // drawer fronts: stacked hot-pink / zebra / pink-leopard bands. The dark
  // dresserBody shows through the small gaps as trim lines between drawers.
  const zebraTex = createZebraTexture({ seed: 12, repeatX: 1.6, repeatY: 0.8 });
  const pinkLeopardTex = createLeopardTexture({
    base: "#ff8fc4",
    spotDark: "#1a1216",
    spotMid: "#c2185b",
    repeatX: 2.2,
    repeatY: 0.9,
    seed: 55,
  });
  const drawerBandMats = [
    makeStandard(PALETTE.hotPink, { roughness: 0.5 }),
    makeStandard(0xffffff, { map: zebraTex, roughness: 0.5 }),
    makeStandard(0xffffff, { map: pinkLeopardTex, roughness: 0.5 }),
  ];
  [0.62, 0.4, 0.18].forEach((y, i) => {
    const drawer = box(0.5, 0.19, 1.22, drawerBandMats[i]);
    drawer.position.set(-0.29, y, 0);
    dresser.add(drawer);
    const pull = box(0.02, 0.025, 0.16, makeStandard(0x1a1418, { roughness: 0.3, metalness: 0.4 }));
    pull.position.set(-0.56, y, 0);
    dresser.add(pull);
  });

  // --- princess TV: glossy pink rounded body, scalloped lavender crown with
  // heart + speaker "ears", rounded-rect screen, control panel decal ---
  const tv = new THREE.Group();
  tv.position.set(-0.35, 1.0, 0);
  tv.userData.id = "princessTv";
  dresser.add(tv);

  const trimMat = makeStandard(PALETTE.lavender, { roughness: 0.35 });
  const BODY_FRONT_X = -0.2; // half-depth of tvBody below; front face of the TV

  const tvBodyMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.pink,
    roughness: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
    metalness: 0.05,
  });
  const tvBody = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.48, 0.58, 4, 0.06), tvBodyMat);
  tvBody.castShadow = true;
  tv.add(tvBody);

  // scalloped lavender crown (2 big bumps for the speakers + 1 small center
  // bump for the heart), straddling the body's top-front edge
  const crownWidth = 0.4;
  const crownScale = crownWidth / 2;
  const crown = makeScallopMesh(crownWidth, 0.05, trimMat);
  crown.position.set(BODY_FRONT_X + 0.02, 0.24, 0);
  crown.rotation.y = -Math.PI / 2;
  tv.add(crown);

  // rounded-rect screen recess: rose bezel frame + black "off" screen inset
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.27, 0.35, 4, 0.03), makeStandard(0xf0bcd6, { roughness: 0.4 }));
  bezel.position.set(BODY_FRONT_X - 0.01, 0.05, 0);
  tv.add(bezel);

  const screenMat = makeStandard(PALETTE.screenOff, { roughness: 0.45, metalness: 0.1 });
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.18, 0.26, 4, 0.02), screenMat);
  screen.position.set(BODY_FRONT_X - 0.025, 0.05, 0);
  tv.add(screen);

  // control panel decal: power icon, heart buttons + labels, DVD pill
  const panelMat = new THREE.MeshStandardMaterial({ map: createTvPanelTexture(), roughness: 0.55 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16), panelMat);
  panel.position.set(BODY_FRONT_X - 0.008, -0.14, 0);
  panel.rotation.y = -Math.PI / 2;
  tv.add(panel);

  // heart applique on the crown's small center bump
  const heartY = 0.24 + SCALLOP_PEAK.center.y * crownScale + 0.02;
  const tvHeartOutline = makeHeartMesh(0.2, 0.02, trimMat);
  tvHeartOutline.rotation.y = -Math.PI / 2;
  tvHeartOutline.position.set(BODY_FRONT_X - 0.02, heartY, 0);
  tv.add(tvHeartOutline);
  const tvHeart = makeHeartMesh(0.15, 0.025, makeStandard(PALETTE.hotPink, { roughness: 0.3 }));
  tvHeart.rotation.y = -Math.PI / 2;
  tvHeart.position.set(BODY_FRONT_X - 0.03, heartY, 0);
  tv.add(tvHeart);

  // round speaker "ears" on the crown's two outer bumps: metallic grille
  // disc + lavender trim ring
  const grilleTex = createSpeakerGrilleTexture();
  const speakerY = 0.24 + SCALLOP_PEAK.outer.y * crownScale;
  const speakerZ = SCALLOP_PEAK.outer.x * crownScale;
  for (const dz of [-speakerZ, speakerZ]) {
    const speaker = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 24),
      new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.5, metalness: 0.3 })
    );
    speaker.position.set(BODY_FRONT_X - 0.01, speakerY, dz);
    speaker.rotation.y = -Math.PI / 2;
    tv.add(speaker);
    const speakerRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 8, 24), trimMat);
    speakerRingOuter.position.set(BODY_FRONT_X - 0.015, speakerY, dz);
    speakerRingOuter.rotation.y = Math.PI / 2;
    tv.add(speakerRingOuter);
  }

  addGlow(tv, 0xff8fc4, 0.6, 0.25);
  clickable.push(tv);
  glows.push(tv.children[tv.children.length - 1]);

  // ================= MAGAZINE STACK (clickable) =================
  const magazines = new THREE.Group();
  magazines.position.set(0.2, 0, 1.7);
  magazines.userData.id = "magazines";
  room.add(magazines);

  const magColors = [0xff6fb0, 0xffffff, 0x3b2113, 0xf9c74f];
  let stackHeight = 0.01;
  for (let i = 0; i < 4; i++) {
    const w = 0.34 - i * 0.01;
    const d = 0.44 - i * 0.01;
    const h = 0.028;
    const mat = i === 2 ? makeStandard(0xffffff, { map: createLeopardTexture({ repeatX: 1.5, repeatY: 1.5, seed: 90 + i }) }) : makeStandard(magColors[i]);
    const mag = box(w, h, d, mat);
    mag.rotation.y = (Math.random() - 0.5) * 0.5;
    mag.position.set((Math.random() - 0.5) * 0.05, stackHeight + h / 2, (Math.random() - 0.5) * 0.05);
    magazines.add(mag);
    stackHeight += h;
  }

  addGlow(magazines, 0xffc94a, 0.45, stackHeight + 0.05);
  clickable.push(magazines);
  glows.push(magazines.children[magazines.children.length - 1]);

  // ================= AMBIENT DECOR (not clickable) =================

  // disco ball
  const discoBall = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15, flatShading: true })
  );
  discoBall.position.set(1.3, 2.55, -0.8);
  room.add(discoBall);
  const discoLight = new THREE.PointLight(0xff6fb0, 0.8, 3);
  discoLight.position.copy(discoBall.position);
  room.add(discoLight);
  const discoString = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 6), makeStandard(0x999999));
  discoString.position.set(1.3, 2.75, -0.8);
  room.add(discoString);
  animated.push({
    update(t) {
      discoBall.rotation.y = t * 0.6;
      discoLight.color.setHSL((t * 0.05) % 1, 0.7, 0.7);
    },
  });

  // beanbag (tan fuzzy fabric, matching the reference)
  const beanbag = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    makeStandard(0xffffff, { map: createFuzzTexture({ base: "#c9a488", speckle: "#e2c7a8" }), roughness: 1 })
  );
  beanbag.scale.set(1, 0.65, 1);
  beanbag.position.set(-1.35, 0.28, 1.3);
  room.add(beanbag);

  // posters (decorative, non-clickable) on back wall above the bed
  const posterFrames = [
    { x: -2.6, colorA: 0xffffff, colorB: PALETTE.hotPink },
    { x: -1.95, colorA: PALETTE.pink, colorB: 0xffffff },
  ];
  posterFrames.forEach(({ x, colorA, colorB }) => {
    const frame = box(0.5, 0.7, 0.03, makeStandard(colorB, { roughness: 0.5 }));
    frame.position.set(x, 2.15, -2.97);
    room.add(frame);
    const art = box(0.4, 0.58, 0.01, makeStandard(colorA, { roughness: 0.8 }));
    art.position.set(x, 2.15, -2.95);
    room.add(art);
    const heartDeco = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12, Math.PI), makeStandard(PALETTE.hotPink));
    heartDeco.rotation.z = Math.PI;
    heartDeco.position.set(x, 2.18, -2.93);
    room.add(heartDeco);
  });

  // fairy lights along the top of the back wall
  const fairyGroup = new THREE.Group();
  room.add(fairyGroup);
  const fairySegments = 18;
  const fairyBulbs = [];
  for (let i = 0; i <= fairySegments; i++) {
    const t = i / fairySegments;
    const x = -2.9 + t * 5.8;
    const sag = Math.sin(t * Math.PI) * 0.12;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      makeStandard(0xfff2b0, { emissive: 0xffe066, emissiveIntensity: 0.9 })
    );
    bulb.position.set(x, 2.86 - sag, -2.9);
    fairyGroup.add(bulb);
    fairyBulbs.push({ mesh: bulb, phase: Math.random() * Math.PI * 2 });
  }
  animated.push({
    update(t) {
      fairyBulbs.forEach((b) => {
        const s = 0.85 + Math.sin(t * 2 + b.phase) * 0.15;
        b.mesh.scale.setScalar(s);
      });
    },
  });

  // small rounded window on right wall for depth
  const windowFrame = box(0.9, 1.1, 0.05, makeStandard(0xffffff, { roughness: 0.5 }));
  windowFrame.position.set(2.97, 1.9, 1.6);
  windowFrame.rotation.y = -Math.PI / 2;
  room.add(windowFrame);
  const windowGlass = box(0.76, 0.94, 0.02, makeStandard(0x9fd8ff, { emissive: 0x6cc7ff, emissiveIntensity: 0.25, roughness: 0.2 }));
  windowGlass.position.set(2.96, 1.9, 1.6);
  windowGlass.rotation.y = -Math.PI / 2;
  room.add(windowGlass);

  return { clickable, glows, animated, roomGroup: room };
}
