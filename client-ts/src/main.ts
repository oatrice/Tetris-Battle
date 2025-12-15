import './style.css'
import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { InputHandler, GameAction } from './game/InputHandler';
import { GameUI } from './game/GameUI';
import { registerSW } from './pwa/registerSW';

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

// Register Service Worker for Offline capabilities
registerSW();

// Start Game
game.start();

// Handle Input
const handleGameAction = (action: GameAction | null) => {
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
};

window.addEventListener('keydown', (e) => {
  const action = inputHandler.handleInput(e);
  handleGameAction(action);
});

// Touch Handling
window.addEventListener('touchstart', (e) => {
  if ((e.target as HTMLElement).tagName === 'BUTTON') return;
  inputHandler.handleTouchStart(e);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  // Prevent scrolling if touching the canvas/game area
  if (e.target === canvas) {
    e.preventDefault();
  }
  const action = inputHandler.handleTouchMove(e);
  handleGameAction(action);
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if ((e.target as HTMLElement).tagName === 'BUTTON') return;
  const action = inputHandler.handleTouchEnd(e);
  handleGameAction(action);
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
