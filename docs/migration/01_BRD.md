# Business Requirements Document (BRD) - C++ to TypeScript Migration

## Objective
Normalize the codebase to modern web standards by migrating the game client from C++/Emscripten to native TypeScript.

## Scope
- Porting core game logic (Tetris mechanics)
- Porting UI and Input handling
- Ensuring feature parity with the C++ version

## Success Metrics
- 100% pass rate on core logic tests
- No perceptible input lag (frame rate >= 60fps)
- Successful build and deploy via standard NPM/Vite pipelines
