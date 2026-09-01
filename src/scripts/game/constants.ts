export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 144;

export const GRAVITY = 480; // px/s^2
export const FIXED_DT = 1 / 120; // physics substep, small enough no fall skips a platform in one step
export const MOVE_SPEED = 70; // px/s
export const JUMP_VELOCITY = -210; // px/s
export const GROUND_FRICTION = 0.82; // velocity multiplier per frame when no input

export const ROBOT_WIDTH = 12;
export const ROBOT_HEIGHT = 14;

/** The sprite overhangs the hitbox slightly so it has room for shoulders and feet. */
export const ROBOT_SPRITE_OFFSET_X = -1;
export const ROBOT_SPRITE_OFFSET_Y = -2;

/**
 * The hitbox is held a little in from the canvas edges, because the sprite
 * overhangs it: 1px each side and 2px above. Clamping the hitbox to the raw
 * canvas would still shave the robot's arm off against the wall.
 */
export const WORLD_BOUNDS = {
  minX: 1,
  minY: 2,
  maxX: CANVAS_WIDTH - 1,
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
