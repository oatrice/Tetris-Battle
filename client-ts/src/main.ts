import './style.css'
import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { InputHandler, GameAction } from './game/InputHandler';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div>
    <h1>Tetris Battle TS</h1>
    <div class="ui-controls" style="margin-bottom: 1rem;">
        <button id="restartBtn">Restart</button>
        <button id="pauseBtn">Pause</button>
    </div>
    <canvas id="gameCanvas" width="480" height="600"></canvas>
    <p>Use Arrow keys to move/rotate</p>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
const restartBtn = document.querySelector<HTMLButtonElement>('#restartBtn')!;
const pauseBtn = document.querySelector<HTMLButtonElement>('#pauseBtn')!;

const game = new Game();
const renderer = new Renderer(canvas);
const inputHandler = new InputHandler();

function updatePauseBtn() {
  pauseBtn.textContent = game.isPaused ? 'Resume' : 'Pause';
}

// UI Bindings
restartBtn.addEventListener('click', () => {
  game.restart();
  updatePauseBtn();
  restartBtn.blur(); // Release focus for keyboard inputs
});

pauseBtn.addEventListener('click', () => {
  game.togglePause();
  updatePauseBtn();
  pauseBtn.blur();
});

// Start Game
game.start();

// Handle Input
window.addEventListener('keydown', (e) => {
  const action = inputHandler.handleInput(e);
  if (action) {
    game.handleAction(action);
    // Sync UI if needed
    if (action === GameAction.PAUSE || action === GameAction.RESTART) {
      updatePauseBtn();
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
