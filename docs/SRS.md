# Software Requirements Specification (SRS)
**Project Name:** Tetris-Battle (Web Edition)
**Version:** 1.0

## 1. Functional Requirements (FR)

### FR-01: Game Mechanics (Core)
*   **FR-01-1:** ระบบต้องแสดงกระดานขนาด 10x20 ช่อง
*   **FR-01-2:** ชิ้นส่วน (Tetromino) ต้องซุ่มเกิดแบบ 7-Bag Randomizer
*   **FR-01-3:** ระบบต้องรองรับการหมุนแบบ SRS (Super Rotation System) รวมถึงการ Wall Kick
*   **FR-01-4:** เมื่อแถวเต็ม ระบบต้องลบแถวนั้นและเลื่อนบล็อกข้างบนลงมา พร้อมคิดคะแนน

### FR-02: User Interaction
*   **FR-02-1:** ผู้เล่นควบคุมด้วยคีย์บอร์ด (ลูกศร, Spacebar, Shift, Z, C/Ctrl)
*   **FR-02-2:** ระบบต้องรองรับ ARR (Auto Repeat Rate) และ DAS (Delayed Auto Shift) เพื่อความเร็วในการเคลื่อนที่
*   **FR-02-3:** ผู้เล่นสามารถพักเกม (Pause) ได้ (เฉพาะโหมด Single Player)

### FR-03: Multiplayer Networking
*   **FR-03-1:** ผู้เล่นสามารถสร้างห้อง (Host) และเข้าร่วมห้อง (Join) โดยใช้ Room ID
*   **FR-03-2:** ระบบต้องส่งข้อมูล Game State (Board, Score) ไปยังคู่แข่งทุกๆ Frame (หรือเมื่อมีการเปลี่ยนแปลง)
*   **FR-03-3:** เมื่อผู้เล่นลบได้ 2 แถวขึ้นไป ระบบต้องส่ง Garbage Lines ไปให้คู่แข่ง

## 2. Non-Functional Requirements (NFR)

### NFR-01: Performance
*   **Render Time:** Frame time ต้องไม่เกิน 16.6ms (เพื่อรักษา 60 FPS)
*   **Load Time:** หน้าเว็บต้องโหลดเสร็จพร้อมเล่นภายใน 3 วินาที (First Contentful Paint)

### NFR-02: Scalability
*   Server (Go) ต้องรองรับ Concurrent Connection ได้อย่างน้อย 100 คู่ (200 Players) ต่อ Instance

### NFR-03: Compatibility
*   รองรับ Browser: Chrome 90+, Firefox 90+, Safari 15+, Edge

## 3. Assumptions & Constraints
*   ผู้เล่นต้องมีการเชื่อมต่ออินเทอร์เน็ตที่เสถียรสำหรับการเล่น Multiplayer
*   พัฒนาด้วย TypeScript และ Canvas API เป็นหลัก (ไม่ใช้ Game Engine สำเร็จรูปขนาดใหญ่)
