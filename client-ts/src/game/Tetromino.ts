export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

const SHAPES: Record<TetrominoType, number[][]> = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

export class Tetromino {
    private currentShape: number[][];

    constructor(public type: TetrominoType) {
        this.currentShape = SHAPES[type].map(row => [...row]);
    }

    get shape(): number[][] {
        return this.currentShape;
    }

    rotate(): void {
        // Transpose + Reverse for 90 deg CW
        const transposed = this.currentShape[0].map((_, colIndex) =>
            this.currentShape.map(row => row[colIndex])
        );
        this.currentShape = transposed.map(row => row.reverse());
    }

    setShape(shape: number[][]): void {
        this.currentShape = shape.map(row => [...row]);
    }
}
