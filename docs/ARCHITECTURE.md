# Architecture & Technical Context

เอกสารนี้อธิบายโครงสร้างระบบ (Technical Architecture) ของ Tetris-Battle หลังจากเปลี่ยน Client เป็น TypeScript

## 🏗 System Architecture (High-Level)

```mermaid
flowchart TD
    subgraph "Phase 0: Preparation (Now - End 2025)"
        Luma["🧠 Train Luma (The Hive)"]
        Stack["📚 Learn Tech Stack"]
        Proto["🧪 POC: Simple WebSocket"]
        
        Stack --> Luma
        Luma --> Proto
    end

    subgraph "Phase 1: The Core Foundation (Early 2026)"
        GoCore["🐹 Go Server (Engine)"]
        TSClient["🔷 TS Client (UI/Input)"]
        Protocol["📜 Define Binary Protocol"]
        
        GoCore <-->|WebSocket| TSClient
        Protocol -.-> GoCore
        Protocol -.-> TSClient
    end

    subgraph "Phase 2: The Expansion (Mid-Late 2026)"
        Match["🥊 Matchmaking Service"]
        DB["🗄️ Database (Supabase/Postgres)"]
        AI_Bot["🤖 AI Opponent (Reinforcement Learning)"]
        
        Match --> GoCore
        GoCore --> DB
        AI_Bot <--> GoCore
    end
    
    style Luma fill:#FFD700,stroke:#333
    style GoCore fill:#00ADD8,stroke:#333
    style TSClient fill:#3178C6,stroke:#333
    style AI_Bot fill:#ff6b6b,stroke:#333
```

## 📂 Folder Structure (Proposed)
*   `src/engine/`: Core Game Logic (Board, Pieces, Rotation System) - *Pure TS, no UI dependency*
*   `src/renderer/`: Code สำหรับวาดภาพบน Canvas - *Abstracted rendering layer*
*   `src/input/`: จัดการ Keyboard/Touch Event
*   `src/network/`: WebSocket client และ Protocol Buffers/JSON handling
*   `server/`: (Existing Go Code)

## 🧩 Key Design Decisions
1.  **Separation of Concerns:** แยก Game Logic ออกจาก Rendering 100% เพื่อให้เขียน Unit Test ง่าย (TDD)
2.  **Game Loop:** ใช้ `requestAnimationFrame` สำหรับ Render Loop และ Fixed Time Step สำหรับ Physics/Logic Loop
3.  **State Management:** สถานะของเกม (Board, Queue, Score) จะถูกเก็บใน State Object กลาง เพื่อให้ง่ายต่อการ Sync กับ Server
4.  **Phase 1:** Basic multiplayer รัน Server ในตัวเว็บได้เลย ยังไม่ต้อง connect dedicated server, รองรับ load users ไม่ต้องเยอะ
5.  **Phase 2:** Advanced multiplayer ต้อง connect dedicated server, รองรับ load users ได้เยอะๆ


