export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 144;

/** Fallback gravity. Each form carries its own — see FORMS in forms.ts. */
export const GRAVITY = 480; // px/s^2
export const FIXED_DT = 1 / 120; // physics substep, small enough no fall skips a platform in one step

/**
 * The hitbox is held in from the canvas edges, because every robot sprite
 * overhangs it — up to 2px each side on the water form's landing frame, and
 * 2px above. Clamping the hitbox to the raw canvas would still shave an arm
 * off against the wall.
 */
export const WORLD_BOUNDS = {
  minX: 2,
  minY: 2,
  maxX: CANVAS_WIDTH - 2,
  maxY: CANVAS_HEIGHT,
};

export type Palette = Record<number, string>;

// The scene is lit warm from the upper left, so every material's highlight
// leans warm and its shadow leans cool-violet to sit in the toybox interior.

export const ROBOT_PALETTE: Palette = {
  1: "#161d2b", // outline
  2: "#c3ced9", // hull plating
  3: "#f4f9fc", // hull highlight
  4: "#8593a3", // hull shadow
  5: "#5d6a7c", // hull deep shadow
  6: "#25d9ff", // visor glow
  7: "#c6f7ff", // visor highlight
  8: "#ff7a45", // indicator light
  9: "#ffd48a", // indicator bloom
};

export const WATER_ROBOT_PALETTE: Palette = {
  1: "#12303f", // outline
  2: "#7fd4e8", // water-filled shell
  3: "#cdf4fd", // shell highlight
  4: "#3f9dc0", // water settled in the belly
  5: "#2b7f9e", // deep shadow
  6: "#25d9ff", // visor glow
  7: "#c6f7ff", // visor highlight
  8: "#ff7a45", // indicator light
  9: "#eafcff", // droplet sparkle
};

/** Puddle, pressure plate, conduit and portcullis. */
export const PUZZLE_PALETTE = {
  waterDeep: "#1d5f80",
  waterMid: "#3fa0c8",
  waterLight: "#7fd4e8",
  waterGlint: "#eafcff",
  plateFrame: "#2e2116",
  plateFace: "#b9c2cd",
  plateFaceLit: "#8fe3b0",
  plateStripe: "#7d8794",
  plateStripeLit: "#5fbf8a",
  plateRim: "#e6edf5",
  conduitOff: "#3c3454",
  conduitOn: "#7ef0c0",
  metal: "#6b7686",
  metalLight: "#9aa7b6",
  metalDark: "#333c48",
  doorway: "#140e22",
};

export const PLATFORM_PALETTE: Palette = {
  1: "#3d2415", // outline
  2: "#b5773c", // wood base
  3: "#d9a063", // wood highlight
  4: "#8a5227", // wood shadow
  5: "#6b3d1c", // wood seam
  6: "#f4cd94", // sunlit top rim
};

export const TOY_BALL_PALETTE: Palette = {
  1: "#4a1230", // outline
  2: "#ef4b6b", // red panel
  3: "#ffd166", // yellow panel
  4: "#4dd4c4", // teal panel
  5: "#fff6e8", // specular
  6: "#c2304f", // shaded panel
};

export const TOY_BLOCK_PALETTE: Palette = {
  1: "#1b2a4a", // outline
  2: "#4a7fe0", // blue face
  3: "#7fb0f5", // blue lit face
  4: "#2f5bb0", // blue shadow
  5: "#ffe066", // painted letter
  6: "#a8cdff", // blue top rim
  7: "#5fbf6a", // green face
  8: "#96e59d", // green top rim
  9: "#3d8a49", // green shadow
};

export const TOY_PLUSH_PALETTE: Palette = {
  1: "#4a2c14", // outline
  2: "#cf9552", // fur base
  3: "#eec38a", // fur highlight
  4: "#a06f36", // fur shadow
  5: "#2b1a0e", // eyes and nose
  6: "#f7dcb5", // muzzle and belly
};

export const TOY_ROCKET_PALETTE: Palette = {
  1: "#3a1620", // outline
  2: "#eef3f8", // hull
  3: "#ffffff", // hull highlight
  4: "#bcc7d2", // hull shadow
  5: "#ef4b6b", // nose and fins
  6: "#9fe8ff", // porthole glass
};
