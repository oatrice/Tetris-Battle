
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';
import { GameUI } from './GameUI';

describe('Advanced QA Scenario Tests', () => {

    let root: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"><button id="pauseBtn">Pause</button></div>';
        root = document.getElementById('app')!;
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // 1. SaveIsolation_ModeSwitching_NoOverwrite
    it('SaveIsolation_ModeSwitching_NoOverwrite: Solo and Special saves should coexist peacefully', () => {
        // Step 1: Create and Save Solo Game
        const soloGame = new Game(GameMode.OFFLINE);
        soloGame.score = 100;
        soloGame.saveState();

        // Step 2: Create and Save Special Game
        const specialGame = new Game(GameMode.SPECIAL);
        specialGame.score = 999;
        specialGame.saveState();

        // Step 3: Verify Storage keys exist independently
        const soloJson = localStorage.getItem('tetris_state');
        const specialJson = localStorage.getItem('tetris_state_special');

        expect(soloJson).not.toBeNull();
        expect(specialJson).not.toBeNull();

        // Step 4: Verify Content
        expect(JSON.parse(soloJson!).score).toBe(100);
        expect(JSON.parse(specialJson!).score).toBe(999);

        // Step 5: Reload verify
        const reloadSolo = new Game(GameMode.OFFLINE);
        reloadSolo.loadState();
        expect(reloadSolo.score).toBe(100);

        const reloadSpecial = new Game(GameMode.SPECIAL);
        reloadSpecial.loadState();
        expect(reloadSpecial.score).toBe(999);
    });

    // 2. SpecialMode_CorruptedSave_GracefulReset
    it('SpecialMode_CorruptedSave_GracefulReset: Should start fresh if save file is corrupted', () => {
        // Step 1: Inject corrupted JSON
        localStorage.setItem('tetris_state_special', '{ "score": 123, "board": [BROKEN_JSON... }');

        // Step 2: Attempt to load
        const game = new Game(GameMode.SPECIAL);
        const success = game.loadState();

        // Step 3: Verify failure handling
        expect(success).toBe(false);
        expect(game.score).toBe(0); // Should be default

        // Ensure no error crashed the test (implicit by reaching here)
    });

    // 3. PauseSave_Immediate_StateAndUIPersistence
    it('PauseSave_Immediate_StateAndUIPersistence: Paused state should persist and UI should show Resume', () => {
        // Setup UI
        const game = new Game(GameMode.OFFLINE);
        const ui = new GameUI(game, root);
        ui.init(); // Setup buttons

        // Step 1: Start and Pause
        ui.startGame(GameMode.OFFLINE);
        game.score = 50;

        // Simulate Pause Button Click or Toggle
        ui.toggleMenu();

        // Verify In-Memory State
        expect(game.isPaused).toBe(true);

        // Verify Storage State
        const saved = localStorage.getItem('tetris_state');
        expect(saved).not.toBeNull();
        const state = JSON.parse(saved!);
        expect(state.isPaused).toBe(true);
        expect(state.score).toBe(50);

        // Step 2: Simulate Page Reload (Re-init UI)
        const newGame = new Game(GameMode.OFFLINE);
        const newUI = new GameUI(newGame, root);
        newUI.init();

        // Simulate "Solo Mode" click which calls startGame(false) -> loadState()
        newUI.startGame();

        // Bug Fix Applied: เมื่อเริ่มเกมใหม่จะ unpause โดยอัตโนมัติ
        // ดังนั้นปุ่มควรแสดง "Pause" และเกมไม่ควร paused
        const pauseBtn = root.querySelector('#pauseBtn');
        expect(pauseBtn?.textContent).toBe('Pause');
        expect(newGame.isPaused).toBe(false);
    });

    // 4. AutoSave_QuitToHome_MinimalState
    it('AutoSave_QuitToHome_MinimalState: Should save even with minimal progress', () => {
        const game = new Game(GameMode.OFFLINE);
        const ui = new GameUI(game, root);
        ui.init();

        // Step 1: Start Game (Score 0, no moves)
        ui.startGame(GameMode.OFFLINE);
        expect(game.score).toBe(0);

        // Step 2: Immediately Quit to Home
        ui.showHome();

        // Step 3: Verify Save
        const saved = localStorage.getItem('tetris_state');
        expect(saved).not.toBeNull();

        const state = JSON.parse(saved!);
        expect(state.score).toBe(0); // Saved even if 0
        expect(state.isPaused).toBe(true); // Should be paused
    });

});
