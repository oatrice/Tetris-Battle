---
description: ส่งงานให้ Luma AI ช่วยแก้บั๊กหรือเขียนโค้ด (Multi-Agent Hook)
---

1. **Invoke Luma Agent**
   - เปลี่ยน Directory ไปที่ Luma Project
   - รัน `main.py` โดยส่ง Argument เป็น Task ที่ต้องการ
   - (Optional) ระบุ `--fix-mode` ถ้าต้องการให้แก้บั๊ก

   ตัวอย่างคำสั่งที่จะรัน:
   ```bash
   cd /Users/oatrice/Software-projects/Luma
   python3 main.py --task "Fix build error in Tetris-Battle: <Paste Error Here>"
   ```

2. **Wait for Completion**
   - รอให้ Luma ทำงานเสร็จ (Code -> Review -> Test -> PR)
   - Luma จะทำการแก้ไขไฟล์ใน Project `Tetris-Battle` ให้โดยตรง (เพราะ `TARGET_DIR` ใน `main.py` ชี้มาที่นี่อยู่แล้ว)

3. **Verify**
   - กลับมาที่ Project นี้
   - รัน `npm test` เพื่อตรวจสอบความถูกต้อง
