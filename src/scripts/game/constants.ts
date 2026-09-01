export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 144;

export const GRAVITY = 480; // px/s^2
export const FIXED_DT = 1 / 120; // physics substep, small enough no fall skips a platform in one step
export const MOVE_SPEED = 70; // px/s
export const JUMP_VELOCITY = -210; // px/s
export const GROUND_FRICTION = 0.82; // velocity multiplier per frame when no input

export const ROBOT_WIDTH = 12;
export const ROBOT_HEIGHT = 14;

export type Palette = Record<number, string>;

export const ROBOT_PALETTE: Palette = {
  1: "#1a2230", // outline
  2: "#b8c2cc", // hull plating
  3: "#eef3f6", // hull highlight
  4: "#7c8a96", // hull shadow
  5: "#1fd6ff", // visor glow
  6: "#c8faff", // visor highlight
  7: "#ff6a3d", // indicator light
};

export const PLATFORM_PALETTE: Palette = {
  1: "#4a2c1d", // outline
  2: "#a8672f", // wood base
  3: "#c98a4c", // wood highlight
  4: "#7a4a24", // wood shadow
};

export const TOY_BALL_PALETTE: Palette = {
  1: "#7a1230",
  2: "#e0344f",
  3: "#f78ba0",
  4: "#a3182f",
  5: "#fdf6e3",
};

export const TOY_BLOCK_PALETTE: Palette = {
  1: "#1c3a6e",
  2: "#3f6fd6",
  3: "#7fa4ec",
  4: "#274c9c",
  5: "#f2d94e",
};

export const TOY_PLUSH_PALETTE: Palette = {
  1: "#5c3a1e",
  2: "#c98b4a",
  3: "#e4b478",
  4: "#8a5a2c",
  5: "#2b1a0e",
};
