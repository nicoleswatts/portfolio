# y2k bedroom portfolio

A 3D Y2K bedroom you can look around and click into — built with [Three.js](https://threejs.org/), no build step, no external 3D assets (everything is generated procedurally: the low-poly furniture out of primitives, the leopard print out of canvas).

Three objects are currently clickable and open a project panel: the **lava lamp**, the **princess TV**, and the **magazine stack**. Clicking one zooms the camera in and slides in an overlay with a title/description/link. Everything else in the room (bed, disco ball, beanbag, posters, fairy lights, mirror) is ambient decor.

## Running it locally

No install, no build tool — just a static site. From this folder, serve it with any static server, e.g.:

```bash
python3 -m http.server 4321
```

Then open `http://localhost:4321`. (Opening `index.html` directly via `file://` won't work — browsers block ES module imports over `file://`.)

## Editing your content

Everything project-related lives in **`src/content.js`**. It's the only file you should need to touch to update what shows up when someone clicks an object:

```js
lavaLamp: {
  tag: "project 01",
  title: "Lava Lamp",
  description: "...",
  link: "https://your-real-project-link.com",
  camera: { position: [...], target: [...] }, // don't need to touch this
},
```

Just swap in your real `title`, `description`, and `link` for each of the three entries (`lavaLamp`, `princessTv`, `magazines`). Leave the `camera` values alone unless you also move the corresponding object in `room.js`.

## Project structure

```
index.html          – page shell, loading screen, HUD, overlay markup
src/style.css        – all styling (Y2K palette, overlay panel, HUD)
src/content.js       – EDIT THIS: your project titles/descriptions/links
src/main.js          – scene setup, camera, lights, render loop
src/room.js          – the room itself: all furniture built from primitives
src/textures.js      – procedural leopard print / fuzz / stripe canvas textures
src/interactions.js  – click-to-raycast, camera zoom tween, overlay panel logic
```

## Adding more clickable objects

1. In `room.js`, build (or find) the object/group you want clickable and give it `yourGroup.userData.id = "someId"`, then push it into the `clickable` array that `buildRoom()` returns. Optionally call `addGlow(yourGroup, color, scale)` on it so it gets the pulsing "click me" halo.
2. In `content.js`, add a matching entry keyed `someId` with `tag`, `title`, `description`, `link`, and a `camera.position` / `camera.target` for where the camera should fly to (world-space coordinates — trial and error is normal here, just reload and check).

## Deploying to GitHub Pages

1. Create a new GitHub repository (via [github.com/new](https://github.com/new) or `gh repo create`) — do **not** initialize it with a README since this folder already has one.
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. On GitHub: go to the repo's **Settings → Pages**. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. After a minute or two, your site will be live at `https://<your-username>.github.io/<your-repo>/`.

Because this is a plain static site (no build step, no `node_modules`), that's the entire deployment — any time you push changes to `main`, GitHub Pages redeploys automatically.

## Notes / things you might want to tweak

- **Palette & furniture**: all colors and shapes live in `room.js` (see the `PALETTE` object at the top) — easy to retint or resize things.
- **Camera framing**: `defaultCamera` in `content.js` is the "step back" overview shot; the orbit range for free-look dragging is intentionally tight (see the comments in `main.js` around `controls.minAzimuthAngle`) so you can't drag the camera through the walls. Widen it if you add more room to look around, but test carefully — too wide and the camera can push through the walls at the distance it orbits at.
- **Mobile**: touch dragging works via OrbitControls' built-in touch support, and click-to-zoom is pointer-event based so it works with taps too. Not yet tested on small screens for object glow visibility/hit-testing — worth a pass before sharing widely.
