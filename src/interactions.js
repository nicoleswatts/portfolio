import * as THREE from "three";

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Walk up the parent chain to find the clickable "root" object
// (raycaster hits child meshes, but userData.id lives on the group).
function findClickableRoot(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.id) return current;
    current = current.parent;
  }
  return null;
}

export function setupInteractions({ camera, controls, clickableObjects, canvas, projects, defaultCamera }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const overlay = document.getElementById("overlay");
  const overlayTag = document.getElementById("overlay-tag");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayDesc = document.getElementById("overlay-desc");
  const overlayLink = document.getElementById("overlay-link");
  const overlayClose = document.getElementById("overlay-close");
  const hint = document.getElementById("hint");
  const resetBtn = document.getElementById("reset-view-btn");

  let tween = null; // { startPos, startTarget, endPos, endTarget, startTime, duration, onDone }
  let focused = false;
  let downPos = null;

  // The overview drag range is deliberately tight (see main.js) so the user
  // can't orbit the camera through the walls. Close-up project shots sit far
  // outside that range, so we relax the constraints while focused and restore
  // them once we're back at the default view.
  const overviewLimits = {
    minDistance: controls.minDistance,
    maxDistance: controls.maxDistance,
    minPolarAngle: controls.minPolarAngle,
    maxPolarAngle: controls.maxPolarAngle,
    minAzimuthAngle: controls.minAzimuthAngle,
    maxAzimuthAngle: controls.maxAzimuthAngle,
  };

  function relaxConstraints() {
    controls.minDistance = 0.05;
    controls.maxDistance = Infinity;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
  }

  function restoreConstraints() {
    Object.assign(controls, overviewLimits);
  }

  function tweenCamera(endPos, endTarget, duration, onDone) {
    tween = {
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: new THREE.Vector3(...endPos),
      endTarget: new THREE.Vector3(...endTarget),
      startTime: performance.now(),
      duration,
      onDone,
    };
    controls.enabled = false;
  }

  function updateTween() {
    if (!tween) return;
    const elapsed = performance.now() - tween.startTime;
    const t = Math.min(elapsed / tween.duration, 1);
    const eased = easeInOutCubic(t);
    camera.position.lerpVectors(tween.startPos, tween.endPos, eased);
    controls.target.lerpVectors(tween.startTarget, tween.endTarget, eased);
    controls.update();
    if (t >= 1) {
      const done = tween.onDone;
      tween = null;
      if (done) done();
    }
  }

  function showOverlay(id) {
    const data = projects[id];
    if (!data) return;
    overlayTag.textContent = data.tag;
    overlayTitle.textContent = data.title;
    overlayDesc.textContent = data.description;
    overlayLink.href = data.link;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function focusOn(id) {
    const data = projects[id];
    if (!data) return;
    focused = true;
    relaxConstraints();
    hint.classList.add("hidden");
    resetBtn.classList.remove("hidden");
    tweenCamera(data.camera.position, data.camera.target, 1100, () => {
      showOverlay(id);
    });
  }

  function resetView() {
    hideOverlay();
    resetBtn.classList.add("hidden");
    relaxConstraints();
    tweenCamera(defaultCamera.position, defaultCamera.target, 1000, () => {
      focused = false;
      restoreConstraints();
      controls.enabled = true;
      hint.classList.remove("hidden");
    });
  }

  function getPointerHit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, true);
    if (intersects.length === 0) return null;
    return findClickableRoot(intersects[0].object);
  }

  canvas.addEventListener("pointerdown", (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("pointermove", (e) => {
    if (focused || tween) return;
    const hit = getPointerHit(e);
    canvas.classList.toggle("hovering-clickable", !!hit);
  });

  canvas.addEventListener("pointerup", (e) => {
    if (focused || tween || !downPos) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    downPos = null;
    if (Math.sqrt(dx * dx + dy * dy) > 6) return; // was a drag, not a click
    const hit = getPointerHit(e);
    if (hit) focusOn(hit.userData.id);
  });

  overlayClose.addEventListener("click", resetView);
  resetBtn.addEventListener("click", resetView);

  return { update: updateTween, isFocused: () => focused };
}
