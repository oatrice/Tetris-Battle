/**
 * Test: Solo/Special mode ไม่แสดง board จนกว่าจะกดปุ่ม resume
 * 
 * เป้าหมาย: ให้แน่ใจว่าเมื่อเริ่มเกมโหมด Solo/Special ใหม่
 * เกมจะไม่อยู่ในสถานะ pause และพร้อม render board ทันที
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';

describe('🟥 RED: Game Start Visibility Bug', () => {
    let game: Game;

    beforeEach(() => {
        // Clear localStorage เพื่อป้องกัน saved state จาก test อื่น
        localStorage.clear();
    });

    it('Solo mode ควรไม่ pause เมื่อเริ่มเกมใหม่จากหน้าเมนู', () => {
        // Arrange: สร้างเกมใหม่ในโหมด OFFLINE
        game = new Game(GameMode.OFFLINE);

        // Act: เริ่มเกมโหมด Solo (จำลองการกดปุ่ม "Solo Mode" จากเมนู)
        game.start(false);

        // Assert: เกมไม่ควร pause
        expect(game.isPaused).toBe(false);
        expect(game.gameOver).toBe(false);

        // เกมควร render ได้ (มี currentPiece)
        expect(game.currentPiece).not.toBeNull();
    });

    it('Special mode ควรไม่ pause เมื่อเริ่มเกมใหม่จากหน้าเมนู', () => {
        // Arrange: สร้างเกมใหม่ในโหมด SPECIAL
        game = new Game(GameMode.SPECIAL);

        // Act: เริ่มเกมโหมด Special (จำลองการกดปุ่ม "Special Mode" จากเมนู)
        game.start(false);

        // Assert: เกมไม่ควร pause
        expect(game.isPaused).toBe(false);
        expect(game.gameOver).toBe(false);

        // เกมควร render ได้ (มี currentPiece)
        expect(game.currentPiece).not.toBeNull();
    });

    it('ควร load saved state อย่างถูกต้องเมื่อมีข้อมูลใน localStorage', () => {
        // Arrange: สร้างเกมและ save state ที่ paused
        game = new Game(GameMode.OFFLINE);
        game.start(true); // Reset เกมใหม่
        game.score = 1000;
        game.lines = 10;
        game.isPaused = true; // Pause เกม
        game.saveState();

        // สร้างอินสแตนซ์ใหม่
        const newGame = new Game(GameMode.OFFLINE);

        // Act: เริ่มเกมโดยอนุญาตให้ load state
        newGame.start(false);

        // Assert: ควร load score และ lines ได้
        expect(newGame.score).toBe(1000);
        expect(newGame.lines).toBe(10);

        // แต่ควรจะไม่ pause เพื่อให้ผู้เล่นเริ่มเล่นได้ทันที
        // (นี่คือจุดประสงค์ของ bug fix)
        expect(newGame.isPaused).toBe(false);
    });

    it('เมื่อกดปุ่ม "Resume" จากเมนู ควร load saved state และเริ่มเกมทันที', () => {
        // Arrange: สร้างเกมและ save state ที่ paused
        game = new Game(GameMode.OFFLINE);
        game.start(true);
        game.score = 500;
        game.isPaused = true;
        game.saveState();

        // สร้างอินสแตนซ์ใหม่ (จำลอง page reload)
        const resumedGame = new Game(GameMode.OFFLINE);

        // Act: Load state และ resume
        const loaded = resumedGame.loadState();
        if (loaded) {
            resumedGame.isPaused = false; // Resume เกม
        }

        // Assert
        expect(loaded).toBe(true);
        expect(resumedGame.score).toBe(500);
        expect(resumedGame.isPaused).toBe(false);
    });
});
