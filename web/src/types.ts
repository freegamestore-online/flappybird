// ─── Game Types ────────────────────────────────────────────────────────────────

export type GamePhase = "title" | "playing" | "paused" | "gameover";

export interface Bird {
  x: number;
  y: number;
  vy: number;        // vertical velocity
  angle: number;     // rotation angle in radians
  flapTimer: number; // counts down after a flap for wing animation
  bobOffset: number; // idle bob phase
}

export interface Pipe {
  x: number;
  gapY: number;      // center Y of the gap
  gapH: number;      // height of the gap
  scored: boolean;
  swayPhase: number; // for gentle sway animation
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0–1, decrements each frame
  decay: number;
  size: number;
  color: string;
  type: "feather" | "sparkle" | "puff";
}

export interface Hill {
  x: number;
  y: number;
  rx: number;        // x-radius
  ry: number;        // y-radius
  color: string;
  speed: number;
}

export interface Flower {
  x: number;
  y: number;
  color: string;
  phase: number;
  size: number;
}

export interface Settings {
  musicOn: boolean;
  soundOn: boolean;
}
