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
    public rotationIndex: number = 0;

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
        this.rotationIndex = (this.rotationIndex + 1) % 4;
    }

    resetRotation(): void {
        this.currentShape = SHAPES[this.type].map(row => [...row]);
        this.rotationIndex = 0;
    }

    setShape(shape: number[][]): void {
        this.currentShape = shape.map(row => [...row]);
    }

    // SRS Wall Kick Data
    // Returns array of (x, y) offsets to test.
    // offsets are logic: test position (x + offset.x, y + offset.y)
    getWallKicks(incomingRotation: number): { x: number, y: number }[] {
        const oldRotation = (incomingRotation === 0) ? 3 : incomingRotation - 1;
        const newRotation = incomingRotation;

        // JLSTZ Wall Kicks (Y values inverted from Standard SRS)
        if (this.type !== 'I' && this.type !== 'O') {
            // 0->1
            if (oldRotation === 0 && newRotation === 1) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }];
            // 1->0
            if (oldRotation === 1 && newRotation === 0) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }];

            // 1->2
            if (oldRotation === 1 && newRotation === 2) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }];
            // 2->1
            if (oldRotation === 2 && newRotation === 1) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }];

            // 2->3
            if (oldRotation === 2 && newRotation === 3) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
            // 3->2
            if (oldRotation === 3 && newRotation === 2) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }];

            // 3->0
            if (oldRotation === 3 && newRotation === 0) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }];
            // 0->3
            if (oldRotation === 0 && newRotation === 3) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
        }

        // I Wall Kicks (Y values inverted from Standard SRS)
        if (this.type === 'I') {
            // 0->1
            if (oldRotation === 0 && newRotation === 1) return [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }];
            // 1->0
            if (oldRotation === 1 && newRotation === 0) return [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }];

            // 1->2
            if (oldRotation === 1 && newRotation === 2) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }];
            // 2->1
            if (oldRotation === 2 && newRotation === 1) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }];

            // 2->3
            if (oldRotation === 2 && newRotation === 3) return [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }];
            // 3->2
            if (oldRotation === 3 && newRotation === 2) return [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }];

            // 3->0
            if (oldRotation === 3 && newRotation === 0) return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }];
            // 0->3
            if (oldRotation === 0 && newRotation === 3) return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }];
        }

        return [{ x: 0, y: 0 }];
    }
}
