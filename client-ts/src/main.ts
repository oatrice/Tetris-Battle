import './style.css'
import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { InputHandler, GameAction } from './game/InputHandler';
import { GameUI } from './game/GameUI';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div>
    <h1>Tetris Battle TS</h1>
    <div class="ui-controls" style="margin-bottom: 1rem;">
        <button id="pauseBtn">Pause</button>
    </div>
    <canvas id="gameCanvas" width="480" height="600"></canvas>
    <p>Arrows to Move/Rotate | Space to Hard Drop | P to Pause</p>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;

const game = new Game();
const renderer = new Renderer(canvas);
const inputHandler = new InputHandler();
const ui = new GameUI(game, app);

ui.init();

// Start Game
game.start();

// Handle Input
window.addEventListener('keydown', (e) => {
  const action = inputHandler.handleInput(e);
  if (action) {
    if (action === GameAction.PAUSE) {
      ui.toggleMenu();
    } else {
      game.handleAction(action);
      // Sync UI if action affects state that UI cares about
      if (action === GameAction.RESTART) {
        ui.hideMenu();
      }
    }
  }
});

// Game Loop
let lastTime = 0;
function loop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  game.update(deltaTime);
  renderer.render(game);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
