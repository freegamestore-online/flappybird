import { useRef, useState } from "react";
import { useControls } from "../hooks/useControls";
import { useGameLoop } from "../hooks/useGameLoop";
import { useHighScore } from "../hooks/useHighScore";
import { drawText, drawGlow, hexToRgba, randomInRange } from "../lib/canvas";

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface Bird {
  x: number;
  y: number;
  vy: number;
}

const GRAVITY = 1000;
const FLAP_STRENGTH = -350;
const PIPE_SPEED = -200;
const PIPE_WIDTH = 60;
const PIPE_GAP = 200;
const PIPE_SPACING = 300;
const BIRD_SIZE = 30;

export function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { keys, mouse, touch } = useControls();
  const [score, setScore] = useState(0);
  const [highScore, updateHighScore] = useHighScore("flappybird_highscore");
  const [bird, setBird] = useState<Bird>({ x: 100, y: 200, vy: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([{ x: 400, gapY: 200, passed: false }]);
  const [gameOver, setGameOver] = useState(false);

  useGameLoop((dt) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Update bird
    let newVy = bird.vy + GRAVITY * dt;
    let newY = bird.y + newVy * dt;

    // Detect collisions with ground
    if (newY + BIRD_SIZE / 2 > canvasRef.current.height) {
      setGameOver(true);
      newY = canvasRef.current.height - BIRD_SIZE / 2;
      newVy = 0;
    }

    // Flap on input
    if ((keys[" "] || mouse.down || touch.active) && !gameOver) {
      newVy = FLAP_STRENGTH;
    }

    setBird({ x: bird.x, y: newY, vy: newVy });

    // Update pipes
    const newPipes = pipes.map((pipe) => ({ ...pipe, x: pipe.x + PIPE_SPEED * dt }));
    if (newPipes[0].x + PIPE_WIDTH < 0) {
      newPipes.shift();
      newPipes.push({
        x: canvasRef.current.width + PIPE_SPACING,
        gapY: randomInRange(100, canvasRef.current.height - 100 - PIPE_GAP),
        passed: false,
      });
    }

    setPipes(newPipes);

    // Check collisions with pipes
    for (let pipe of newPipes) {
      if (
        bird.x + BIRD_SIZE / 2 > pipe.x &&
        bird.x - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH &&
        (bird.y - BIRD_SIZE / 2 < pipe.gapY || bird.y + BIRD_SIZE / 2 > pipe.gapY + PIPE_GAP)
      ) {
        setGameOver(true);
        return;
      }

      // Update score
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.passed = true;
        setScore((prev) => prev + 1);
        updateHighScore(score + 1);
      }
    }

    // Draw
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Background
    ctx.fillStyle = "#87CEEB"; // Sky blue
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Pipes
    newPipes.forEach((pipe) => {
      ctx.fillStyle = "#8B4513"; // Brown
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
      ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, canvasRef.current.height);
    });

    // Bird
    ctx.fillStyle = "#FFD700"; // Gold
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Score
    drawText(ctx, `Score: ${score}`, canvasRef.current.width / 2, 50, {
      font: "24px Manrope, sans-serif",
      color: "#ffffff",
      shadow: "#000000",
      shadowBlur: 4,
    });
    drawText(ctx, `Best: ${highScore}`, canvasRef.current.width / 2, 80, {
      font: "18px Manrope, sans-serif",
      color: "#ffffff",
      shadow: "#000000",
      shadowBlur: 4,
    });

    // Game over screen
    if (gameOver) {
      drawText(ctx, "Game Over!", canvasRef.current.width / 2, 150, {
        font: "36px Fraunces, serif",
        color: "#FF6347",
        shadow: "#000000",
        shadowBlur: 6,
      });
      drawText(ctx, "Tap or Press Space to Restart", canvasRef.current.width / 2, 200, {
        font: "20px Manrope, sans-serif",
        color: "#ffffff",
        shadow: "#000000",
        shadowBlur: 4,
      });
    }
  }, gameOver);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className="bg-sky-400"
      onClick={() => gameOver && window.location.reload()}
    />
  );
}