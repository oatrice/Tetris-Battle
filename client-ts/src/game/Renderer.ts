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
        // Board Area (0-10 columns)
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, 10 * this.cellSize, this.canvas.height);

        // UI Area (10+ columns)
        this.ctx.fillStyle = '#222'; // Slightly lighter or different tone
        this.ctx.fillRect(10 * this.cellSize, 0, this.canvas.width - (10 * this.cellSize), this.canvas.height);

        // Separator Line
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(10 * this.cellSize, 0);
        this.ctx.lineTo(10 * this.cellSize, this.canvas.height);
        this.ctx.stroke();

        // Draw Board Grid
        game.board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    this.drawBlock(x, y, '#888'); // Gray for locked blocks
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
                        this.drawBlock(game.position.x + c, game.position.y + r, this.getColor(game.currentPiece!.type));
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

        // Draw Next Piece Preview
        if (game.nextPiece) {
            this.drawNextPiece(game.nextPiece, 11, 1); // Draw at (11, 1)
        }

        // Draw Stats
        this.drawStats(game, 11, 7);

        // Draw Pause Overlay
        if (game.isPaused) {
            this.drawOverlay('PAUSED');
        }
    }

    private drawOverlay(text: string): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, 10 * this.cellSize, this.canvas.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const boardWidth = 10 * this.cellSize;
        this.ctx.fillText(text, boardWidth / 2, this.canvas.height / 2);

        // Reset
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
    }

    private drawStats(game: Game, offsetX: number, offsetY: number): void {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';

        const x = offsetX * this.cellSize;
        const yLine = this.cellSize;

        this.ctx.fillText(`SCORE`, x, offsetY * yLine);
        this.ctx.fillText(`${game.score}`, x, offsetY * yLine + 30);

        this.ctx.fillText(`LEVEL`, x, offsetY * yLine + 80);
        this.ctx.fillText(`${game.level}`, x, offsetY * yLine + 110);

        this.ctx.fillText(`LINES`, x, offsetY * yLine + 160);
        this.ctx.fillText(`${game.lines}`, x, offsetY * yLine + 190);
    }

    private drawNextPiece(piece: any, offsetX: number, offsetY: number): void {
        const previewColor = this.getColor(piece.type);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('NEXT', offsetX * this.cellSize, offsetY * this.cellSize - 5);

        piece.shape.forEach((row: number[], r: number) => {
            row.forEach((cell: number, c: number) => {
                if (cell !== 0) {
                    this.drawBlock(offsetX + c, offsetY + r, previewColor);
                }
            });
        });
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
