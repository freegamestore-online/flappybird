import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_TITLE } from "../game/title";

// Regression guard: the player-visible name must be "Pipe Flyer" everywhere a
// player can see it, and no "Flappy Bird" text may be drawn or shown.
const WEB = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(WEB, rel), "utf8");
const FORBIDDEN = /flappy\s*bird|🐣/i;

describe("visible text", () => {
  it("game title is Pipe Flyer", () => {
    expect(GAME_TITLE).toBe("Pipe Flyer");
    expect(GAME_TITLE).not.toMatch(FORBIDDEN);
  });

  it("topbar shows the game title", () => {
    expect(read("src/App.tsx")).toContain("title={GAME_TITLE}");
  });

  it("document title and PWA manifest use Pipe Flyer", () => {
    expect(read("index.html")).toContain("<title>Pipe Flyer — FreeGameStore</title>");
    const config = read("vite.config.ts");
    expect(config).toContain('name: "Pipe Flyer"');
    expect(config).toContain('short_name: "Pipe Flyer"');
  });

  it("no canvas text literal mentions Flappy Bird", () => {
    const src = read("src/game/FlappyBirdGame.tsx");
    const drawn = [...src.matchAll(/drawText\(ctx,\s*(["`])(.*?)\1/g)].map(m => m[2]!);
    expect(drawn.length).toBeGreaterThan(0);
    for (const text of drawn) expect(text).not.toMatch(FORBIDDEN);
  });

  it("HTML document title does not mention Flappy Bird", () => {
    expect(read("index.html")).not.toMatch(/<title>[^<]*flappy/i);
  });
});
