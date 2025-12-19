/**
 * CoopRenderer.ts
 * Renderer for Cooperative Mode (24x12 Horizontal Board)
 * 
 * Layout:
 * ┌────────────────────────┐
 * │  P1 Zone  │  P2 Zone   │
 * │  (0-11)   │  (12-23)   │
 * └────────────────────────┘
 */

import { CoopBoard } from '../coop/CoopBoard';
import { Tetromino } from './Tetromino';
import { Renderer } from './Renderer';

interface PlayerState {
    piece: Tetromino | null;
    position: { x: number; y: number };
}

export class CoopRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cellSize: number;

    constructor(canvas: HTMLCanvasElement, cellSize: number = 30) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.cellSize = cellSize;
    }

    /**
     * Render the Coop Board with both players' pieces
     */
    render(
        board: CoopBoard,
        player1: PlayerState,
        player2: PlayerState,
        isPaused: boolean = false
    ): void {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw zone divider (vertical line in middle)
        this.drawZoneDivider();

        // Draw locked blocks
        board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    this.drawBlock(x, y, '#546E7A'); // Locked block color
                }
            });
        });

        // Draw Player 1's piece
        if (player1.piece) {
            this.drawPiece(player1.piece, player1.position);
        }

        // Draw Player 2's piece
        if (player2.piece) {
            this.drawPiece(player2.piece, player2.position);
        }

        // Draw pause overlay
        if (isPaused) {
            this.drawOverlay('PAUSED');
        }
    }

    private drawZoneDivider(): void {
        // Draw a subtle vertical line at x=12 (between zones)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(12 * this.cellSize, 0);
        this.ctx.lineTo(12 * this.cellSize, this.canvas.height);
        this.ctx.stroke();
    }

    private drawPiece(piece: Tetromino, position: { x: number; y: number }): void {
        const color = Renderer.getColor(piece.type);
        piece.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell !== 0) {
                    this.drawBlock(position.x + c, position.y + r, color);
                }
            });
        });
    }

    private drawBlock(x: number, y: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

        // Border
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
    }

    private drawOverlay(text: string): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

        // Reset
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
    }

    /**
     * Helper to draw a piece on a mini canvas (for Next Piece display)
     */
    static drawMiniPiece(ctx: CanvasRenderingContext2D, piece: Tetromino, cellSize: number = 20): void {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!piece) return;

        // Calculate center offset
        // Most pieces are 3x3 or 4x4, centering logic:
        const rows = piece.shape.length;
        const cols = piece.shape[0].length;
        const offsetX = (ctx.canvas.width - cols * cellSize) / 2;
        const offsetY = (ctx.canvas.height - rows * cellSize) / 2;

        const color = Renderer.getColor(piece.type);

        piece.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell !== 0) {
                    ctx.fillStyle = color;
                    ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);

                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
                }
            });
        });
    }
}
