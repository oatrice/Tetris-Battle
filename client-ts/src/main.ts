import './style.css'
import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { InputHandler, GameAction } from './game/InputHandler';
import { GameUI } from './game/GameUI';
import { registerSW } from './pwa/registerSW';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <h1>Tetris Battle</h1>
  <div class="ui-controls">
      <button id="pauseBtn">Pause</button>
      <button id="fullscreenBtn">Full Screen</button>
      <button id="installBtn">Install App</button>
  </div>
  
  <div id="game-container">
      <div id="left-panel" class="side-panel">
          <div class="panel-box">
            <h3>Next</h3>
            <canvas id="nextCanvas" width="200" height="200"></canvas>
          </div>
          <div id="hold-panel" class="panel-box" style="display:none;">
            <h3>Hold</h3>
            <canvas id="holdCanvas" width="200" height="200"></canvas>
          </div>
      </div>

      <canvas id="gameCanvas" width="300" height="600"></canvas>

      <div id="right-panel" class="side-panel">
          <div class="panel-box">
            <h3>Score</h3>
            <div id="score-value" class="stat-value">0</div>
          </div>
          <div class="panel-box">
            <h3>Lines</h3>
            <div id="lines-value" class="stat-value">0</div>
          </div>
          <div class="panel-box">
            <h3>Level</h3>
            <div id="level-value" class="stat-value">1</div>
          </div>
      </div>
  </div>
  
  <p>Arrows to Move/Rotate | Space to Hard Drop | P to Pause</p>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
const fullscreenBtn = document.querySelector<HTMLButtonElement>('#fullscreenBtn');
const installBtn = document.querySelector<HTMLButtonElement>('#installBtn');

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// PWA Install Logic
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  console.log('beforeinstallprompt fired');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
    } else {
      alert('To install, please use your browser menu (Add to Home Screen).');
    }
  });
}


const game = new Game();
const renderer = new Renderer(canvas);
const inputHandler = new InputHandler();
const ui = new GameUI(game, app);

// Start Game (Load state first)
game.start();

ui.init();

// Register Service Worker for Offline capabilities
registerSW();

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

  if (game.gameOver) {
    ui.showGameOver();
  }

  ui.updateStats();
  renderer.render(game);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
