# Request for Comments (RFC) - Migration Strategy

## Problem
The current C++ codebase requires a complex toolchain (Emscripten) and is harder to maintain for web-first developers. Debugging WASM issues is difficult.

## Solution Options

### Option 1: TypeScript (Selected)
- Native web integration.
- Huge ecosystem.
- Easier debugging.

### Option 2: Rust (WASM)
- High performance.
- Still requires WASM bridge.
- Steeper learning curve.

## Decision
Migrate to TypeScript to prioritize maintainability and ease of contributions for web developers, while performance is expected to be sufficient for a Tetris clone.

## Consequences
- Need to rewrite core logic.
- Potential performance tuning needed for JS garbage collection.
