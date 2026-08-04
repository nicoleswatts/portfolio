// Edit this file to swap in your real projects.
// Each key matches an object's `userData.id`, set in main.js on a node found
// inside the loaded room2.glb (see the TODO in main.js — nothing is wired up
// to a clickable object yet, so these three entries are dormant placeholders
// until specific meshes are picked out).
// `camera` is where the camera flies to when this object is clicked:
//   position: where the camera sits, target: what it looks at.

// Default "step back and look at the whole room" camera.
// room2.glb's walls sit at roughly x:-10..10 / z:-10..10, open on the +X
// side, so this looks in from outside that opening. Rough starting guess —
// adjust once you've seen the actual model framed.
export const defaultCamera = {
  position: [16, 6, 0],
  target: [0, 2.5, 0],
};

export const projects = {
  lavaLamp: {
    tag: "project 01",
    title: "Lava Lamp",
    description:
      "Placeholder project slot. Swap this description with a real case study, then point the link below at it.",
    link: "#",
    camera: {
      position: [1.85, 1.1, -1.85],
      target: [2.65, 0.85, -2.7],
    },
  },
  princessTv: {
    tag: "project 02",
    title: "Princess TV",
    description:
      "Placeholder project slot. Swap this description with a real case study, then point the link below at it.",
    link: "#",
    camera: {
      position: [0.66, 1.39, 0.3],
      target: [2.2, 1.17, 0.3],
    },
  },
  magazines: {
    tag: "project 03",
    title: "Magazine Stack",
    description:
      "Placeholder project slot. Swap this description with a real case study, then point the link below at it.",
    link: "#",
    camera: {
      position: [0.35, 0.95, 2.7],
      target: [0.2, 0.12, 1.7],
    },
  },
};
