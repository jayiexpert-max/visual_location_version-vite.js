# Visual Location Management - Project Standards

เพื่อความเป็นระเบียบและง่ายต่อการพัฒนาต่อ โปรดปฏิบัติตามมาตรฐานการจัดเก็บไฟล์ดังนี้:

## โครงสร้างโฟลเดอร์ (Directory Structure)

- `/api/`: ไฟล์สำหรับ Backend API (JSON response)
- `/config/`: ไฟล์ตั้งค่าระบบ, การเชื่อมต่อ Database, Session และ service classes (เช่น `EthernetIO.php`, `box_layout_service.php`)
- `/languages/`: ไฟล์ภาษา (th.php, en.php)
- `/maintenance/`: ไฟล์สำหรับช่วยจัดการระบบ, ไฟล์ Test หรือ Script ที่ใช้งานครั้งเดียว (ไม่ควรอยู่ใน public)
- `/public/`: ไฟล์หน้าเว็บหลักที่ผู้ใช้เข้าถึงได้
  - `/assets/`: ไฟล์รูปภาพ, icon, เสียงแจ้งเตือน
  - `/plugins/`: ไลบรารี frontend (jQuery, FontAwesome, Babylon.js ฯลฯ)
- `/scripts/`: Script สำหรับรันในเครื่อง (Windows/Linux)
- `/vendor/`: ไฟล์จาก Composer

## กฎการตั้งชื่อและจัดการไฟล์

1. **ห้ามมีไฟล์ Copy**: ไม่ควรเก็บไฟล์ที่เป็น backup หรือ copy ไว้ในโฟลเดอร์ทำงาน (เช่น `index copy.php`) ให้ใช้ Git ในการจัดการเวอร์ชันแทน
2. **Naming Convention**: ใช้ `snake_case` ในการตั้งชื่อไฟล์ เช่น `add_stock.php`
3. **การเก็บไฟล์ Utility**: หากสร้างไฟล์เพื่อ Test หรือ Fix ข้อมูล เมื่อใช้งานเสร็จแล้วควรย้ายไปไว้ที่ `/maintenance/` หรือลบทิ้ง
4. **Assets**: รูปภาพหรือ favicon ควรเก็บไว้ใน `/public/assets/`
5. **API duplication**: logic ร่วมอยู่ใน `/config/*_service.php`; ไฟล์ใน `/api/` และ `/public/*_proxy.php` เป็น thin wrapper เท่านั้น

---

_จัดระเบียบล่าสุดเมื่อ: 2026-05-30_
