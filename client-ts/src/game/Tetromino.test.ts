import { describe, it, expect } from 'vitest';
import { Tetromino } from './Tetromino';

describe('Tetromino', () => {
    it('should create an I tetromino with correct shape', () => {
        const piece = new Tetromino('I');
        expect(piece.type).toBe('I');
        // SRS I-shape typically:
        // ...
        // #### (Cyan)
        // ...
        // ...
        // Represented as 1s or specific color ID. Let's assume 1 for now or use a constant.
        expect(piece.shape).toEqual([
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]);
    });

    it('should rotate shape clockwise', () => {
        const piece = new Tetromino('T');
        // T shape:
        // 0 1 0
        // 1 1 1
        // 0 0 0
        //
        // Rotated CW expectation:
        // 0 1 0
        // 0 1 1
        // 0 1 0
        piece.rotate();
        expect(piece.shape).toEqual([
            [0, 1, 0],
            [0, 1, 1],
            [0, 1, 0]
        ]);
    });
});
