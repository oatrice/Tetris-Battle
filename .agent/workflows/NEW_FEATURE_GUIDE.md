---
description: ขั้นตอนการสร้างฟีเจอร์ใหม่ (New Feature Workflow)
---

Workflow นี้เป็นแนวทางมาตรฐานในการพัฒนาฟีเจอร์ใหม่ เพื่อให้มั่นใจในคุณภาพและความถูกต้อง

1. **ทำความเข้าใจ Requirement**
   - อ่าน User Story หรือ Task Description ให้ละเอียด
   - ตรวจสอบว่ามี Design Mockup หรือไม่?

2. **ออกแบบ (Design)**
   - กำหนด Interface / Class ที่ต้องสร้างหรือแก้ไข (Ref: `docs/API_DESIGN.md`)
   - ตรวจสอบผลกระทบกับ Module อื่น (Architecture Check)

3. **เขียน Test (TDDRed)**
   // turbo
   - สร้างไฟล์ Test Case ใหม่ใน `tests/`
   - เขียน Test ที่ "Fails" ตาม Requirement (เช่น `expect(game.rotate()).toBe(true)`)

4. **Implement (TDD Green)**
   - เขียนโค้ดเพื่อให้ Test ผ่าน (Keep it simple)
   - รัน Test เพื่อยืนยัน: `npm test`

5. **Refactor & Optimize (TDD Refactor)**
   - ปรับปรุงโค้ดให้สะอาด (Clean Code)
   - ตรวจสอบ Performance

6. **อัปเดตเอกสาร**
   - หากมีการแก้ API ให้อัปเดต `docs/API_DESIGN.md`
   - บันทึกการเปลี่ยนแปลงใน Changelog
