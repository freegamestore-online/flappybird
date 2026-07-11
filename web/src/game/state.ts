// ── Game state & update logic ─────────────────────────────────────────────────
import { randomInRange } from "../lib/canvas";

export type Phase = "title" | "playing" | "paused" | "gameover";

export interface Bird {
  x: number; y: number; vy: number;
  angle: number; wingPhase: number; flapTimer: number;
}

export interface Pipe {
  x: number; gapY: number; gapH: number; passed: boolean;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; size: number; color: string; type: "puff" | "sparkle";
}

export interface Cloud {
  x: number; y: number; w: number; speed: number;
}

export interface GameState {
  phase: Phase;
  bird: Bird;
  pipes: Pipe[];
  particles: Particle[];
  clouds: Cloud[];
  score: number;
  shake: number;        // frames remaining
  shakeX: number; shakeY: number;
  time: number;         // total elapsed seconds
}

const GRAVITY = 1400;
const FLAP = -420;
const BIRD_X = 90;
const PIPE_W = 52;
const BASE_SPEED = 180;
const PIPE_INTERVAL = 260; // px between pipes

export const BIRD_R = 18;

function makePipe(x: number, h: number): Pipe {
  const gapH = Math.max(140, 200 - Math.floor(0) * 2);
  const gapY = randomInRange(80, h - 80 - gapH);
  return { x, gapY, gapH, passed: false };
}

function makeClouds(w: number): Cloud[] {
  return Array.from({ length: 6 }, (_, i) => ({
    x: (i / 6) * w + randomInRange(0, w / 6),
    y: randomInRange(20, 120),
    w: randomInRange(70, 140),
    speed: randomInRange(18, 35),
  }));
}

export function initState(w: number, h: number): GameState {
  return {
    phase: "title",
    bird: { x: BIRD_X, y: h / 2, vy: 0, angle: 0, wingPhase: 0, flapTimer: 0 },
    pipes: [makePipe(w + 60, h), makePipe(w + 60 + PIPE_INTERVAL, h)],
    particles: [],
    clouds: makeClouds(w),
    score: 0,
    shake: 0, shakeX: 0, shakeY: 0,
    time: 0,
  };
}

function spawnPuffs(state: GameState, bx: number, by: number) {
  const colors = ["#fff9c4", "#ffe082", "#fff", "#ffd54f"];
  for (let i = 0; i < 5; i++) {
    state.particles.push({
      x: bx - 10, y: by,
      vx: randomInRange(-60, -20), vy: randomInRange(-60, 60),
      life: 1, size: randomInRange(4, 9),
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
      type: "puff",
    });
  }
}

function spawnSparkles(state: GameState, bx: number, by: number) {
  const colors = ["#f9a825", "#fff176", "#ff8f00", "#ffe57f", "#fff"];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    state.particles.push({
      x: bx, y: by,
      vx: Math.cos(ang) * randomInRange(60, 120),
      vy: Math.sin(ang) * randomInRange(60, 120),
      life: 1, size: randomInRange(3, 7),
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
      type: "sparkle",
    });
  }
}

export function update(
  state: GameState,
  dt: number,
  w: number,
  h: number,
  flap: boolean,
  onScore: (s: number) => void,
  onDie: () => void,
): GameState {
  // deep-ish clone (arrays need new refs for React)
  const s: GameState = {
    ...state,
    bird: { ...state.bird },
    pipes: state.pipes.map(p => ({ ...p })),
    particles: state.particles.map(p => ({ ...p })),
    clouds: state.clouds.map(c => ({ ...c })),
  };

  s.time += dt;
  const speed = BASE_SPEED + Math.min(s.score * 8, 160);
  const gapH = Math.max(130, 210 - s.score * 3);

  // ── clouds ────────────────────────────────────────────────────────────────
  for (const c of s.clouds) {
    c.x -= c.speed * dt;
    if (c.x + c.w < 0) {
      c.x = w + 20;
      c.y = randomInRange(20, 120);
      c.w = randomInRange(70, 140);
    }
  }

  if (s.phase !== "playing") return s;

  // ── bird ──────────────────────────────────────────────────────────────────
  const b = s.bird;
  if (flap) {
    b.vy = FLAP;
    b.flapTimer = 0.18;
    spawnPuffs(s, b.x, b.y);
  }
  b.flapTimer = Math.max(0, b.flapTimer - dt);
  b.wingPhase += dt * 12;
  b.vy += GRAVITY * dt;
  b.y += b.vy * dt;
  b.angle = Math.max(-0.45, Math.min(1.2, b.vy / 600));

  // ── pipes ─────────────────────────────────────────────────────────────────
  for (const p of s.pipes) {
    p.x -= speed * dt;
    if (!p.passed && p.x + PIPE_W < b.x) {
      p.passed = true;
      s.score += 1;
      onScore(s.score);
      spawnSparkles(s, b.x + 30, b.y);
    }
  }
  // recycle off-screen pipes
  s.pipes = s.pipes.filter(p => p.x + PIPE_W > -10);
  const lastX = s.pipes.reduce((mx, p) => Math.max(mx, p.x), 0);
  while (s.pipes.length < 3) {
    const nx = lastX + PIPE_INTERVAL;
    const gy = randomInRange(80, h - 80 - gapH);
    s.pipes.push({ x: nx, gapY: gy, gapH, passed: false });
  }

  // ── particles ─────────────────────────────────────────────────────────────
  for (const p of s.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt * 2.2;
  }
  s.particles = s.particles.filter(p => p.life > 0);

  // ── collision ─────────────────────────────────────────────────────────────
  const ground = h - 48;
  if (b.y + BIRD_R > ground || b.y - BIRD_R < 0) {
    s.phase = "gameover";
    s.shake = 18; s.shakeX = 0; s.shakeY = 0;
    onDie(); return s;
  }
  for (const p of s.pipes) {
    const inX = b.x + BIRD_R - 4 > p.x && b.x - BIRD_R + 4 < p.x + PIPE_W;
    const inY = b.y - BIRD_R + 4 < p.gapY || b.y + BIRD_R - 4 > p.gapY + p.gapH;
    if (inX && inY) {
      s.phase = "gameover";
      s.shake = 18;
      onDie(); return s;
    }
  }

  // ── screen shake ──────────────────────────────────────────────────────────
  if (s.shake > 0) {
    s.shake--;
    s.shakeX = (Math.random() - 0.5) * 10;
    s.shakeY = (Math.random() - 0.5) * 10;
  } else { s.shakeX = 0; s.shakeY = 0; }

  return s;
}
