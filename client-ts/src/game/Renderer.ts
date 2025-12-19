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
        // Clear & Backgrounds
        // Board Area Only
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Board Grid
        game.board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    this.drawBlock(x, y, '#546E7A'); // Darker Blue-Grey for locked blocks
                }
            });
        });

        // Draw Ghost Piece
        if (game.currentPiece && game.ghostPieceEnabled) {
            const ghostPos = game.getGhostPosition();
            game.currentPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell !== 0) {
                        this.drawBlock(ghostPos.x + c, ghostPos.y + r, 'rgba(255, 255, 255, 0.2)');
                    }
                });
            });
        }

        // Draw Current Piece
        if (game.currentPiece) {
            game.currentPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell !== 0) {
                        this.drawBlock(game.position.x + c, game.position.y + r, Renderer.getColor(game.currentPiece!.type));
                    }
                });
            });
        }

        // Draw Effects
        game.effects.forEach(effect => {
            if (effect.type === 'LINE_CLEAR') {
                const alpha = effect.timeLeft / 500; // Fade out
                // this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = effect.color;
                this.ctx.fillRect(0, effect.y * this.cellSize, 10 * this.cellSize, this.cellSize);
                this.ctx.globalAlpha = 1.0;
            }
        });

        // Draw Pause Overlay (Centered on Board)
        if (game.isPaused) {
            this.drawOverlay('PAUSED');
        }
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

    // Removed drawStats and drawPreviewPiece as they are now handled by DOM/GameUI

    private drawBlock(x: number, y: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

        // Simple bevel/border
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
    }

    public static getColor(type: string): string {
        const colors: Record<string, string> = {
            I: '#4DD0E1', // Cyan (Darker Pastel)
            J: '#7986CB', // Indigo (Darker Pastel)
            L: '#FFB74D', // Orange (Darker Pastel)
            O: '#FFF176', // Yellow (Darker Pastel)
            S: '#81C784', // Green (Darker Pastel)
            T: '#BA68C8', // Purple (Darker Pastel)
            Z: '#E57373', // Red (Darker Pastel)
        };
        return colors[type] || '#fff';
    }
}
