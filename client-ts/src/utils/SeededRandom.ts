/**
 * Simple Linear Congruential Generator (LCG) for deterministic randomness.
 * Should be sufficient for game logic synchronization.
 */
export class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = Math.abs(seed) || 1;
    }

    /**
     * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
     */
    next(): number {
        // LCG parameters (glibc values)
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648;

        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    /**
     * Returns a pseudo-random integer between min (inclusive) and max (exclusive).
     */
    range(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
    }
}
