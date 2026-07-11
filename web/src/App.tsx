import { GameShell, GameTopbar } from "@freegamestore/games";
import { FlappyBirdGame } from "./game/FlappyBirdGame";

export default function App() {
  return (
    <GameShell topbar={<GameTopbar title="FlappyBird" />}>  
      <FlappyBirdGame />
    </GameShell>
  );
}