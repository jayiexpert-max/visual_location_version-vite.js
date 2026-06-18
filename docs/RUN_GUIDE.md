# คู่มือการรันโปรเจ็กต์ Visual Location

เอกสารนี้อธิบายวิธีติดตั้งและรันระบบ **Visual Location Management** บนเครื่องพัฒนา (local) และด้วย Docker

---

## สิ่งที่ต้องมีก่อนเริ่ม

| รายการ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|--------|----------------|----------|
| Node.js | 20+ | ตรวจสอบด้วย `node -v` |
| npm | 10+ | ตรวจสอบด้วย `npm -v` |
| MySQL / MariaDB | 10.4+ | XAMPP หรือ Docker |
| Docker (ถ้าใช้) | 24+ | สำหรับ MySQL + MQTT + API |

**พอร์ตที่ใช้**

| พอร์ต | บริการ |
|-------|--------|
| 3000 | NestJS API |
| 5173 | React (Vite dev server) |
| 3306 | MySQL / MariaDB |
| 1883 | MQTT (Mosquitto) |

> ถ้าพอร์ต 3306 ถูกใช้งานอยู่แล้ว (เช่น XAMPP + Docker พร้อมกัน) ให้ปิดตัวใดตัวหนึ่งก่อน

---

## โครงสร้างโปรเจ็กต์ (สรุป)

```
visual_location/
├── backend/          # NestJS API (deploy แยกได้)
│   ├── src/
│   ├── shared/       # Types / RBAC สำหรับ API
│   ├── database/
│   └── docker/       # Docker Compose (MySQL, MQTT, API)
├── frontend/         # React SPA (deploy แยกได้)
│   └── src/shared/   # Types / RBAC สำหรับ Web (copy จาก backend)
├── docs/
└── raspi/
```

> Deploy คนละ server IP: ดู [DEPLOYMENT.md](DEPLOYMENT.md)

---

## วิธีที่ 1: รันในเครื่อง (แนะนำสำหรับพัฒนา)

เหมาะกับผู้ที่มี **XAMPP** หรือ MySQL อยู่แล้ว และต้องการ hot-reload ทั้ง API และ Frontend

### ขั้นตอนที่ 1 — Clone / เข้าโฟลเดอร์โปรเจ็กต์

```bash
cd /Users/jayoverlay/Documents/visual_location
```

### ขั้นตอนที่ 2 — ติดตั้ง dependencies

```bash
npm run install:all
# หรือแยก: cd backend && npm install && cd ../frontend && npm install
```

### ขั้นตอนที่ 3 — เตรียม Database

เลือก **หนึ่ง** ในสองกรณีด้านล่าง

#### กรณี A: ใช้ DB เดิมจากระบบ PHP (มี user + ข้อมูลอยู่แล้ว) — แนะนำ

1. เปิด MySQL ใน XAMPP
2. รัน migration เพิ่มตาราง/คอลัมน์ใหม่สำหรับ NestJS:

```bash
mysql -u root visual_inventory_db < backend/database/migrations/001_additive_phase1.sql
```

> ถ้า MySQL ตั้งรหัสผ่าน root ให้เติม `-p` ท้ายคำสั่ง

#### กรณี B: สร้าง Database ใหม่ทั้งหมด

```bash
npm run db:init
npm run db:verify
```

หรือใช้ mysql โดยตรง:

```bash
mysql -u root < backend/database/init/01_full_schema.sql
mysql -u root visual_inventory_db < backend/database/migrations/002_phase4_iot.sql
mysql -u root visual_inventory_db < backend/database/migrations/003_phase6_production.sql
```

#### กรณี C: ใช้ DB เดิมจาก PHP + migration ครบ

```bash
mysql -u root visual_inventory_db < /path/to/visual_inventory/visual_inventory_db.sql
npm run db:migrate
npm run db:verify
```

#### กรณี D: ใช้ DB เดิมจาก PHP (migration 001 อย่างเดียว — แบบเดิม)

```bash
mysql -u root visual_inventory_db < backend/database/migrations/001_additive_phase1.sql
```

> แนะนำใช้ `npm run db:migrate` แทน เพื่อได้ตาราง IoT และ audit ครบ

### ขั้นตอนที่ 4 — ตั้งค่า Environment

#### API (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

แก้ค่าสำคัญอย่างน้อยดังนี้:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=visual_inventory_db
DB_USER=root
DB_PASS=                    # XAMPP ปกติเว้นว่าง

JWT_ACCESS_SECRET=your-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars

CORS_ORIGINS=http://localhost:5173
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
```

> `JWT_ACCESS_SECRET` และ `JWT_REFRESH_SECRET` ต้องยาวอย่างน้อย **32 ตัวอักษร** มิฉะนั้น API จะ start ไม่ได้

#### Frontend (`frontend/.env`)

```bash
cp frontend/.env.example frontend/.env
```

ค่าเริ่มต้นใช้งานได้ทันที:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

### ขั้นตอนที่ 5 — รัน MQTT (ถ้าต้องการทดสอบไฟ IO)

```bash
cd backend/docker
docker compose up -d mosquitto
cd ../..
```

> ถ้าไม่รัน MQTT ระบบหลักยังใช้งานได้ แต่ฟีเจอร์เปิดไฟแสดงตำแหน่ง (IO highlight) จะไม่ทำงาน

### ขั้นตอนที่ 6 — รัน Backend และ Frontend

เปิด **2 terminal** แยกกัน:

**Terminal 1 — API**

```bash
cd backend
npm run start:dev
```

คำสั่งนี้จะ build `shared/` อัตโนมัติก่อน start (ผ่าน `prestart:dev`)

รอจนเห็นข้อความ:

```
Application listening on port 3000
Swagger docs available at /api/docs
```

> **หมายเหตุ:** อย่าใช้ `npx tsx src/main.ts` — NestJS ต้องการ compiled JS พร้อม decorator metadata

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

รอจนเห็น:

```
Local: http://localhost:5173/
```

### ขั้นตอนที่ 7 — เปิดใช้งาน

| URL | หน้าที่ |
|-----|---------|
| http://localhost:5173/login | หน้า Login |
| http://localhost:5173/app | Dashboard |
| http://localhost:3000/api/docs | Swagger API Docs |
| http://localhost:3000/api/v1/health | Health check |
| http://localhost:5173/layout-3d | แผนผัง 3D (admin) |
| http://localhost:5173/tv?tv_key=YOUR_KEY | จอ TV Kiosk |

### ขั้นตอนที่ 8 — Login

ใช้ user ที่มีใน database เดิม เช่น `admin` พร้อมรหัสผ่านจากระบบ PHP

ทดสอบผ่าน Swagger → `POST /api/v1/auth/login`:

```json
{
  "username": "admin",
  "password": "รหัสผ่านเดิม",
  "deviceType": "desktop"
}
```

---

## วิธีที่ 2: รันด้วย Docker (Infrastructure)

เหมาะเมื่อต้องการ MySQL + MQTT + API ใน container โดยไม่พึ่ง XAMPP

### ขั้นตอนที่ 1 — ตั้งค่า Docker env

```bash
cd backend/docker
cp .env.example .env
```

แก้ค่าใน `docker/.env` ตามต้องการ (อย่างน้อย JWT secrets)

### ขั้นตอนที่ 2 — รัน services

```bash
cd backend/docker

# รันเฉพาะ MySQL + MQTT (พัฒนา API/Web ในเครื่อง)
docker compose up -d mysql mosquitto

# หรือรันทั้งหมดรวม API ใน container
docker compose up -d
```

### ขั้นตอนที่ 3 — ตั้งค่า API ในเครื่อง (ถ้าไม่ใช้ container api)

แก้ `backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=root
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
```

จากนั้นรัน API และ Web ตามวิธีที่ 1 ขั้นตอนที่ 6

> **หมายเหตุ:** Docker MySQL ครั้งแรกจะสร้าง schema จาก `database/init/01_full_schema.sql` แต่ **ไม่มี user** — ต้อง import dump จาก PHP เอง หรือสร้าง user ใน DB

### คำสั่ง Docker ที่ใช้บ่อย

```bash
cd backend/docker

# ดูสถานะ
docker compose ps

# ดู log
docker compose logs -f api
docker compose logs -f mysql

# หยุดทั้งหมด
docker compose down

# หยุดและลบ volume (ลบข้อมูล MySQL)
docker compose down -v
```

---

## คำสั่ง npm ที่ใช้บ่อย

รันจาก root โปรเจ็กต์ (`visual_location/`):

| คำสั่ง (จาก root) | หน้าที่ |
|--------|---------|
| `npm run install:all` | ติดตั้ง dependencies ทั้ง backend + frontend |
| `npm run backend:dev` | รัน NestJS โหมดพัฒนา |
| `npm run frontend:dev` | รัน React โหมดพัฒนา (Vite) |
| `npm run backend:build` | Build API |
| `npm run frontend:build` | Build Frontend |
| `npm run build` | Build ทั้งสองฝั่ง |

หรือรันในโฟลเดอร์โดยตรง: `cd backend && npm run start:dev` / `cd frontend && npm run dev`

> ถ้า terminal อยู่ใน `backend/` แล้วรัน `npm run backend:dev` จะขึ้น `Missing script: "backend:dev"`
> เพราะ script นี้อยู่ใน `package.json` ชั้น root เท่านั้น

---

## การตั้งค่าเพิ่มเติม (โรงงาน / Production)

### CPK Service

ตั้งค่าใน `backend/.env`:

```env
CPK_MC_ID=your-machine-id
CPK_STATION_KEY=your-station-key
CPK_SERVICE_BASE_URL=http://194.10.10.15/CPKservice/cpk_service
```

ต้องอยู่ใน factory LAN ถึงจะเชื่อมต่อ CPK ได้

### PDService (PUID lookup)

```env
PDSERVICE_BASE_URL=http://194.10.10.89/PDService/Service1.svc/rest
```

### TV Kiosk

ตั้งค่าใน API:

```env
TV_KIOSK_KEY=your-secret-kiosk-key
```

เปิดจอ TV:

```
http://localhost:5173/tv?tv_key=your-secret-kiosk-key&lang=th
```

### CORS (Frontend บน LAN)

```env
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173
```

---

## บทบาทผู้ใช้ (RBAC)

| Role | เมนูที่เข้าถึงได้ |
|------|------------------|
| `user` | Dashboard, Search, Rack, Expiry, Reports |
| `material_prep` | + Receive, Return, Picklist |
| `admin` | + 3D, TV, Users, System Admin |

ระบบจะ logout อัตโนมัติเมื่อสิ้นสุดกะงาน **07:00** และ **19:00** (Asia/Bangkok)

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|--------|-------------------|---------|
| `ECONNREFUSED` ต่อ DB | MySQL ไม่ได้เปิด | เปิด XAMPP MySQL หรือ `docker compose up -d mysql` |
| API start ไม่ได้ — JWT error | Secret สั้นเกินไป | ตั้ง `JWT_*_SECRET` ยาว ≥ 32 ตัวอักษร |
| API start ไม่ได้ — CORS error | ไม่ได้ตั้ง CORS | ใส่ `CORS_ORIGINS=http://localhost:5173` |
| Port 3306 ชน | XAMPP + Docker พร้อมกัน | ปิด MySQL ตัวใดตัวหนึ่ง |
| Port 3000 ชน | มี process อื่นใช้พอร์ต | เปลี่ยน `APP_PORT=3001` ใน `.env` |
| Login ไม่ได้ | ไม่มี user ใน DB | Import dump PHP หรือใช้ DB เดิม |
| CPK / PDService error | ไม่อยู่ใน factory LAN | ปกติ — เมนูอื่นยังใช้ได้ |
| MQTT / IO ไม่ทำงาน | Mosquitto ไม่ได้รัน | `docker compose up -d mosquitto` |
| Frontend เรียก API ไม่ได้ | `.env` ผิด | ตรวจ `VITE_API_BASE_URL` และว่า API รันอยู่ |
| ฟอนต์/ไอคอนหาย (offline) | ยังใช้ CDN หรือไม่มี `plugins/` | รัน `npm run sync:offline-assets` แล้ว build ใหม่ — ตรวจ `/plugins/google-fonts/` และ `/plugins/font-awesome/` |

---

## Offline / Local Server (ไม่มี Internet)

Frontend ใช้ฟอนต์และไอคอนแบบ self-hosted ใน `frontend/public/plugins/` (ไม่พึ่ง Google Fonts CDN):

| โฟลเดอร์ | เนื้อหา |
|----------|---------|
| `plugins/google-fonts/` | Outfit + Sarabun (woff2 + fonts.css) |
| `plugins/font-awesome/` | Font Awesome 6 (all.css + webfonts) |

ซิงก์จากโปรเจ็กต์ PHP (ถ้ามีการอัปเดต):

```bash
npm run sync:offline-assets
```

ตรวจหลัง deploy (ปิด internet แล้ว refresh):

```bash
curl -I http://<FRONTEND_IP>/plugins/google-fonts/files/outfit-latin-400-normal.woff2
curl -I http://<FRONTEND_IP>/plugins/font-awesome/webfonts/fa-solid-900.woff2
```

หมายเหตุ: รูปพนักงาน (`199.10.10.170/Allpic`) และลิงก์ CPK เป็น **LAN ภายในโรงงาน** ไม่ใช่ internet — ต้องเข้าถึงได้จากเครือข่ายโรงงานเท่านั้น

---

## Handheld (Keyence BT-A500)

UI แบบ dark full-screen เหมือน `ui_preview.php` / PHP handheld — ปุ่มใหญ่ ฟอนต์ 18px รองรับ keyboard wedge (สแกนแล้วส่ง Enter)

| URL | หน้า |
|-----|------|
| `/handheld/login` | Login (device type `handheld`, token 30 นาที) |
| `/handheld` | เมนูหลัก |
| `/handheld/add-stock` | รับเข้าคลัง (admin, material_prep) |
| `/handheld/receive-reservation` | รับตาม RES |
| `/handheld/picklist` | จ่าย Picklist |

จาก Dashboard desktop มีการ์ด **Handheld** ลิงก์ไป `/handheld`

Idle timeout 30 นาที → logout อัตโนมัติ (เหมือน PHP `handheld-idle.js`)

## Quick Start (สรุปสั้น)

```bash
cd /Users/jayoverlay/Documents/visual_location
npm run install:all

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# แก้ JWT secrets (≥32 ตัวอักษร) และ DB_PASS ใน backend/.env

# ใช้ DB เดิมจาก XAMPP
mysql -u root visual_inventory_db < backend/database/migrations/001_additive_phase1.sql

# Terminal 1 — API
cd backend && npm run start:dev
npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# ทดสอบ API
curl http://localhost:3000/api/v1/health
```

เปิด http://localhost:5173/login

---

## เอกสารที่เกี่ยวข้อง

| เอกสาร | เนื้อหา |
|--------|---------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy แยก Frontend / Backend server |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | โครงสร้างตาราง DB |
| [API_MAPPING.md](API_MAPPING.md) | แผนที่ API PHP → NestJS |
| [REACT_ARCHITECTURE.md](REACT_ARCHITECTURE.md) | โครงสร้าง Frontend |
| [NESTJS_ARCHITECTURE.md](NESTJS_ARCHITECTURE.md) | โครงสร้าง Backend |
