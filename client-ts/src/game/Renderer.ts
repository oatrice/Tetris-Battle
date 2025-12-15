import { Game } from './Game';

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cellSize: number;

    constructor(canvas: HTMLCanvasElement, cellSize: number = 30) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.cellSize = cellSize;
    }

    render(game: Game): void {
        // Clear
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Board
        game.board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    this.drawBlock(x, y, '#888'); // Gray for locked blocks
                }
            });
        });

        // Draw Current Piece
        if (game.currentPiece) {
            game.currentPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell !== 0) {
                        this.drawBlock(game.position.x + c, game.position.y + r, this.getColor(game.currentPiece!.type));
                    }
                });
            });
        }
    }

    private drawBlock(x: number, y: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

        // Simple bevel/border
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
    }

    private getColor(type: string): string {
        const colors: Record<string, string> = {
            I: '#00f0f0',
            J: '#0000f0',
            L: '#f0a000',
            O: '#f0f000',
            S: '#00f000',
            T: '#a000f0',
            Z: '#f00000',
        };
        return colors[type] || '#fff';
    }
}
