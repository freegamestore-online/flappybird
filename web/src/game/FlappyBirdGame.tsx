import { useRef, useEffect, useCallback } from "react";
import { useGameLoop } from "../hooks/useGameLoop";
import { useHighScore } from "../hooks/useHighScore";
import { drawText, randomInRange, hexToRgba } from "../lib/canvas";
import { GAME_TITLE } from "./title";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Bird { x: number; y: number; vy: number; flapTimer: number; wingAngle: number; }
interface Pipe { x: number; gapY: number; gapH: number; passed: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; type: "puff" | "sparkle"; }
interface Cloud { x: number; y: number; w: number; h: number; speed: number; }

// ── Constants ──────────────────────────────────────────────────────────────────
const GRAVITY = 1400;
const FLAP = -480;
const BIRD_R = 18;
const PIPE_W = 52;
const BASE_PIPE_SPEED = 180;
const PIPE_INTERVAL = 280;
const BASE_GAP = 175;
const MIN_GAP = 130;
const GROUND_H = 56;

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeCloud(x: number, h: number): Cloud {
  return { x, y: randomInRange(30, h * 0.45), w: randomInRange(70, 140), h: randomInRange(30, 55), speed: randomInRange(18, 35) };
}
function makePipe(x: number, ch: number, score: number): Pipe {
  const gapH = Math.max(MIN_GAP, BASE_GAP - score * 2);
  const gapY = randomInRange(60, ch - GROUND_H - gapH - 60);
  return { x, gapY, gapH, passed: false };
}
function spawnParticles(arr: Particle[], x: number, y: number, type: "puff" | "sparkle") {
  const colors = type === "sparkle"
    ? ["#34d399", "#a5b4fc", "#93c5fd", "#ffffff"]
    : ["#fff", "#e2e8f0", "#f1f5f9"];
  for (let i = 0; i < (type === "sparkle" ? 10 : 5); i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = randomInRange(type === "sparkle" ? 60 : 30, type === "sparkle" ? 160 : 90);
    arr.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - (type === "sparkle" ? 40 : 0), life: 1, color: colors[Math.floor(Math.random() * colors.length)]!, size: randomInRange(3, type === "sparkle" ? 8 : 5), type });
  }
}

// ── Draw helpers ───────────────────────────────────────────────────────────────
// Paper plane: a folded dart with swept wings. Flapping flicks the wing tips.
function drawBird(ctx: CanvasRenderingContext2D, b: Bird, t: number) {
  const angle = Math.min(Math.max(b.vy / 900, -0.4), 0.9);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const flick = b.flapTimer > 0 ? Math.sin(b.flapTimer * 18) * 0.35 : Math.sin(t * 4) * 0.08;
  const wingTip = BIRD_R * 0.95 + flick * BIRD_R;

  // Far wing (darker, behind the fuselage)
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(-BIRD_R * 0.1, 0);
  ctx.lineTo(-BIRD_R * 0.5, -wingTip);
  ctx.lineTo(-BIRD_R * 0.7, 0);
  ctx.closePath();
  ctx.fill();

  // Fuselage: pointed nose at +x, notched tail at -x
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(BIRD_R * 1.15, 0);
  ctx.lineTo(-BIRD_R * 0.85, -BIRD_R * 0.6);
  ctx.lineTo(-BIRD_R * 0.5, 0);
  ctx.lineTo(-BIRD_R * 0.85, BIRD_R * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Near wing (light, with the flick)
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(BIRD_R * 0.2, -BIRD_R * 0.05);
  ctx.lineTo(-BIRD_R * 0.3, -wingTip * 0.9);
  ctx.lineTo(-BIRD_R * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emerald fold line down the centre
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BIRD_R * 1.05, 0);
  ctx.lineTo(-BIRD_R * 0.5, 0);
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(BIRD_R * 0.35, -BIRD_R * 0.2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe, ch: number) {
  const { x, gapY, gapH } = pipe;
  const w = PIPE_W;

  drawPillar(ctx, x, 0, w, gapY);
  drawPillar(ctx, x, gapY + gapH, w, ch - GROUND_H - gapY - gapH);
}

// Brand-colour pillar: emerald shaft with a lip where it meets the gap
function drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  if (h <= 0) return;
  ctx.fillStyle = "#10b981";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#34d399";
  ctx.fillRect(x + 6, y, 7, h);
  ctx.fillStyle = "#047857";
  ctx.fillRect(x + w - 7, y, 7, h);

  const lipY = y === 0 ? y + h - 18 : y - 2;
  ctx.fillStyle = "#059669";
  ctx.beginPath();
  ctx.roundRect(x - 6, lipY, w + 12, 20, 6);
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#dbeafe");
  sky.addColorStop(0.6, "#eef2ff");
  sky.addColorStop(1, "#f8fafc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[]) {
  clouds.forEach(c => {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(100,180,255,0.18)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.35, c.y + c.h * 0.1, c.w * 0.6, c.h * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.35, c.y + c.h * 0.1, c.w * 0.55, c.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, scrollX: number) {
  const gy = h - GROUND_H;
  // Hill silhouette
  ctx.fillStyle = "#c7d2fe";
  ctx.beginPath();
  ctx.moveTo(0, gy + 10);
  for (let x = 0; x <= w + 80; x += 40) {
    const hh = Math.sin((x + scrollX * 0.3) * 0.018) * 18 + Math.sin((x + scrollX * 0.3) * 0.009) * 12;
    ctx.lineTo(x, gy + 10 - hh);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Ground strip
  ctx.fillStyle = "#a5b4fc";
  ctx.fillRect(0, gy, w, 14);
  ctx.fillStyle = "#e0e7ff";
  ctx.fillRect(0, gy + 14, w, GROUND_H - 14);

  // Texture lines
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  const tileW = 40;
  const offset = scrollX % tileW;
  for (let x = -offset; x < w; x += tileW) {
    ctx.beginPath();
    ctx.moveTo(x, gy + 16);
    ctx.lineTo(x + tileW * 0.6, gy + 16);
    ctx.stroke();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    if (p.type === "sparkle") {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      // Star shape
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? p.size : p.size * 0.4;
        if (i === 0) ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        else ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  ctx.fillStyle = hexToRgba("#1a1a2e", alpha);
  ctx.fillRect(0, 0, w, h);
}

// ── Main component ─────────────────────────────────────────────────────────────
export function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highScore, updateHighScore] = useHighScore("flappybird_best");

  // All mutable game state in a single ref — no React re-renders in the loop
  const gs = useRef({
    phase: "title" as "title" | "playing" | "paused" | "gameover",
    bird: { x: 0, y: 0, vy: 0, flapTimer: 0, wingAngle: 0 } as Bird,
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    clouds: [] as Cloud[],
    score: 0,
    best: 0,
    scrollX: 0,
    shakeTimer: 0,
    pipeTimer: 0,
    time: 0,
    prevSpace: false,
    prevMouse: false,
    prevTouch: false,
    width: 0,
    height: 0,
  });

  // Keep best in sync with localStorage value
  gs.current.best = highScore;

  const highScoreRef = useRef(updateHighScore);
  highScoreRef.current = updateHighScore;

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gs.current.width = canvas.width;
      gs.current.height = canvas.height;
      // Init clouds
      gs.current.clouds = Array.from({ length: 6 }, (_, i) =>
        makeCloud((i / 6) * canvas.width + randomInRange(0, 80), canvas.height)
      );
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const resetGame = useCallback(() => {
    const g = gs.current;
    const { width: w, height: h } = g;
    g.bird = { x: w * 0.22, y: h * 0.45, vy: 0, flapTimer: 0, wingAngle: 0 };
    g.pipes = [];
    g.particles = [];
    g.score = 0;
    g.scrollX = 0;
    g.shakeTimer = 0;
    g.pipeTimer = PIPE_INTERVAL * 0.6;
    g.phase = "playing";
  }, []);

  // Input handling via canvas events (touch + mouse + keyboard)
  const inputRef = useRef({ space: false, pointer: false });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        inputRef.current.space = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") inputRef.current.space = false;
    };
    const onPointerDown = () => { inputRef.current.pointer = true; };
    const onPointerUp = () => { inputRef.current.pointer = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = gs.current;
    const { width: W, height: H } = g;
    if (W === 0 || H === 0) return;

    const inp = inputRef.current;
    const justPressed = (inp.space || inp.pointer) && !g.prevSpace && !g.prevMouse;
    g.prevSpace = inp.space;
    g.prevMouse = inp.pointer;

    g.time += dt;

    // ── Title screen ────────────────────────────────────────────────────────
    if (g.phase === "title") {
      // Animate clouds
      g.clouds.forEach(c => {
        c.x -= c.speed * dt;
        if (c.x + c.w < 0) { c.x = W + c.w; c.y = randomInRange(30, H * 0.45); }
      });
      g.scrollX += 60 * dt;

      drawBackground(ctx, W, H);
      drawClouds(ctx, g.clouds);
      drawGround(ctx, W, H, g.scrollX);

      // Idle bird bounce
      const idleBird: Bird = { x: W * 0.5, y: H * 0.38 + Math.sin(g.time * 2.2) * 8, vy: 0, flapTimer: 0, wingAngle: 0 };
      drawBird(ctx, idleBird, g.time);

      drawOverlay(ctx, W, H, 0.18);
      drawText(ctx, GAME_TITLE, W / 2, H * 0.2, { font: `bold ${Math.round(W * 0.072)}px Fraunces, serif`, color: "#d1fae5", shadow: "#064e3b", shadowBlur: 14 });

      // Play button
      const bw = Math.min(200, W * 0.48), bh = 58, bx = W / 2 - bw / 2, by = H * 0.58;
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number)=>void }).roundRect(bx, by, bw, bh, 30);
      ctx.fill();
      ctx.shadowBlur = 0;
      drawText(ctx, "▶  Play", W / 2, by + bh / 2, { font: "bold 26px Manrope, sans-serif", color: "#fff" });

      drawText(ctx, "Tap · Click · Space", W / 2, H * 0.78, { font: "16px Manrope, sans-serif", color: "rgba(255,255,255,0.75)" });
      if (g.best > 0) drawText(ctx, `Best: ${g.best}`, W / 2, H * 0.84, { font: "15px Manrope, sans-serif", color: "#d1fae5" });

      if (justPressed) resetGame();
      return;
    }

    // ── Paused ──────────────────────────────────────────────────────────────
    if (g.phase === "paused") {
      drawBackground(ctx, W, H);
      drawClouds(ctx, g.clouds);
      drawGround(ctx, W, H, g.scrollX);
      g.pipes.forEach(p => drawPipe(ctx, p, H));
      drawBird(ctx, g.bird, g.time);
      drawOverlay(ctx, W, H, 0.45);
      drawText(ctx, "Paused", W / 2, H * 0.38, { font: `bold ${Math.round(W * 0.07)}px Fraunces, serif`, color: "#d1fae5", shadow: "#000", shadowBlur: 10 });
      drawText(ctx, "Tap to resume", W / 2, H * 0.52, { font: "18px Manrope, sans-serif", color: "#fff" });
      if (justPressed) g.phase = "playing";
      return;
    }

    // ── Game Over ───────────────────────────────────────────────────────────
    if (g.phase === "gameover") {
      drawBackground(ctx, W, H);
      drawClouds(ctx, g.clouds);
      drawGround(ctx, W, H, g.scrollX);
      g.pipes.forEach(p => drawPipe(ctx, p, H));
      drawBird(ctx, g.bird, g.time);
      drawParticles(ctx, g.particles);
      drawOverlay(ctx, W, H, 0.5);

      drawText(ctx, "Game Over!", W / 2, H * 0.28, { font: `bold ${Math.round(W * 0.075)}px Fraunces, serif`, color: "#fecaca", shadow: "#000", shadowBlur: 12 });
      drawText(ctx, `Score: ${g.score}`, W / 2, H * 0.42, { font: "bold 28px Manrope, sans-serif", color: "#d1fae5", shadow: "#000", shadowBlur: 8 });
      drawText(ctx, `Best: ${g.best}`, W / 2, H * 0.51, { font: "22px Manrope, sans-serif", color: "#a7f3d0", shadow: "#000", shadowBlur: 6 });

      const bw = Math.min(220, W * 0.52), bh = 58, bx = W / 2 - bw / 2, by = H * 0.62;
      ctx.fillStyle = "#059669";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number)=>void }).roundRect(bx, by, bw, bh, 30);
      ctx.fill();
      ctx.shadowBlur = 0;
      drawText(ctx, "▶  Play Again", W / 2, by + bh / 2, { font: "bold 24px Manrope, sans-serif", color: "#fff" });

      if (justPressed) resetGame();
      return;
    }

    // ── Playing ─────────────────────────────────────────────────────────────
    const speed = BASE_PIPE_SPEED + g.score * 3.5;

    // Flap
    if (justPressed) {
      g.bird.vy = FLAP;
      g.bird.flapTimer = 1;
      spawnParticles(g.particles, g.bird.x - 10, g.bird.y + 8, "puff");
    }

    // Update bird
    g.bird.vy += GRAVITY * dt;
    g.bird.vy = Math.max(g.bird.vy, -600);
    g.bird.y += g.bird.vy * dt;
    g.bird.flapTimer = Math.max(0, g.bird.flapTimer - dt * 3);

    // Update particles
    g.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt * 2.2;
    });
    g.particles = g.particles.filter(p => p.life > 0);

    // Update clouds
    g.clouds.forEach(c => {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) { c.x = W + c.w; c.y = randomInRange(30, H * 0.45); }
    });

    // Scroll
    g.scrollX += speed * dt;

    // Spawn pipes
    g.pipeTimer += speed * dt;
    if (g.pipeTimer >= PIPE_INTERVAL) {
      g.pipeTimer = 0;
      g.pipes.push(makePipe(W + PIPE_W, H, g.score));
    }

    // Move pipes + score
    g.pipes.forEach(p => { p.x -= speed * dt; });
    g.pipes = g.pipes.filter(p => p.x + PIPE_W > -10);

    for (const p of g.pipes) {
      if (!p.passed && p.x + PIPE_W < g.bird.x - BIRD_R) {
        p.passed = true;
        g.score++;
        highScoreRef.current(g.score);
        g.best = Math.max(g.best, g.score);
        spawnParticles(g.particles, g.bird.x + 30, g.bird.y, "sparkle");
      }
    }

    // Collision: pipes
    let hit = false;
    for (const p of g.pipes) {
      const inX = g.bird.x + BIRD_R > p.x + 4 && g.bird.x - BIRD_R < p.x + PIPE_W - 4;
      const inGap = g.bird.y - BIRD_R > p.gapY && g.bird.y + BIRD_R < p.gapY + p.gapH;
      if (inX && !inGap) { hit = true; break; }
    }

    // Collision: ground / ceiling
    const groundY = H - GROUND_H;
    if (g.bird.y + BIRD_R >= groundY || g.bird.y - BIRD_R <= 0) hit = true;

    if (hit) {
      g.phase = "gameover";
      g.shakeTimer = 0.45;
      spawnParticles(g.particles, g.bird.x, g.bird.y, "sparkle");
      spawnParticles(g.particles, g.bird.x, g.bird.y, "puff");
      return;
    }

    // Screen shake
    let sx = 0, sy = 0;
    if (g.shakeTimer > 0) {
      g.shakeTimer -= dt;
      const mag = g.shakeTimer * 14;
      sx = (Math.random() - 0.5) * mag;
      sy = (Math.random() - 0.5) * mag;
    }

    // ── Draw ────────────────────────────────────────────────────────────────
    ctx.save();
    if (sx || sy) ctx.translate(sx, sy);

    drawBackground(ctx, W, H);
    drawClouds(ctx, g.clouds);
    g.pipes.forEach(p => drawPipe(ctx, p, H));
    drawGround(ctx, W, H, g.scrollX);
    drawBird(ctx, g.bird, g.time);
    drawParticles(ctx, g.particles);

    ctx.restore();

    // HUD (no shake)
    drawText(ctx, `${g.score}`, W / 2, 44, { font: "bold 38px Fraunces, serif", color: "#fff", shadow: "#1a1a2e", shadowBlur: 8 });
    if (g.best > 0) drawText(ctx, `Best ${g.best}`, W / 2, 80, { font: "15px Manrope, sans-serif", color: "rgba(255,255,255,0.8)", shadow: "#000", shadowBlur: 4 });

    // Pause button
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(W - 34, 34, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(W - 42, 26, 7, 16);
    ctx.fillRect(W - 30, 26, 7, 16);
  });

  // Pause on pause-button click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = gs.current;
    if (g.phase !== "playing") return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - (g.width - 34);
    const dy = cy - 34;
    if (Math.sqrt(dx * dx + dy * dy) < 26) g.phase = "paused";
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    />
  );
}
