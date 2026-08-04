import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { setupInteractions } from "./interactions.js";
import { projects, defaultCamera } from "./content.js";
import { patchBlackBlobs } from "./texturePatch.js";

const canvas = document.getElementById("scene");

// ---------------- renderer ----------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------------- scene & camera ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a0f1e);
// room2.glb is roughly 20 units across (vs. the old procedural room's 6),
// so fog needs to reach much further out before anything gets swallowed.
scene.fog = new THREE.Fog(0x2a0f1e, 20, 45);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(...defaultCamera.position);

// ---------------- lighting ----------------
const hemi = new THREE.HemisphereLight(0xffd9ec, 0x6b3a55, 1.0);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(8, 14, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -14;
key.shadow.camera.right = 14;
key.shadow.camera.top = 14;
key.shadow.camera.bottom = -14;
key.shadow.camera.far = 45;
scene.add(key);

const fill = new THREE.PointLight(0xff9ecf, 0.6, 24);
fill.position.set(-6, 6, 6);
scene.add(fill);

const ambient = new THREE.AmbientLight(0xffe6f2, 0.5);
scene.add(ambient);

// ---------------- room (loaded from Blender) ----------------
// TODO: once specific meshes/nodes to make clickable are picked out, find
// them via gltf.scene.getObjectByName(...) in the loader callback below,
// set <node>.userData.id = "someKeyInContentJs", and clickable.push(node)
// (+ addGlow-equivalent if a hover halo is wanted). clickable/glows/animated
// are passed by reference into setupInteractions before the model finishes
// loading, so pushing into them later still works.
const clickable = [];
const glows = [];
const animated = [];

// ---------------- controls ----------------
const controls = new OrbitControls(camera, canvas);
controls.target.set(...defaultCamera.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
// room2.glb's three walls form a U open on the +X side (verified from the
// loaded model's bounding box), so the safe orbit range is centered on
// azimuth = +90° (OrbitControls measures azimuth from the +Z axis via
// atan2(x, z), NOT from wherever the camera starts — a plain ±range around
// 0 would swing the camera toward the z-walls instead of staying on the
// open side). Confirmed clipping-free at all four boundary combinations by
// simulating extreme drags/zooms and checking the resulting position stays
// outside the x:-10..10 / z:-10..9.85 wall footprint.
controls.minDistance = 14;
controls.maxDistance = 20;
controls.minPolarAngle = Math.PI * 0.3;
controls.maxPolarAngle = Math.PI * 0.45;
controls.minAzimuthAngle = Math.PI / 2 - 0.18;
controls.maxAzimuthAngle = Math.PI / 2 + 0.18;
controls.update();

// ---------------- interactions ----------------
const interactions = setupInteractions({
  camera,
  controls,
  clickableObjects: clickable,
  canvas,
  projects,
  defaultCamera,
});

// ---------------- resize ----------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- loading screen (real GLB download progress) ----------------
const loadingScreen = document.getElementById("loading-screen");
const loadingText = document.querySelector(".loading-text");
const loadingFill = document.querySelector(".loading-bar-fill");

function setLoadingProgress(pct) {
  loadingFill.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
}

// Some of room2.glb's source diffuse textures have irregular near-black
// blobs baked into the pixel data (confirmed by inspecting the raw images —
// not a UV/transparency/loading bug). This clone-stamps over them at load
// time as a cosmetic stopgap; see texturePatch.js for the real explanation
// and its limits. The actual fix is patching the source textures in Blender.
function patchMaterialTextures(root) {
  const seen = new Map(); // source texture uuid -> patched THREE.CanvasTexture (or null if nothing to fix)
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      const tex = mat?.map;
      if (!tex || !tex.image) return;
      if (!seen.has(tex.uuid)) {
        let patched = null;
        try {
          const canvas = patchBlackBlobs(tex.image);
          if (canvas) {
            patched = new THREE.CanvasTexture(canvas);
            patched.colorSpace = tex.colorSpace;
            patched.wrapS = tex.wrapS;
            patched.wrapT = tex.wrapT;
            patched.repeat.copy(tex.repeat);
            patched.offset.copy(tex.offset);
            patched.flipY = tex.flipY;
            patched.anisotropy = tex.anisotropy;
          }
        } catch (err) {
          console.warn("Texture patch failed for", tex.name || tex.uuid, err);
        }
        seen.set(tex.uuid, patched);
      }
      const patched = seen.get(tex.uuid);
      if (patched) {
        mat.map = patched;
        mat.needsUpdate = true;
      }
    });
  });
  return seen.size;
}

// The scattered magazine/photo props on the rug are built from a few hundred
// triangles each — clearly meant to be masked by a texture alpha channel
// down into a soft torn-paper silhouette, the same way the bed's tufted
// panels use extra geometry for detail. But the alpha channel is missing
// entirely (checked: every pixel comes back fully opaque, no vertex colors
// either), so none of that geometry gets masked and it all renders as solid
// jagged shards instead. There's no data left anywhere in the file to
// recover the intended shape from, so the fix is structural: replace each
// with a simple flat plane sized to its own bounding box, keeping the same
// texture/position/rotation. Named explicitly rather than auto-detected by
// triangle count, since a generic "simplify anything complex" pass would
// also catch legitimately-detailed geometry elsewhere (the headboard, the
// curtains) that isn't broken.
const FLATTEN_TO_PLANE = ["s4studio_mesh_1004", "s4studio_mesh_1005", "s4studio_mesh_1008", "s4studio_mesh_1009"];

function simplifyToFlatPlane(mesh) {
  const pos = mesh.geometry.attributes.position;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const extentX = maxX - minX;
  const extentY = maxY - minY;
  const extentZ = maxZ - minZ;
  // The flattest axis is the plane's normal direction — these props lie on
  // the floor, so it's Y for all of them, but handle wall/other cases too.
  const flatAxis = [extentX, extentY, extentZ].indexOf(Math.min(extentX, extentY, extentZ));

  let newGeo;
  if (flatAxis === 1) {
    newGeo = new THREE.PlaneGeometry(extentX, extentZ);
    newGeo.rotateX(-Math.PI / 2);
  } else if (flatAxis === 2) {
    newGeo = new THREE.PlaneGeometry(extentX, extentY);
  } else {
    newGeo = new THREE.PlaneGeometry(extentZ, extentY);
    newGeo.rotateY(Math.PI / 2);
  }
  newGeo.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  mesh.material.side = THREE.DoubleSide; // a single flat plane has no "inside" to rely on culling for

  if (mesh.isSkinnedMesh) {
    // Three of these four props turned out to be SkinnedMesh, rigged to one
    // of the bone armatures bundled in the file — a likely actual source of
    // the shattering (broken bind/bone transforms exploding vertices at
    // render time), on top of or instead of the missing-alpha theory.
    // Swapping just .geometry would leave a SkinnedMesh instance with no
    // skinIndex/skinWeight attributes, which renders fine here but crashes
    // other code paths that expect them (found via Box3.expandByObject).
    // Replace it with a plain Mesh entirely so no skinning code runs on it.
    const plain = new THREE.Mesh(newGeo, mesh.material);
    plain.name = mesh.name;
    plain.position.copy(mesh.position);
    plain.quaternion.copy(mesh.quaternion);
    plain.scale.copy(mesh.scale);
    plain.castShadow = mesh.castShadow;
    plain.receiveShadow = mesh.receiveShadow;
    const parent = mesh.parent;
    parent.add(plain);
    parent.remove(mesh);
    mesh.geometry.dispose();
    return;
  }

  mesh.geometry.dispose();
  mesh.geometry = newGeo;
}

function simplifyFlatProps(root) {
  let count = 0;
  FLATTEN_TO_PLANE.forEach((name) => {
    const obj = root.getObjectByName(name);
    if (obj?.isMesh) {
      simplifyToFlatPlane(obj);
      count++;
    }
  });
  return count;
}

const loader = new GLTFLoader();
loader.load(
  "assets/room2.glb",
  (gltf) => {
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    if (loadingText) loadingText.textContent = "✧ patching textures ✧";
    // Synchronous and can take a beat on ~19 textures — the loading screen
    // is still up, so a short pause here reads as "still loading" rather
    // than a jarring pop-in of fixed textures after the room is visible.
    setTimeout(() => {
      patchMaterialTextures(gltf.scene);
      simplifyFlatProps(gltf.scene);
      scene.add(gltf.scene);
      setLoadingProgress(100);
      setTimeout(() => loadingScreen.classList.add("hidden"), 250);
    }, 30);
  },
  (xhr) => {
    if (xhr.total) setLoadingProgress((xhr.loaded / xhr.total) * 100);
  },
  (error) => {
    console.error("Failed to load assets/room2.glb", error);
    if (loadingText) loadingText.textContent = "✧ couldn't load the room ✧";
  }
);

// ---------------- render loop ----------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  animated.forEach((a) => a.update(t));
  glows.forEach((g) => {
    const s = g.userData.baseScale * (1 + Math.sin(t * 2.4) * 0.12);
    g.scale.set(s, s, 1);
    g.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  });

  interactions.update();
  if (!interactions.isFocused()) controls.update();

  renderer.render(scene, camera);
}

animate();
