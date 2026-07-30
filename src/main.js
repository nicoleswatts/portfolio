import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildRoom } from "./room.js";
import { setupInteractions } from "./interactions.js";
import { projects, defaultCamera } from "./content.js";

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
scene.fog = new THREE.Fog(0x2a0f1e, 6, 14);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(...defaultCamera.position);

// ---------------- lighting ----------------
const hemi = new THREE.HemisphereLight(0xffd9ec, 0x6b3a55, 0.9);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(2, 4, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 4;
key.shadow.camera.bottom = -4;
scene.add(key);

const fill = new THREE.PointLight(0xff9ecf, 0.5, 8);
fill.position.set(-2, 2, 2);
scene.add(fill);

const ambient = new THREE.AmbientLight(0xffe6f2, 0.35);
scene.add(ambient);

// ---------------- room ----------------
const { clickable, glows, animated } = buildRoom(scene);

// ---------------- controls ----------------
const controls = new OrbitControls(camera, canvas);
controls.target.set(...defaultCamera.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
// Kept deliberately tight: this is the *overview* orbit range, and the room
// walls are only ~3 units from center, so wide swings at this distance would
// push the camera clean through them. (Close-up project shots use their own
// unconstrained range — see relaxConstraints() in interactions.js.)
controls.minDistance = 5.6;
controls.maxDistance = 6.4;
controls.minPolarAngle = Math.PI * 0.32;
controls.maxPolarAngle = Math.PI * 0.42;
controls.minAzimuthAngle = -Math.PI * 0.1;
controls.maxAzimuthAngle = Math.PI * 0.1;
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

// ---------------- loading screen ----------------
const loadingScreen = document.getElementById("loading-screen");
const loadingFill = document.querySelector(".loading-bar-fill");
let progress = 0;
const loadingInterval = setInterval(() => {
  progress = Math.min(progress + 8 + Math.random() * 10, 100);
  loadingFill.style.width = `${progress}%`;
  if (progress >= 100) {
    clearInterval(loadingInterval);
    setTimeout(() => loadingScreen.classList.add("hidden"), 250);
  }
}, 70);

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
