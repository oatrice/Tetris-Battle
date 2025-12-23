# Changelog

## [2.0.0] - 2025-12-23

### 🚀 Major Release - Nuxt.js Migration

This marks the official migration from the Vite-based `client-ts` to the new **Nuxt.js-based `client-nuxt`** architecture.

### Added
- **Nuxt.js Framework**: Migrated from Vite to Nuxt.js 4 for better SSR, routing, and module ecosystem support.
- **Vue 3 Components**: Restructured game logic into Vue 3 composables and components.
- **New Directory Structure**: Adopted Nuxt's `app/` directory convention.

### Changed
- **Game Logic**: Core game logic (`Game.ts`, `Board.ts`, `Tetromino.ts`) ported to new architecture.
- **Testing**: Migrated tests to work with Nuxt + Vitest setup.
- **Build System**: Switched from Vite to Nuxt's integrated build system.

### Migrated Features (from client-ts 1.6.0)
- Solo Mode with Hold mechanic
- Special Mode with Cascade Gravity
- Duo Local Multiplayer Mode
- Google Authentication
- Online Leaderboard
- PWA Support
- Mobile Gesture Controls
- Auto Save/Restore
- Wall Kicks (SRS)

### Breaking Changes
- Project structure completely refactored
- Import paths changed from `@/` to Nuxt conventions
- Some component APIs may differ

---

*For previous changelog entries, see [client-ts/CHANGELOG.md](../client-ts/CHANGELOG.md)*
