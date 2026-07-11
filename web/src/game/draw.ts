// ── All canvas rendering ──────────────────────────────────────────────────────
import { drawText } from "../lib/canvas";
import type { GameState, Bird, Pipe, Particle, Cloud } from "./state";
import { BIRD_R } from "./state";

const SKY_TOP = "#b3e5fc";
const SKY_BOT = "#e1f5fe";
const GROUND_COL = "#a5d6a7";
const DIRT_COL = "#bcaaa4";

// ── background ────────────────────────────────────────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#fff";
  const puffs = [
    [0, 0, c.w * 0.28],
    [c.w * 0.25, -c.w * 0.08, c.w * 0.32],
    [c.w * 0.55, -c.w * 0.02, c.w * 0.26],
    [c.w * 0.78, 0, c.w * 0.22],
  ] as [number, number, number][];
  for (const [ox, oy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(c.x + ox, c.y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const ground = h - 48;
  // back hills
  ctx.fillStyle = "#c8e6c9";
  for (let i = 0; i < 4; i++) {
    const hx = ((i * 280 - (t * 25) % 280) + w * 1.2) % (w + 280) - 140;
    ctx.beginPath();
    ctx.ellipse(hx, ground, 160, 90, 0, Math.PI, 0);
    ctx.fill();
  }
  // front hills
  ctx.fillStyle = "#a5d6a7";
  for (let i = 0; i < 5; i++) {
    const hx = ((i * 210 - (t * 45) % 210) + w * 1.2) % (w + 210) - 105;
    ctx.beginPath();
    ctx.ellipse(hx, ground, 120, 60, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawFlowers(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const ground = h - 48;
  const cols = ["#f48fb1", "#fff176", "#f8bbd0", "#80deea", "#ffcc80"];
  for (let i = 0; i < 8; i++) {
    const fx = ((i * 130 - (t * 55) % 130) + w * 1.1) % (w + 130) - 65;
    const col = cols[i % cols.length] ?? "#fff";
    // stem
    ctx.strokeStyle = "#66bb6a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, ground); ctx.lineTo(fx, ground - 18); ctx.stroke();
    // petals
    ctx.fillStyle = col;
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(ang) * 5, ground - 18 + Math.sin(ang) * 5, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff9c4";
    ctx.beginPath(); ctx.arc(fx, ground - 18, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ground = h - 48;
  ctx.fillStyle = GROUND_COL;
  ctx.fillRect(0, ground, w, 14);
  ctx.fillStyle = DIRT_COL;
  ctx.fillRect(0, ground + 14, w, h - ground - 14);
}

// ── pipes as tree trunks ──────────────────────────────────────────────────────
function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe, h: number) {
  const x = p.x, w = 52;
  const topH = p.gapY;
  const botY = p.gapY + p.gapH;
  const botH = h - 48 - botY;

  function trunk(tx: number, ty: number, tw: number, th: number) {
    if (th <= 0) return;
    // main trunk
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(tx, ty, tw, th);
    // bark stripes
    ctx.fillStyle = "#795548";
    for (let y = ty + 8; y < ty + th; y += 18) {
      ctx.fillRect(tx + 4, y, tw - 8, 4);
    }
    // highlight
    ctx.fillStyle = "#a1887f";
    ctx.fillRect(tx + 4, ty, 8, th);
    // cap (leafy top/bottom)
    ctx.fillStyle = "#4caf50";
    const capY = ty === 0 ? ty + th - 14 : ty - 6;
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2, capY, tw / 2 + 8, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2, capY, tw / 2 + 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  trunk(x, 0, w, topH);
  trunk(x, botY, w, botH);
}

// ── baby bird ─────────────────────────────────────────────────────────────────
function drawBird(ctx: CanvasRenderingContext2D, b: Bird, t: number) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);

  const r = BIRD_R;
  const flapping = b.flapTimer > 0;
  const wingY = flapping ? -r * 0.6 : Math.sin(t * 8) * 3;
  const wingRot = flapping ? -0.6 : Math.sin(t * 8) * 0.2;

  // left wing
  ctx.save();
  ctx.translate(-r * 0.3, wingY * 0.5);
  ctx.rotate(wingRot - 0.3);
  ctx.fillStyle = "#ffb300";
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, 0, r * 0.7, r * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // body
  ctx.fillStyle = "#ffca28";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

  // belly
  ctx.fillStyle = "#fff9c4";
  ctx.beginPath(); ctx.ellipse(4, 4, r * 0.55, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();

  // right wing
  ctx.save();
  ctx.translate(r * 0.1, wingY * 0.5);
  ctx.rotate(-wingRot + 0.3);
  ctx.fillStyle = "#ffb300";
  ctx.beginPath();
  ctx.ellipse(r * 0.5, 0, r * 0.7, r * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // left eye white
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.2, r * 0.32, 0, Math.PI * 2); ctx.fill();
  // right eye white
  ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.2, r * 0.32, 0, Math.PI * 2); ctx.fill();
  // pupils
  ctx.fillStyle = "#1a237e";
  ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.18, r * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.18, r * 0.16, 0, Math.PI * 2); ctx.fill();
  // eye shine
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-r * 0.14, -r * 0.24, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.24, r * 0.07, 0, Math.PI * 2); ctx.fill();

  // beak
  ctx.fillStyle = "#ff8f00";
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.05);
  ctx.lineTo(r * 0.95, r * 0.08);
  ctx.lineTo(r * 0.55, r * 0.2);
  ctx.closePath(); ctx.fill();

  // cheek blush
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#ef9a9a";
  ctx.beginPath(); ctx.ellipse(-r * 0.42, r * 0.12, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.42, r * 0.12, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── particles ─────────────────────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.color;
    if (p.type === "sparkle") {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const r = p.size * p.life;
        ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        ctx.lineTo(p.x + Math.cos(a + 0.4) * r * 0.4, p.y + Math.sin(a + 0.4) * r * 0.4);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHud(ctx: CanvasRenderingContext2D, score: number, best: number, w: number) {
  drawText(ctx, String(score), w / 2, 44, {
    font: "bold 38px Fraunces, serif",
    color: "#fff",
    shadow: "#3e2723",
    shadowBlur: 6,
  });
  drawText(ctx, `Best ${best}`, w / 2, 80, {
    font: "16px Manrope, sans-serif",
    color: "#ffffffcc",
    shadow: "#3e2723",
    shadowBlur: 4,
  });
}

// ── title screen ──────────────────────────────────────────────────────────────
export function drawTitle(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, best: number) {
  drawBg(ctx, w, h);
  drawHills(ctx, w, h, t);
  drawFlowers(ctx, w, h, t);
  drawGround(ctx, w, h);

  // floating title bird
  const fakeBird = { x: w / 2, y: h / 2 - 80 + Math.sin(t * 2) * 8, vy: 0, angle: 0, wingPhase: t, flapTimer: 0 };
  drawBird(ctx, fakeBird, t);

  drawText(ctx, "Flappy Bird", w / 2, h / 2 - 10, {
    font: "bold 42px Fraunces, serif",
    color: "#fff",
    shadow: "#3e2723",
    shadowBlur: 8,
  });
  if (best > 0) {
    drawText(ctx, `Best: ${best}`, w / 2, h / 2 + 36, {
      font: "18px Manrope, sans-serif",
      color: "#fff9c4",
      shadow: "#3e2723",
      shadowBlur: 4,
    });
  }

  // Play button
  const bw = 160, bh = 52, bx = w / 2 - bw / 2, by = h / 2 + 68;
  ctx.fillStyle = "#66bb6a";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 26);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh - 6, 26);
  ctx.fill();
  drawText(ctx, "▶  Play", w / 2, by + bh / 2 - 3, {
    font: "bold 22px Manrope, sans-serif",
    color: "#2e7d32",
  });
}

// ── game over overlay ─────────────────────────────────────────────────────────
export function drawGameOver(ctx: CanvasRenderingContext2D, w: number, h: number, score: number, best: number) {
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, w, h);

  const bw = 240, bh = 160, bx = w / 2 - bw / 2, by = h / 2 - bh / 2;
  ctx.fillStyle = "#fff9f0";
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20); ctx.fill();

  drawText(ctx, "Game Over!", w / 2, by + 36, {
    font: "bold 28px Fraunces, serif", color: "#e53935",
  });
  drawText(ctx, `Score: ${score}`, w / 2, by + 74, {
    font: "20px Manrope, sans-serif", color: "#333",
  });
  drawText(ctx, `Best: ${best}`, w / 2, by + 100, {
    font: "16px Manrope, sans-serif", color: "#888",
  });

  // Play again button
  const pbw = 150, pbh = 42, pbx = w / 2 - pbw / 2, pby = by + bh - 52;
  ctx.fillStyle = "#42a5f5";
  ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh, 21); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh - 5, 21); ctx.fill();
  drawText(ctx, "Play Again", w / 2, pby + pbh / 2 - 3, {
    font: "bold 18px Manrope, sans-serif", color: "#1565c0",
  });
}

// ── main draw ─────────────────────────────────────────────────────────────────
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  best: number,
) {
  ctx.save();
  if (state.shake > 0) ctx.translate(state.shakeX, state.shakeY);

  drawBg(ctx, w, h);
  for (const c of state.clouds) drawCloud(ctx, c);
  drawHills(ctx, w, h, state.time);
  drawFlowers(ctx, w, h, state.time);

  for (const p of state.pipes) drawPipe(ctx, p, h);
  drawGround(ctx, w, h);
  drawParticles(ctx, state.particles);
  drawBird(ctx, state.bird, state.time);
  drawHud(ctx, state.score, best, w);

  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, w, h);
    drawText(ctx, "Paused", w / 2, h / 2 - 16, {
      font: "bold 36px Fraunces, serif", color: "#fff", shadow: "#000", shadowBlur: 8,
    });
    drawText(ctx, "Tap to resume", w / 2, h / 2 + 24, {
      font: "18px Manrope, sans-serif", color: "#ffffffcc",
    });
  }

  if (state.phase === "gameover") drawGameOver(ctx, w, h, state.score, best);

  ctx.restore();
}
