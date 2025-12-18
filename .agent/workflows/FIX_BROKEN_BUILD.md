---
description: Workflow สำหรับแก้ไข Build หรือ Test ที่พัง (ใช้เมื่อ Pre-commit failed)
---

Workflow นี้จะช่วยวิเคราะห์และแก้ไขปัญหาเมื่อ `npm run build` หรือ `npm test` ล้มเหลว

1. **Analyze Errors**
   // turbo
   - รันคำสั่ง `npm run build` และ `npm test` เพื่อดู Error Log ล่าสุด
   - วิเคราะห์ Error ที่เกิดขึ้น (เช่น Type Error, Syntax Error, หรือ Logic Test fail)

2. **Diagnose & Fix**
   - อ่านไฟล์ที่เกี่ยวข้องกับ Error
   - เสนอแนวทางการแก้ไข (Code Change)
   - หากเป็น Type Error ให้แก้ TypeScript Interface/Type
   - หากเป็น Logical Error ใน Test ให้แก้ Implementation หรือปรับ Test Case (ถ้ายืนยันว่า Test ผิด)

3. **Verify Fix**
   // turbo
   - รัน `npm run build` และ `npm test` อีกครั้งเพื่อยืนยันว่าผ่านแล้ว

4. **Retry Commit**
   - แจ้งผู้ใช้ว่าแก้ไขเสร็จสิ้น และให้ลอง Commit ใหม่
