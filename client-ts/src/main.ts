import './style.css'
import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { InputHandler } from './game/InputHandler';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div>
    <h1>Tetris Battle TS</h1>
    <canvas id="gameCanvas" width="300" height="600"></canvas>
    <p>Use Arrow keys to move/rotate</p>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
const game = new Game();
const renderer = new Renderer(canvas);
const inputHandler = new InputHandler();

// Start Game
game.start();

// Handle Input
window.addEventListener('keydown', (e) => {
  const action = inputHandler.handleInput(e);
  if (action) {
    game.handleAction(action);
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
