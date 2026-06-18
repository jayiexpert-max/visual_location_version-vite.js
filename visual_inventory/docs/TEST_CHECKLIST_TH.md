# รายการทดสอบ QA — Visual Inventory (หลัง Phase 1–7)

> **ผู้ทดสอบ:** Factory IT / QA  
> **วิธีใช้:** ทำทีละหมวด ติ๊ก `[ ]` → `[x]` เมื่อผ่าน บันทึกวันที่และผู้ทดสอบ  
> **อ้างอิง:** [USER_GUIDE_TH.md](USER_GUIDE_TH.md)

| ฟิลด์ | ค่า |
|-------|-----|
| วันที่ทดสอบ | |
| ผู้ทดสอบ | |
| APP_BASE_URL | |
| APP_ENV | |
| เครื่องทดสอบ | Desktop / Handheld / TV |

---

## ลำดับความสำคัญ (ทำก่อน Go-Live)

| ลำดับ | หมวด | เหตุผล |
|-------|------|--------|
| **P0** | Auth, Session, PDService, CPK | กระทบการทำงานทุก shift |
| **P1** | Add/Withdraw, Handheld, Picklist | flow หลัก operator |
| **P2** | TV, IO, Reports | สนับสนุนการทำงาน |
| **P3** | UI polish, dev tools blocked | ไม่บล็อก production |

---

## Phase 1 — Authentication & Session

### 1.1 Desktop Login / Logout

- [ ] เปิด `{APP_BASE_URL}/login` — แสดงฟอร์ม login
- [ ] Login ด้วย user ปกติ — redirect ไป `index`
- [ ] Login ด้วย admin — เห็นเมนู admin เพิ่ม
- [ ] Login ผิด password — แสดง error ไม่เข้าระบบ
- [ ] Logout — กลับ login และ session ถูกทำลาย
- [ ] เปิด URL โดยไม่ login (เช่น `add_stock`) — redirect login

### 1.2 Session Timeout

- [ ] Desktop idle 4 ชม. (หรือจำลอง `last_activity` ใน session) — logout + redirect login
- [ ] Login ก่อน 07:00 แล้วใช้หลัง 07:00 — shift logout (`reason=shift`)
- [ ] Login ก่อน 19:00 แล้วใช้หลัง 19:00 — shift logout
- [ ] API JSON ไม่ login — HTTP 401 + JSON error (ทดสอบ `get_inventory_proxy.php?puid=test`)

### 1.3 TV Kiosk Auth

- [ ] ตั้ง `TV_KIOSK_KEY` ใน `.env`
- [ ] `get_box_layout.php` **ไม่มี** tv_key — 401/403 หรือ error (ไม่ login)
- [ ] `get_box_layout.php?tv_key=<correct>` — ได้ JSON layout
- [ ] tv_key ผิด — ถูกปฏิเสธ
- [ ] Header `X-TV-Kiosk-Key` — ใช้ได้เหมือน query param

---

## Phase 2 — Assets (Fonts, Favicon)

- [ ] หน้า `index` — Font Awesome icons แสดงครบ (ไม่มีสี่เหลี่ยม)
- [ ] ฟอนต์ Outfit/Kanit โหลดจาก `public/plugins/google-fonts/` (ปิด internet แล้ว refresh)
- [ ] Favicon Desktop — `public/assets/favicon.png`
- [ ] Favicon Handheld — `handheld/assets/icons/favicon.svg` หรือ png

---

## Phase 3 — SQL & Security Basics

- [ ] `manage_users` — เพิ่ม/แก้ user ด้วย prepared statement (ไม่ error SQL)
- [ ] Non-admin เปิด `manage_users` — ถูก redirect/deny
- [ ] `.env` ไม่ commit ใน git — มีใน `.gitignore`
- [ ] `.env.example` default `APP_ENV=production`

---

## Phase 4 — Maintenance Routing & Guards

### 4.1 CPK Test (Production-safe)

- [ ] `{APP_BASE_URL}/maintenance/cpk_test.php` ไม่ login — redirect/deny
- [ ] Login user ธรรมดา + `APP_ENV=production` — 403/deny
- [ ] Login admin + production — หน้า CPK test เปิดได้
- [ ] GetVersion แสดง PASS
- [ ] `?res_no=<valid>` — GET_RESNoInfo PASS/FAIL ตามข้อมูลจริง
- [ ] GetPublicUID — PASS เมื่อ `CPK_MC_ID` + `CPK_STATION_KEY` ถูก

### 4.2 Dev-only Maintenance

- [ ] `maintenance/fix_schema.php` + `APP_ENV=production` + admin — **403 blocked**
- [ ] `APP_ENV=development` + admin — เปิดได้ (ถ้าต้องทดสอบบน dev)
- [ ] `public/test_api.php` — blocked บน production
- [ ] `scripts/` — 403 จาก browser (CLI รันได้)

---

## Phase 5 — Factory UI (factory.css)

- [ ] หน้า `index`, `add_stock`, `search_product`, `admin` — ใช้ factory.css + app bar
- [ ] สลับ TH/EN — ข้อความเปลี่ยนตาม `languages/`
- [ ] ปุ่ม Home กลับ dashboard จากหน้าย่อย
- [ ] Mobile width ~768px — layout ไม่แตก (smoke test)

---

## Phase 6 — Handheld Performance & UX

### 6.1 Login Handheld

- [ ] `{APP_BASE_URL}/handheld/login` — เปิดได้
- [ ] สแกน employee ID (username = password pattern) — login เร็ว (< 2 วิ โดยประมาณ)
- [ ] สแกน password barcode — login สำเร็จ
- [ ] Password ผิด — แสดง error

### 6.2 Handheld Menu & Roles

- [ ] role `user` — เห็น Withdraw + Logout เท่านั้น
- [ ] role `material_prep` — เห็น Add, Withdraw, Receive, Logout
- [ ] role `admin` — เห็นครบทุกปุ่ม

### 6.3 Handheld Operations

- [ ] **Add Stock** — สแกน PUID → Get Data → submit สำเร็จ
- [ ] **Withdraw** — validate → confirm withdraw สำเร็จ
- [ ] **Receive Reservation** — สแกน PUID reservation สำเร็จ (ต้องมีข้อมูล CPK)
- [ ] PDService down — แสดงข้อความ error ชัด (ไม่ hang)
- [ ] `handheld_health.php` — JSON `pdservice: connected` เมื่อ LAN OK

### 6.4 Handheld Timeout

- [ ] Idle 30 นาที — redirect logout (`reason=idle`)
- [ ] กด/สแกนระหว่างใช้งาน — ไม่ timeout ก่อน 30 นาที
- [ ] Shift 07:00 / 19:00 — logout เหมือน desktop

### 6.5 Dashboard Link

- [ ] การ์ด Handheld บน `index` — ลิงก์ไป `/handheld/` ถูกต้อง

---

## Phase 7 — API Consolidation & Performance

- [ ] `public/get_box_layout.php` และ `api/get_box_layout.php` — ข้อมูล layout สอดคล้องกัน
- [ ] `public/get_inventory_proxy.php?puid=<valid>` — JSON จาก PDService/DB
- [ ] `layout_3d` — Babylon โหลด lazy (Network tab — ไม่โหลด babylon จนกว่าจะใช้)
- [ ] `TV_ALLOWED_IPS` ตั้งแล้ว — IP นอก list ได้ 403 บน `tv_display`
- [ ] `LAYOUT_3D_ALLOWED_IPS` — ทำงานเหมือน TV whitelist
- [ ] IO config อ่านจาก config/DB (ไม่ hardcode ใน EthernetIO เก่า) — smoke test `test_io.php`

---

## Functional Tests — Desktop (P0/P1)

### Add Stock (`add_stock`)

- [ ] material_prep — เข้าหน้าได้
- [ ] user — ถูก deny
- [ ] สแกน PUID valid — ดึงข้อมูล PDService
- [ ] ยืนยันรับเข้า — บันทึก DB + qty อัปเดต

### คำนวณวัตถุดิบตาม WO (`wo_material_calc`)

- [ ] ใส่ WO valid — โหลด BOM
- [ ] เปลี่ยนจำนวนผลิต — คำนวณความต้องการ/คงเหลืออัปเดต
- [ ] กดค้นหาพาร์ท — แสดงตำแหน่งบน TV/3D
- [ ] WO ไม่มีในระบบ — error ชัด
- [ ] URL เดิม `withdraw_by_workorder` — redirect มา `wo_material_calc`

### Special Withdraw (`withdraw_special`)

- [ ] admin — เข้าได้
- [ ] non-admin — deny
- [ ] เบิกข้าม FIFO — สำเร็จตาม flow

### Search Product (`search_product`)

- [ ] ค้นหาสินค้ามีในคลัง — แสดงตำแหน่ง
- [ ] IO trigger — ไฟ/IO ตอบ (ถ้ามี hardware)
- [ ] TV highlight — จอ TV แสดง highlight (ถ้ามี TV setup)

### Picklist Issue (`picklist_issue`)

- [ ] โหลด open picklists จาก CPK
- [ ] เลือก picklist → รายละเอียด
- [ ] Issue PUID — CPK + local สำเร็จ

### Production Orders (`manage_production_orders`)

- [ ] แสดงรายการ pending
- [ ] Badge บน dashboard ตรงกับจำนวนจริง

### Reports & Expiry

- [ ] `report_stock` — ค้นหา/แสดงข้อมูล
- [ ] `check_expiration` — filter expired / soon / normal
- [ ] `php scripts/notify_expiry.php` — ส่งเมลได้ (ถ้า MAIL_* ตั้งแล้ว)

### Admin

- [ ] `admin` — CRUD rack/box/slot smoke test
- [ ] `manage_users` — สร้าง user role ใหม่ login ได้

---

## Integration Tests

| ระบบ | ทดสอบ | ผ่าน |
|------|-------|------|
| PDService | test_net.php + handheld_health | [ ] |
| CPK GetVersion | cpk_test.php | [ ] |
| CPK Picklist | picklist_issue | [ ] |
| CPK Reservation Receive | handheld receive + api/receive_item | [ ] |
| Ethernet IO | search_product + test_io | [ ] |
| Mail expiry | notify_expiry.php | [ ] |

---

## Regression — Known Gaps (ไม่บล็อก Go-Live แต่ต้องรู้)

- [ ] **CSRF** — ยังไม่มี token (ยอมรับความเสี่ยงใน LAN หรือวางแผน Phase ถัดไป)
- [ ] **PHPUnit** — ไม่มี automated test suite
- [ ] **add_stock N+1** — ทดสอบ load ด้วย PUID จำนวนมาก วัดเวลา response
- [ ] **UI legacy pages** — `view_inventory_receive`, `login`, TV — ยังไม่ใช่ factory.css ทั้งหมด
- [ ] **`maintenance/withdraw_ajax.php`** — ตรวจว่าควร block ใน production หรือจำกัด role (ปัจจุบัน login ใครก็เรียกได้)

---

## Sign-off

| บทบาท | ชื่อ | ลายเซ็น | วันที่ |
|-------|------|---------|--------|
| QA | | | |
| IT Lead | | | |
| Production Supervisor | | | |

**ผลสรุป:** [ ] ผ่าน UAT  [ ] ผ่านมีเงื่อนไข  [ ] ไม่ผ่าน

**หมายเหตุ:**

---

_อัปเดต: 2026-05-30 — สอดคล้อง Phase 1–7_
