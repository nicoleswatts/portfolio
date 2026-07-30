import * as THREE from "three";
import { createLeopardTexture, createFuzzTexture, createStripeTexture } from "./textures.js";

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
};

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
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.1, 0.008, 0.6);
  rug.receiveShadow = true;
  room.add(rug);

  // ================= BED (ambient, not clickable) =================
  const bed = new THREE.Group();
  bed.position.set(-2.15, 0, -1.1);
  room.add(bed);

  const frameMat = makeStandard(PALETTE.hotPink, { roughness: 0.5 });
  const frame = box(1.5, 0.4, 2.7, frameMat);
  frame.position.y = 0.2;
  bed.add(frame);

  const legMat = makeStandard(PALETTE.chrome, { metalness: 0.9, roughness: 0.2 });
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

  const leopardBlanket = box(1.46, 0.1, 1.6, rugMat);
  leopardBlanket.position.set(0, 0.67, 0.45);
  bed.add(leopardBlanket);

  // headboard
  const headboard = box(1.5, 0.9, 0.12, makeStandard(PALETTE.hotPink, { roughness: 0.5 }));
  headboard.position.set(0, 0.65, -1.31);
  bed.add(headboard);
  const heart = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 16, Math.PI), makeStandard(PALETTE.gold, { metalness: 0.6, roughness: 0.3 }));
  heart.position.set(0, 0.85, -1.24);
  heart.rotation.z = Math.PI;
  bed.add(heart);

  // pillows
  for (const dx of [-0.42, 0.42]) {
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), makeStandard(0xffffff, { roughness: 0.95 }));
    pillow.scale.set(1, 0.55, 0.75);
    pillow.position.set(dx, 0.68, -0.95);
    bed.add(pillow);
  }

  // ================= DESK + LAVA LAMP (clickable) =================
  const desk = new THREE.Group();
  desk.position.set(1.7, 0, -2.55);
  room.add(desk);

  const deskLegMat = makeStandard(PALETTE.chrome, { metalness: 0.9, roughness: 0.15 });
  const deskTop = box(1.5, 0.06, 0.6, makeStandard(0xffffff, { roughness: 0.35 }));
  deskTop.position.y = 0.75;
  desk.add(deskTop);
  for (const [dx, dz] of [
    [-0.68, -0.24],
    [0.68, -0.24],
    [-0.68, 0.24],
    [0.68, 0.24],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), deskLegMat);
    leg.position.set(dx, 0.375, dz);
    desk.add(leg);
  }

  // small chair
  const chair = new THREE.Group();
  chair.position.set(0.1, 0, 0.75);
  const seat = box(0.5, 0.06, 0.5, makeStandard(PALETTE.pink, { roughness: 0.6 }));
  seat.position.y = 0.45;
  chair.add(seat);
  const seatBack = box(0.5, 0.5, 0.06, makeStandard(PALETTE.pink, { roughness: 0.6 }));
  seatBack.position.set(0, 0.7, -0.22);
  chair.add(seatBack);
  const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), deskLegMat);
  chairPole.position.y = 0.22;
  chair.add(chairPole);
  desk.add(chair);

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

  // little desk lamp for ambience (non-clickable)
  const deskLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 12), deskLegMat);
  deskLampBase.position.set(-0.55, 0.79, -0.15);
  desk.add(deskLampBase);
  const deskLampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), deskLegMat);
  deskLampPole.position.set(-0.55, 0.9, -0.15);
  desk.add(deskLampPole);
  const deskLampShade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 12, 1, true), makeStandard(PALETTE.gold, { side: THREE.DoubleSide }));
  deskLampShade.position.set(-0.55, 1.06, -0.15);
  desk.add(deskLampShade);

  // ================= DRESSER + PRINCESS TV (clickable) =================
  const dresser = new THREE.Group();
  dresser.position.set(2.55, 0, 0.3);
  room.add(dresser);

  const dresserBody = box(0.55, 0.85, 1.3, makeStandard(0xffffff, { roughness: 0.4 }));
  dresserBody.position.y = 0.425;
  dresser.add(dresserBody);
  for (const dz of [-0.4, 0, 0.4]) {
    const drawer = box(0.5, 0.22, 0.05, makeStandard(PALETTE.pink, { roughness: 0.5 }));
    drawer.position.set(-0.29, 0.35, dz);
    dresser.add(drawer);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), makeStandard(PALETTE.gold, { metalness: 0.7 }));
    knob.position.set(-0.32, 0.35, dz);
    dresser.add(knob);
  }

  const tv = new THREE.Group();
  tv.position.set(-0.35, 0.85, 0);
  tv.userData.id = "princessTv";
  dresser.add(tv);

  const tvBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), makeStandard(PALETTE.pink, { roughness: 0.45 }));
  tvBody.scale.set(1, 0.82, 0.92);
  tv.add(tvBody);

  const screenMat = makeStandard(PALETTE.screenPink, { emissive: 0xff9ecf, emissiveIntensity: 0.4, roughness: 0.2 });
  const screen = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), screenMat);
  screen.position.set(-0.28, 0.02, 0);
  screen.rotation.y = -Math.PI / 2;
  tv.add(screen);
  const screenRim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 8, 24), makeStandard(PALETTE.hotPink, { roughness: 0.4 }));
  screenRim.position.set(-0.29, 0.02, 0);
  screenRim.rotation.y = Math.PI / 2;
  tv.add(screenRim);

  // tiara on top
  const tiara = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 20, Math.PI), makeStandard(PALETTE.gold, { metalness: 0.8, roughness: 0.15 }));
  tiara.rotation.x = Math.PI;
  tiara.position.set(0, 0.28, 0);
  tv.add(tiara);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), makeStandard(0xffffff, { metalness: 0.3, roughness: 0.1, emissive: 0xffe0f5, emissiveIntensity: 0.6 }));
  gem.position.set(0, 0.42, 0);
  tv.add(gem);

  // antenna "ears"
  for (const dx of [-0.14, 0.14]) {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), makeStandard(PALETTE.chrome, { metalness: 0.8 }));
    antenna.position.set(dx, 0.4, 0);
    antenna.rotation.z = dx > 0 ? -0.3 : 0.3;
    tv.add(antenna);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), makeStandard(PALETTE.gold, { metalness: 0.6 }));
    tip.position.set(dx * 1.7, 0.53, 0);
    tv.add(tip);
  }

  const tvLight = new THREE.PointLight(0xffb3dd, 0.6, 1.2);
  tvLight.position.set(-0.4, 0, 0);
  tv.add(tvLight);
  animated.push({
    update(t) {
      screenMat.emissiveIntensity = 0.35 + Math.sin(t * 2.2) * 0.15;
    },
  });

  addGlow(tv, 0xff8fc4, 0.55, 0);
  clickable.push(tv);
  glows.push(tv.children[tv.children.length - 1]);

  // mirror above dresser
  const mirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 10, 24), makeStandard(PALETTE.gold, { metalness: 0.7, roughness: 0.25 }));
  mirrorFrame.position.set(2.5, 1.7, -0.35);
  mirrorFrame.rotation.y = Math.PI / 2;
  room.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), makeStandard(0xcfe8ff, { metalness: 0.9, roughness: 0.05 }));
  mirrorGlass.position.set(2.48, 1.7, -0.35);
  mirrorGlass.rotation.y = Math.PI / 2;
  room.add(mirrorGlass);

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
  discoBall.position.set(-0.3, 2.55, -1.6);
  room.add(discoBall);
  const discoLight = new THREE.PointLight(0xff6fb0, 0.8, 3);
  discoLight.position.copy(discoBall.position);
  room.add(discoLight);
  const discoString = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 6), makeStandard(0x999999));
  discoString.position.set(-0.3, 2.75, -1.6);
  room.add(discoString);
  animated.push({
    update(t) {
      discoBall.rotation.y = t * 0.6;
      discoLight.color.setHSL((t * 0.05) % 1, 0.7, 0.7);
    },
  });

  // beanbag
  const beanbag = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    makeStandard(0xffffff, { map: createFuzzTexture({ base: "#ff9ecf", speckle: "#ffd3ea" }), roughness: 1 })
  );
  beanbag.scale.set(1, 0.65, 1);
  beanbag.position.set(-1.0, 0.28, 1.6);
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
