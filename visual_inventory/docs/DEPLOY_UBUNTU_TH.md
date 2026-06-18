# คู่มือย้าย Visual Inventory ไป Ubuntu Server

เอกสารนี้อธิบายขั้นตอนย้ายโปรเจกต์จากเครื่องพัฒนา (Windows/XAMPP) ไปยัง **Ubuntu Server** ในโรงงานที่ **ไม่มี Internet** (หรือมีเฉพาะ LAN ภายใน)

---

## 1. ภาพรวมสถาปัตยกรรม

```
[Browser / Handheld / TV]
        │
        ▼
[Ubuntu Server — Nginx หรือ Apache + PHP-FPM 8.2+ + MariaDB]
   /visual_inventory/          ← โฟลเดอร์โปรเจกต์ (มี .htaccess)
   /visual_inventory/public/   ← หน้าเว็บหลัก
   /visual_inventory/handheld/ ← UI สำหรับเครื่องสแกน
   /visual_inventory/api/      ← JSON API
        │
        ├──► MariaDB (visual_inventory_db)
        ├──► CPK Service      (194.10.10.15) — LAN
        ├──► PD Service       (194.10.10.89) — LAN
        ├──► Raspberry Pi IO  (WiFi IP ใน Admin) — LAN
        └──► Ollama (localhost:11434) — ถ้าใช้ Abdul AI
```

**URL ตัวอย่าง (จาก `.env` จริง):**

| บริการ | URL |
|--------|-----|
| หน้าหลัก | `http://172.31.71.125/visual_inventory/` |
| Login | `http://172.31.71.125/visual_inventory/public/login` |
| Handheld | `http://172.31.71.125/visual_inventory/handheld/` |
| Abdul AI | `http://172.31.71.125/visual_inventory/public/abdul_ai/` |

> แทน `172.31.71.125` ด้วย IP หรือ hostname ของ Ubuntu server จริง

---

## 2. สิ่งที่ต้องเตรียมก่อนย้าย (เครื่องที่มี Internet)

ทำบนเครื่องพัฒนา **ก่อน** copy ไป server:

### 2.1 ดาวน์โหลด asset สำหรับ offline

```bash
node scripts/download-offline-assets.mjs
```

ตรวจว่ามีไฟล์ครบ:

- `public/plugins/google-fonts/files/*.woff2` (27 ไฟล์)
- `public/plugins/font-awesome/webfonts/*` (8 ไฟล์)

### 2.2 ตรวจสุขภาพโปรเจกต์ (ไม่บังคับ)

```bash
node scripts/audit-project-health.mjs
```

### 2.3 สิ่งที่ต้อง copy ไป server

| โฟลเดอร์/ไฟล์ | จำเป็น |
|----------------|--------|
| `public/` | ใช่ |
| `api/` | ใช่ |
| `config/` | ใช่ |
| `handheld/` | ใช่ |
| `languages/` | ใช่ |
| `vendor/` | ใช่ (PHPMailer) |
| `public/abdul_ai/vendor/` | ใช่ (ถ้าใช้ Abdul AI) |
| `.htaccess` (รากโปรเจกต์) | ใช่ (Apache); Nginx ใช้ `docs/deploy/nginx-visual_inventory.conf` |
| `visual_inventory_db.sql` | ใช่ (import DB) |
| `migrations/*.sql` | แนะนำ |
| `.env` | สร้างใหม่บน server จาก `.env.example` |
| `scripts/` | ใช่ (cron CLI) |
| `raspi/` | ถ้าใช้ IO Gateway |

**ไม่ต้อง copy:**

- `.cursor/`, `debug-*.log`, `node_modules/`
- `.env` จากเครื่อง dev โดยตรง (มีรหัสผ่านจริง — สร้างใหม่บน server)

### 2.4 วิธีส่งไฟล์ไป Ubuntu (ไม่มี Internet)

เลือกอย่างใดอย่างหนึ่ง:

- USB / ฮาร์ดดิสก์ภายนอก
- `scp` / `rsync` ผ่าน LAN ภายในโรงงาน
- ZIP: `tar -czf visual_inventory.tar.gz visual_inventory/` แล้วคัดลอก

---

## 3. ติดตั้ง Ubuntu Server

เลือก **เว็บเซิร์ฟเวอร์อย่างใดอย่างหนึ่ง** — Nginx (แนะนำ production) หรือ Apache

### 3.1 แพ็กเกจร่วม (ทุกกรณี)

```bash
sudo apt update
sudo apt install -y \
  mariadb-server \
  php-cli php-fpm php-mysql php-mysqli php-curl php-mbstring php-xml php-zip \
  composer \
  unzip
```

ตรวจเวอร์ชัน PHP (ต้อง **8.2 ขึ้นไป**):

```bash
php -v
php-fpm8.2 -v   # หรือ php8.3-fpm ตามที่ติดตั้ง
```

ตั้ง timezone ใน PHP (แทน `php_value` ใน `.htaccess` ที่ Nginx อ่านไม่ได้):

```bash
sudo sed -i 's|^;date.timezone =.*|date.timezone = Asia/Bangkok|' /etc/php/8.2/fpm/php.ini
sudo sed -i 's|^;date.timezone =.*|date.timezone = Asia/Bangkok|' /etc/php/8.2/cli/php.ini
sudo systemctl restart php8.2-fpm
```

### 3.2 ตัวเลือก A — Apache

```bash
sudo apt install -y apache2 libapache2-mod-php
sudo a2enmod rewrite headers proxy_fcgi setenvif
sudo a2enconf php8.2-fpm
sudo systemctl restart apache2
```

### 3.3 ตัวเลือก B — Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.4 ตั้งค่า MariaDB

```bash
sudo mysql_secure_installation
```

สร้าง database และ user:

```sql
CREATE DATABASE visual_inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'vi_app'@'localhost' IDENTIFIED BY 'รหัสผ่านที่แข็งแรง';
GRANT ALL PRIVILEGES ON visual_inventory_db.* TO 'vi_app'@'localhost';
FLUSH PRIVILEGES;
```

Import ข้อมูล:

```bash
mysql -u vi_app -p visual_inventory_db < /var/www/visual_inventory/visual_inventory_db.sql
```

รัน migration เพิ่มเติม (ถ้ามี):

```bash
mysql -u vi_app -p visual_inventory_db < /var/www/visual_inventory/migrations/20260601_app_settings_fifo.sql
```

---

## 4. วางไฟล์โปรเจกต์

### 4.1 ตำแหน่งที่แนะนำ

```bash
sudo mkdir -p /var/www/visual_inventory
sudo chown -R $USER:www-data /var/www/visual_inventory
```

คัดลอกไฟล์โปรเจกต์ไปที่ `/var/www/visual_inventory/`

### 4.2 สิทธิ์ไฟล์

```bash
cd /var/www/visual_inventory
sudo find . -type d -exec chmod 755 {} \;
sudo find . -type f -exec chmod 644 {} \;
sudo chown -R www-data:www-data .
```

โฟลเดอร์ที่ PHP อาจต้องเขียน (ถ้ามี log/upload):

```bash
sudo chmod -R 775 public/abdul_ai/logs 2>/dev/null || true
```

### 4.3 Composer (ถ้า `vendor/` ไม่ได้ copy มา)

```bash
cd /var/www/visual_inventory
composer install --no-dev --optimize-autoloader
```

Abdul AI (แยก):

```bash
cd /var/www/visual_inventory/public/abdul_ai
composer install --no-dev --optimize-autoloader
```

> ถ้า server **ไม่มี Internet** ให้ copy โฟลเดอร์ `vendor/` มาจากเครื่อง dev แทน

---

## 5. ตั้งค่า `.env` บน Production

```bash
cd /var/www/visual_inventory
cp .env.example .env
nano .env
```

ค่าสำคัญที่ต้องแก้:

```ini
# Database
DB_HOST=localhost
DB_NAME=visual_inventory_db
DB_USER=vi_app
DB_PASS=รหัสผ่านที่ตั้งไว้

# Production
APP_ENV=production
TIMEZONE=Asia/Bangkok
APP_BASE_URL=http://172.31.71.125/visual_inventory

# บริการภายในโรงงาน (LAN)
PDSERVICE_BASE_URL=http://194.10.10.89/PDService/Service1.svc/rest
CPK_SERVICE_BASE_URL=http://194.10.10.15/CPKservice/cpk_service
CPK_MC_ID=8251
CPK_STATION_KEY=ค่าจาก IT

# Mail (ถ้าใช้แจ้งเตือนวันหมดอายุ)
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_EMAIL=...

# IO Gateway (Raspberry Pi)
RASPI_IO_KEY=resapikey

# Abdul AI — ใช้ Ollama ในเครื่อง (offline)
AI_PROVIDER=ollama
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
```

ป้องกัน `.env` ไม่ให้เข้าถึงจากเว็บ:

```bash
chmod 600 .env
```

---

## 6. ตั้งค่าเว็บเซิร์ฟเวอร์

โปรเจกต์ใช้กฎ rewrite จาก `.htaccess` ที่ราก:

- `/visual_inventory/` → `public/`
- `/visual_inventory/add_stock` → `public/add_stock.php`
- ยกเว้น `api/`, `handheld/`, `config/`, `vendor/`, `maintenance/`, `scripts/`

> Timezone ตั้งใน `php.ini` แล้ว (ดู [§3.1](#31-แพ็กเกจร่วมทุกกรณี)) — Nginx อ่าน `php_value` ใน `.htaccess` ไม่ได้

---

### 6A. Apache

ต้องเปิด `AllowOverride All` เพื่อให้อ่าน `.htaccess`

#### วิธี A: ใต้ DocumentRoot หลัก (ตรงกับ `APP_BASE_URL`)

ถ้า DocumentRoot คือ `/var/www/html`:

```bash
sudo ln -s /var/www/visual_inventory /var/www/html/visual_inventory
```

แก้ `/etc/apache2/apache2.conf` หรือ vhost:

```apache
<Directory /var/www/html/visual_inventory>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

#### วิธี B: VirtualHost แยก

```apache
<VirtualHost *:80>
    ServerName vi.factory.local
    DocumentRoot /var/www/visual_inventory

    <Directory /var/www/visual_inventory>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/visual_inventory_error.log
    CustomLog ${APACHE_LOG_DIR}/visual_inventory_access.log combined
</VirtualHost>
```

ถ้าใช้วิธี B ให้ตั้ง `APP_BASE_URL=http://vi.factory.local` (ไม่มี `/visual_inventory` ต่อท้าย)

เปิดใช้ site และรีสตาร์ท:

```bash
sudo a2ensite visual_inventory.conf   # ถ้าสร้างไฟล์แยก
sudo systemctl restart apache2
```

ทดสอบ:

```bash
curl -sI http://127.0.0.1/visual_inventory/ | head -5
```

---

### 6B. Nginx + PHP-FPM (แนะนำ)

Nginx **ไม่อ่าน** `.htaccess` — ต้องกำหนด rewrite ใน config โดยตรง

#### ขั้นตอน

1. วางโปรเจกต์ที่ `/var/www/visual_inventory/`
2. Copy config ตัวอย่าง:

```bash
sudo cp /var/www/visual_inventory/docs/deploy/nginx-visual_inventory.conf \
        /etc/nginx/sites-available/visual_inventory
```

3. แก้ค่าในไฟล์:

| ค่า | ตัวอย่าง |
|-----|----------|
| `server_name` | IP หรือ hostname ของ server |
| `fastcgi_pass` | `unix:/run/php/php8.2-fpm.sock` (หรือ `php8.3-fpm`) |

4. เปิดใช้และทดสอบ:

```bash
sudo ln -sf /etc/nginx/sites-available/visual_inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### พฤติกรรม URL (เทียบ Apache)

| URL ที่เรียก | ไปที่ |
|--------------|-------|
| `/visual_inventory/` | redirect → `public/index` |
| `/visual_inventory/add_stock` | `public/add_stock.php` |
| `/visual_inventory/api/receive_item` | `api/receive_item.php` |
| `/visual_inventory/handheld/` | `handheld/index.php` |
| `/visual_inventory/config/` | **403 Forbidden** |

#### VirtualHost แยก (ไม่มี prefix `/visual_inventory`)

ถ้า `APP_BASE_URL=http://vi.factory.local` ให้เปลี่ยน `root` เป็น:

```nginx
root /var/www/visual_inventory/public;
```

และลบ prefix `/visual_inventory` ออกจากทุก `location` (ใช้ `try_files` + `@php` แบบมาตรฐาน)

#### ทดสอบหลังตั้ง Nginx

```bash
curl -sI http://127.0.0.1/visual_inventory/ | head -3
curl -sI http://127.0.0.1/visual_inventory/public/login | head -3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/visual_inventory/plugins/google-fonts/files/outfit-latin-400-normal.woff2
# ควรได้ 200
```

Log เมื่อ error:

```bash
sudo tail -f /var/log/nginx/visual_inventory_error.log
sudo tail -f /var/log/php8.2-fpm.log
```

---

## 7. Abdul AI + Ollama (systemd)

Abdul AI อ่าน `AI_PROVIDER`, `OLLAMA_HOST`, `OLLAMA_MODEL` จาก `.env` ที่รากโปรเจกต์

### 7.1 ติดตั้ง Ollama

**เครื่องที่มี Internet:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma3:4b
```

**เครื่อง offline (copy จากเครื่องที่มีเน็ต):**

```bash
# บนเครื่องต้นทาง — หลัง pull model แล้ว
sudo tar -czf ollama-models.tar.gz -C /usr/share/ollama .ollama
# หรือ ~/.ollama ถ้าติดตั้งแบบ user

# บน Ubuntu server
sudo mkdir -p /usr/share/ollama/.ollama
sudo tar -xzf ollama-models.tar.gz -C /usr/share/ollama/.ollama
sudo chown -R ollama:ollama /usr/share/ollama
```

### 7.2 systemd service

สคริปต์ติดตั้งอย่างเป็นทางการมักสร้าง `ollama.service` ให้อยู่แล้ว:

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

ตรวจ API:

```bash
curl http://127.0.0.1:11434/api/tags
ollama list
```

#### Override / สร้าง unit เอง

ตัวอย่าง unit อยู่ที่ [docs/deploy/ollama.service.example](deploy/ollama.service.example)

```bash
# ดู unit ปัจจุบัน
systemctl cat ollama

# สร้าง override (ฟังเฉพาะ localhost)
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment=OLLAMA_HOST=127.0.0.1:11434
Restart=always
RestartSec=3
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
```

> `OLLAMA_HOST=127.0.0.1:11434` ใน service ต้องตรงกับ `.env` → `OLLAMA_HOST=http://127.0.0.1:11434`

#### สิทธิ์ user `ollama`

```bash
id ollama
sudo usermod -aG ollama www-data   # ไม่จำเป็นสำหรับ HTTP — PHP เรียกผ่าน localhost
```

### 7.3 ทดสอบ Abdul AI

```bash
# ทดสอบ model โดยตรง
ollama run gemma3:4b "สวัสดี"

# ทดสอบผ่านเว็บ
curl -sI http://127.0.0.1/visual_inventory/public/abdul_ai/ | head -3
```

ใน `.env`:

```ini
AI_PROVIDER=ollama
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
```

---

## 8. Cron — แจ้งเตือนวันหมดอายุ

สคริปต์ `scripts/notify_expiry.php` รันได้เฉพาะ CLI:

```bash
sudo crontab -e
```

เพิ่ม (รันทุกวัน 08:00):

```cron
0 8 * * * /usr/bin/php /var/www/visual_inventory/scripts/notify_expiry.php >> /var/log/vi_notify_expiry.log 2>&1
```

ทดสอบด้วยมือ:

```bash
php /var/www/visual_inventory/scripts/notify_expiry.php
```

---

## 9. เครือข่ายที่ Server ต้องเข้าถึงได้ (LAN)

| ปลายทาง | พอร์ต | ใช้งาน |
|---------|-------|--------|
| MariaDB localhost | 3306 | ฐานข้อมูล |
| CPK `194.10.10.15` | 80 | รับ/เบิก PUID, Picklist |
| PD Service `194.10.10.89` | 80 | ค้นหา PUID |
| Raspberry Pi (WiFi IP) | 8080 | ไฮไลต์ Rack |
| SMTP `MAIL_HOST` | 587 | อีเมลแจ้งเตือน (ถ้าใช้) |
| Ollama `127.0.0.1` | 11434 | Abdul AI (ถ้าใช้) |

ทดสอบจาก server:

```bash
curl -s -o /dev/null -w "%{http_code}" http://194.10.10.15/CPKservice/cpk_service/GetVersion
curl -s -o /dev/null -w "%{http_code}" http://194.10.10.89/PDService/Service1.svc/rest/
```

---

## 10. Checklist หลัง Deploy

### 10.1 ระบบพื้นฐาน

- [ ] เปิด `http://<server>/visual_inventory/` แล้ว redirect ไป login
- [ ] Login ด้วย user admin ได้
- [ ] หน้า Dashboard แสดงฟอนต์และ icon ครบ (ไม่มีกล่องสี่เหลี่ยมแทน icon)
- [ ] DevTools → Network ไม่มี `.woff2` / `.css` สีแดง (404)

### 10.2 ฟังก์ชันหลัก

- [ ] `add_stock` — สแกน/บันทึกได้
- [ ] `search_product` — ค้นหา + ไฮไลต์ IO (ถ้ามี Pi)
- [ ] `show_api_data` — โหลด Reservation จาก CPK
- [ ] `handheld/` — เปิดบนเครื่องสแกนได้
- [ ] `tv_display` — แสดงบน TV (ตั้ง `TV_KIOSK_KEY` ถ้าต้องการ)

### 10.3 ความปลอดภัย

- [ ] `.env` ไม่เปิดผ่าน browser (`chmod 600`)
- [ ] `config/` ถูก block (Apache: `.htaccess` / Nginx: `return 403`)
- [ ] `scripts/` ถูก block จากเว็บ
- [ ] `APP_ENV=production` (ปิด maintenance tools สำหรับ dev)
- [ ] เปลี่ยนรหัส admin default หลัง import DB

### 10.4 Abdul AI (ถ้าใช้)

- [ ] `systemctl is-active ollama` = `active`
- [ ] `ollama list` แสดง model `gemma3:4b`
- [ ] `curl http://127.0.0.1:11434/api/tags` ได้ JSON
- [ ] เปิด `public/abdul_ai/` แล้ว chat ได้

---

## 11. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | แก้ไข |
|-------|-------------------|-------|
| 404 ทุกหน้า (Apache) | `mod_rewrite` ปิด | `sudo a2enmod rewrite && sudo systemctl restart apache2` |
| 404 / ดาวน์โหลด `.php` แทนรันหน้า (Nginx) | PHP-FPM ไม่ผูก / rewrite ผิด | ตรวจ `fastcgi_pass`, `nginx -t`, ดู `visual_inventory_error.log` |
| 502 Bad Gateway (Nginx) | `php8.x-fpm` ไม่รัน | `sudo systemctl restart php8.2-fpm` |
| 500 Internal Server Error | สิทธิ์ไฟล์ / PHP error | Apache: `error.log` / Nginx: `php8.2-fpm.log` |
| Database connection failed | `.env` ผิด / DB ไม่รัน | ตรวจ `DB_*` และ `sudo systemctl status mariadb` |
| Icon/ฟอนต์ไม่แสดง | ไม่ได้ copy `plugins/.../files` | รัน `download-offline-assets.mjs` บนเครื่องมีเน็ต แล้ว copy ใหม่ |
| CPK timeout | Server ไม่ถึง `194.10.10.15` | ตรวจ firewall / VLAN routing |
| IO ไม่ติด | Pi IP ผิดใน Admin | ตรวจ `ethernet_ios` และ `RASPI_IO_KEY` |
| Abdul AI ไม่ตอบ | Ollama service หยุด / ไม่มี model | `sudo systemctl restart ollama` แล้ว `ollama list` |
| Ollama ไม่ขึ้นหลัง reboot | ไม่ได้ enable | `sudo systemctl enable ollama` |
| URL ผิด (link พาไป localhost) | `APP_BASE_URL` ผิด | แก้ใน `.env` ให้ตรง IP server จริง |

---

## 12. อ้างอิงเอกสารอื่น

| เอกสาร | เนื้อหา |
|--------|---------|
| [README.md](../README.md) | Setup ทั่วไป, CPK endpoints |
| [deploy/nginx-visual_inventory.conf](deploy/nginx-visual_inventory.conf) | Config Nginx พร้อมใช้ |
| [deploy/ollama.service.example](deploy/ollama.service.example) | ตัวอย่าง systemd unit Ollama |
| [USER_GUIDE_TH.md](USER_GUIDE_TH.md) | คู่มือผู้ใช้ |
| [TEST_CHECKLIST_TH.md](TEST_CHECKLIST_TH.md) | QA หลัง deploy |
| [RASPI_IO_API.md](RASPI_IO_API.md) | API IO Gateway |
| [raspi/README.md](../raspi/README.md) | ติดตั้ง Raspberry Pi |

---

*อัปเดต: มิถุนายน 2026 — สำหรับ Visual Location Management (visual_inventory)*
