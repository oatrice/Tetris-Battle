# API Design & Interfaces

เอกสารนี้ระบุ Interface ระหว่าง Module ต่างๆ ในระบบ (Internal & External API)

## 📡 Client-Server Protocol (WebSocket)
สื่อสารระหว่าง TypeScript Client และ Go Server

### 1. Connection & Auth
*   **URL:** `ws://localhost:8080/ws`
*   **Query Params:** `?player_id={id}&name={name}`

### 2. Events (Server -> Client)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `GAME_START` | `{ seed: number, opponent_id: string }` | เริ่มเกมพร้อม Seed เดียวกัน |
| `OPPONENT_UPDATE` | `{ board: number[][], score: int }` | อัปเดตสถานะคู่แข่ง |
| `GARBAGE_SENT` | `{ lines: int }` | แจ้งเตือนว่ามี Garbage Line กำลังมา |

### 3. Actions (Client -> Server)
| Action | Payload | Description |
| :--- | :--- | :--- |
| `UPDATE_STATE` | `{ board: [...], score: 100 }` | ส่งสถานะตัวเองไป Server (30fps limit) |
| `SEND_GARBAGE` | `{ lines: 2 }` | ส่ง Garbage Line เมื่อล้างแถวได้ |

---

## 🔌 Internal Modules Interface (TypeScript)

### `GameEngine` (Core Logic)
```typescript
interface IGameEngine {
  start(seed: number): void;
  update(deltaTime: number): void; // Tick physics
  input(action: 'ROTATE_L' | 'ROTATE_R' | 'DROP'): void;
  getState(): GameStateBuffer; // Optimized state for rendering
}
```

### `Renderer` (Canvas)
```typescript
interface IRenderer {
  draw(state: GameStateBuffer): void;
  resize(width: number, height: number): void;
}
```
