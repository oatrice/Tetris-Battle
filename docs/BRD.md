# Business Requirements Document (BRD)
**Project Name:** Tetris-Battle (Web Edition)
**Version:** 1.0
**Status:** In Progress
**Document Owner:** Luma (AI Agent)

## 1. Executive Summary & Objective
**วัตถุประสงค์หลัก:** เปลี่ยนแพลตฟอร์มเกม Tetris Battle จาก Desktop Client (C++) มาเป็น **Web Application (TypeScript)** เพื่อเพิ่มการเข้าถึง (Accessibility) และความสะดวกในการพัฒนาต่อยอด (Maintainability)
**เป้าหมายทางธุรกิจ:**
1.  **ขยายฐานผู้เล่น:** ผู้ใช้สามารถเล่นได้ทันทีผ่าน Browser ไม่ต้องดาวน์โหลด/ติดตั้ง (Zero-friction onboarding)
2.  **Modernize UX:** สร้างประสบการณ์การเล่นที่ลื่นไหลและสวยงามกว่าเวอร์ชัน C++ เดิมด้วย Web Technologies
3.  **Cross-Platform:** รองรับทั้ง Desktop, Tablet และ Mobile (ในอนาคต)

## 2. Scope
### 2.1 In-Scope (Phase 1)
*   **Game Core:** ระบบการเล่น Tetris พื้นฐาน (Move, Rotate, Drop, Line Clear)
*   **Multiplayer:** ระบบห้องเล่น 2 คน (1vs1) เชื่อมต่อผ่าน WebSocket
*   **Platform:** Web Browser (Chrome, Firefox, Safari) บน Desktop และ Laptop
*   **UI:** หน้า Game Board, Scoreboard, Next Piece, Hold Piece

### 2.2 Out-of-Scope (Phase 1)
*   ระบบจัดอันดับ (Leaderboard/Ranking)
*   การเล่นบนมือถือ (Mobile Touch Controls - จะทำใน Phase 2)
*   ระบบ AI Opponent

## 3. Success Metrics (KPIs)
*   **Performance:** เกมรันที่ 60 FPS บนเครื่อง Mid-range laptop
*   **Latency:** Input Latency < 50ms, Network Latency (RTT) < 100ms playability
*   **Reliability:** ไม่มี Critical Bug (Game Crash/Freeze) ในการเล่นต่อเนื่อง 30 นาที

## 4. Key Stakeholders
*   **Users:** ผู้เล่นทั่วไปที่ต้องการเล่น Tetris กับเพื่อน
*   **Developer:** คุณ (Oatrice) และ Luma (AI)
