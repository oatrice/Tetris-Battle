# Project Overview

**Project Name:** Tetris-Battle
**Vision:** สร้างเกม Tetris แบบ Multiplayer Real-time ที่มีประสิทธิภาพสูงและ UI ที่สวยงามทันสมัย
**Current Goal:** ย้ายระบบ Client จาก C++ (Raylib) ไปสู่ **TypeScript ล้วน (Web Canvas)** เพื่อเข้าถึงผู้เล่นได้ง่ายขึ้นและพัฒนา UX ได้ดีกว่า

## 🎯 Key Features (คุณสมบัติหลัก)
1.  **Multiplayer Battle:** แข่งขันวางบล็อกและส่ง Garbage Lines หาคู่ต่อสู้แบบ Real-time(Next phase, not now)
2.  **Modern UI/UX:** กราฟิกสวยงาม Animation ลื่นไหล 60FPS+ บน Web Browser
3.  **Cross-Platform:** เล่นได้ทันทีบน PC และ Mobile ผ่าน Browser ไม่ต้องติดตั้ง

## 🛠 Tech Stack (After Migration)
*   **Frontend:** Vite, Vercel, NuxtJS, TypeScript, HTML5 Canvas, WebSockets (เชื่อมต่อ Server)
*   **Backend:** Go (Golang) - จัดการ Room, Matchmaking, และ Game State Sync (Existing)
*   **DevOps:** Docker, GitHub Actions

## 🚀 Getting Started
1.  **Requirement:** Node.js v18+, Go 1.21+
2.  **Setup:** `npm install`
3.  **Run Dev:** `npm run dev`
