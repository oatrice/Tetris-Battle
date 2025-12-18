---
description: ขั้นตอนการแก้ไขบั๊ก (Bug Fix Workflow)
---

Workflow นี้ช่วยในการวิเคราะห์และแก้ไขบั๊กอย่างเป็นระบบ

1. **Reproduce Issue**
   - ลองทำตามขั้นตอนที่แจ้งใน Bug Report
   - หากทำซ้ำไม่ได้ ให้ขอข้อมูลเพิ่มเติม

2. **Create Test Case (Regression Test)**
   - สร้าง Test case ที่จำลองสถานการณ์ที่เกิดบั๊ก
   - ยืนยันว่า Test "Fail" จริงๆ (Red State)

3. **Analyze Root Cause**
   - ใช้ Debugger หรือ Log เพื่อหาจุดผิดพลาด
   - ตรวจสอบ Commit ล่าสุดที่อาจเกี่ยวข้อง

4. **Apply Fix**
   - แก้ไขโค้ด
   - รัน Test ที่สร้างไว้ ต้องเปลี่ยนเป็น "Green"
   - รัน Test อื่นๆ ทั้งหมดเพื่อให้มั่นใจว่าไม่มี Side Effect

5. **Review & Verify**
   - ตรวจสอบโค้ดอีกครั้ง (Self-Review)
   - **Check Lints**: ตรวจสอบและลบตัวแปร/import ที่ไม่ได้ใช้งาน (Unused vars/imports) โดยเฉพาะในไฟล์ Test ที่เพิ่งแก้
   - ทดสอบบนหน้า UI จริง (ถ้าเกี่ยวข้อง)

6. **Update Documentation & Changelog**
   - บันทึกการแก้ไขลงใน `client-ts/CHANGELOG.md`
   - หากมีการ Bump Version:
     - **Build Check**: รัน `npm test` และ `npm run build` เพื่อตรวจสอบความเสถียร
     - **Runtime Check**: รัน `npm run dev` เพื่อตรวจสอบการทำงานจริงบน Browser
   - อัปเดตเอกสารอื่นๆ ที่เกี่ยวข้อง

