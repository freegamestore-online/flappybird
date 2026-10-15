import { GameShell, GameTopbar } from "@freegamestore/games";
import { FlappyBirdGame } from "./game/FlappyBirdGame";
import { GAME_TITLE } from "./game/title";

export default function App() {
  return (
    <GameShell topbar={<GameTopbar title={GAME_TITLE} />}>
      <FlappyBirdGame />
    </GameShell>
  );
}
