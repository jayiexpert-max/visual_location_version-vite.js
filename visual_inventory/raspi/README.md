# ติดตั้ง IO Gateway บน Raspberry Pi

โปรแกรมนี้รันบน **Raspberry Pi 3 / 4 / 5** (Raspberry Pi OS 64-bit หรือ 32-bit)  
รับคำสั่ง JSON จากเซิร์ฟเวอร์ Visual Inventory ผ่าน **WiFi** แล้วส่งต่อเป็น **Modbus TCP** ไปยัง Ethernet IO บนเครือข่ายแยก

ดูสัญญา API ฝั่ง PHP: [docs/RASPI_IO_API.md](../docs/RASPI_IO_API.md)

## โครงสร้างเครือข่าย

```
[PHP Server — Factory LAN/WiFi]
        │  POST http://{pi_wifi_ip}:8080/api/io/highlight
        ▼
[Raspberry Pi — wlan0 = WiFi IP ที่ลงทะเบียนใน Admin]
        │  Modbus TCP (eth0 — ไม่ต่อ Internet)
        ▼
[Ethernet IO Module — IP แยก เช่น 192.168.0.244]
        ▼
[ไฟ / Relay ที่ Rack]
```

**สำคัญ:** เซิร์ฟเวอร์ PHP รู้แค่ **WiFi IP ของ Pi** — ไม่รู้และไม่เข้าถึง IP ของ Ethernet IO โดยตรง

---

## สิ่งที่ต้องเตรียม

| รายการ | หมายเหตุ |
|--------|----------|
| Raspberry Pi 3 / 4 / 5 | RAM 1GB ขึ้นไป |
| Raspberry Pi OS (Bookworm แนะนำ) | อัปเดต: `sudo apt update && sudo apt full-upgrade` |
| สาย Ethernet Pi → Ethernet IO | เครือข่ายแยก ไม่ต่อ Internet |
| WiFi เชื่อม Factory LAN | PHP server ping ไป Pi ได้ |
| Ethernet IO รองรับ Modbus TCP | Port 502, coil 1-based → address 0-based |

---

## ขั้นตอนที่ 1 — ตั้งค่าเครือข่ายบน Pi

### 1.1 WiFi (wlan0) — ให้ PHP server เข้าถึงได้

ตั้ง IP แบบ static หรือ DHCP reservation ที่ router (แนะนำ static)

ตัวอย่าง `/etc/dhcpcd.conf` (ปรับตามโรงงาน):

```
interface wlan0
static ip_address=192.168.1.50/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1
```

รีสตาร์ทเครือข่าย:

```bash
sudo reboot
```

จด **WiFi IP ของ Pi** (เช่น `192.168.1.50`) — ใช้ลงใน Admin → Manage Ethernet IO

### 1.2 Ethernet (eth0) — เครือข่าย IO แยก

ตั้ง IP ฝั่ง Pi ให้อยู่ subnet เดียวกับ Ethernet IO **โดยไม่ใส่ default gateway**

ตัวอย่าง IO ที่ `192.168.0.244` → ตั้ง Pi eth0 เป็น `192.168.0.10/24`:

```
interface eth0
static ip_address=192.168.0.10/24
nohook wpa_supplicant
```

ทดสอบจาก Pi:

```bash
ping -c 2 192.168.0.244
```

---

## ขั้นตอนที่ 2 — คัดลอกโค้ดไป Pi

จากเครื่อง dev (หรือ clone repo บน Pi):

```bash
# บนเครื่อง dev — ส่งโฟลเดอร์ raspi/ ไป Pi (แก้ user@pi-ip)
scp -r raspi/ pi@192.168.1.50:~/visual-inventory-io/
```

หรือ clone ทั้ง repo บน Pi แล้วเข้าโฟลเดอร์ `raspi/`

---

## ขั้นตอนที่ 3 — ติดตั้งอัตโนมัติ

บน Raspberry Pi:

```bash
cd ~/visual-inventory-io
chmod +x install.sh
sudo bash install.sh
```

สคริปต์จะ:
- ติดตั้ง `python3-venv`
- คัดลอกไป `/opt/visual-inventory-io`
- สร้าง virtualenv + ติดตั้ง `flask`, `pymodbus`
- สร้าง config ที่ `/etc/visual-inventory-io/env` (ถ้ายังไม่มี)
- ลงทะเบียน systemd service `visual-inventory-io`

---

## ขั้นตอนที่ 4 — แก้ config

```bash
sudo nano /etc/visual-inventory-io/env
```

| ตัวแปร | ค่าตัวอย่าง | คำอธิบาย |
|--------|-------------|----------|
| `LISTEN_HOST` | `0.0.0.0` | ฟังทุก interface (WiFi) |
| `LISTEN_PORT` | `8080` | ตรงกับ Admin บน PHP |
| `IO_API_KEY` | สตริงยาว | ต้องตรงกับ `RASPI_IO_KEY` ใน `.env` ของ PHP |
| `MODBUS_HOST` | `192.168.0.244` | IP ของ Ethernet IO บน eth0 |
| `MODBUS_PORT` | `502` | Modbus TCP |
| `MODBUS_UNIT_ID` | `1` | Unit ID ของ IO module |
| `DRY_RUN` | `false` | ตั้ง `true` ทดสอบโดยไม่ยิง Modbus |

รีสตาร์ท service:

```bash
sudo systemctl restart visual-inventory-io
```

---

## ขั้นตอนที่ 5 — ทดสอบบน Pi

### Health check

```bash
curl http://127.0.0.1:8080/health
```

คาดหวัง: `{"status":"ok", ...}`

### ทดสอบ highlight (DRY_RUN หรือ Modbus จริง)

```bash
cd /opt/visual-inventory-io
IO_API_KEY=your-secret bash scripts/test_highlight.sh
```

หรือ curl เอง:

```bash
curl -X POST http://127.0.0.1:8080/api/io/highlight \
  -H "Content-Type: application/json" \
  -H "X-IO-Key: your-secret" \
  -d '{
    "action": "highlight",
    "duration_sec": 10,
    "device_name": "test",
    "location": {"box_id": 1, "box_code": "A-01", "slot_no": 1, "level_no": 1, "rack_name": "A"},
    "outputs": [{"pin": 1, "state": 1, "role": "green"}]
  }'
```

ดู log:

```bash
journalctl -u visual-inventory-io -f
```

---

## ขั้นตอนที่ 6 — ตั้งค่าฝั่ง PHP (Visual Inventory)

1. Admin → **Manage Ethernet IO**
   - Controller Type: **Raspi Gateway (WiFi)**
   - IP Address: **WiFi IP ของ Pi** (เช่น `192.168.1.50`)
   - Port: `8080`
2. `.env` บนเซิร์ฟเวอร์ PHP:
   ```
   RASPI_IO_KEY=your-secret
   IO_HIGHLIGHT_DURATION_SEC=60
   ```
3. Map **Output Pin** ที่ Box และ **Green Pin** ที่ Rack
4. ทดสอบค้นหาสินค้าที่ `search_product.php`

---

## ขั้นตอนที่ 7 — จอ TV (Chromium) และเสียง TTS

Pi มักใช้เปิด **Chromium kiosk** แสดงหน้า `tv_display.php` บน TV  
เสียงประกาศตำแหน่ง (Rack / Level / Box / Slot) ใช้ **Web Speech API (TTS)** ใน Browser — **ไม่ใช่ไฟล์ MP3** จากเซิร์ฟเวอร์ IO

### 7.1 สิ่งที่ต้องรู้

| รายการ | รายละเอียด |
|--------|------------|
| หน้า TV | `{APP_BASE_URL}/public/tv_display?lang=th&tv_key=...` |
| ปุ่มเสียง | มุมขวาบน **「เปิดเสียง」** — ต้อง unlock ก่อน TTS จะทำงาน |
| URL ช่วยจำสถานะ | เพิ่ม `&sound=1` ใน URL (เก็บใน `localStorage`) |
| TTS บน Linux | Chromium ใช้ `speech-dispatcher` + `espeak-ng` |
| เสียงไทย | Pi อาจไม่มี voice ไทย — ลอง `?lang=en` หรือติด voice เพิ่ม |
| **เสียงออก TV** | ส่งผ่านสาย **HDMI เดียวกับภาพ** → ลำโพง TV |

ถ้าเสียงไม่ทำงาน เปิด DevTools (F12) ดู Console:
- `Speech skipped: Unlocked=false` → ยังไม่กดเปิดเสียง / Browser บล็อก autoplay
- `No th voice found!` → ไม่มี voice ภาษาไทย (อาจเงียบหรือ fallback EN)

### 7.2 ตรวจเสียงระบบ Pi ก่อน

#### 7.2.1 เสียงผ่าน HDMI → TV

กรณีนิยมในโรงงาน: **Pi ต่อสาย micro-HDMI → HDMI ของ TV**  
ภาพและเสียง TTS ไปทางสายเดียวกัน — **ไม่ต้องต่อลำโพงแยก** (ไม่ใช้ช่อง 3.5 mm)

```
[Raspberry Pi] ── micro-HDMI ──► [TV — HDMI] ──► ลำโพงในตัว TV
```

**1) ต่อสายและเลือก Input บน TV**

- เสียบ Pi ที่ช่อง **HDMI** ของ TV
- รีโมต TV → เลือก Source **HDMI** ที่ต่อ Pi อยู่
- เปิดเสียง TV (Volume) — บางรุ่นปิดเสียง HDMI ไว้ในเมนู

**2) บังคับให้ Pi ส่งเสียงออก HDMI**

```bash
sudo raspi-config
# 1 System Options → S2 Audio → เลือก HDMI
# (Pi 4/5 มี 2 พอร์ต micro-HDMI — เลือก HDMI ที่ตรงกับพอร์ตที่เสียบ TV)
```

หรือใช้คำสั่ง (Bookworm):

```bash
# ดูรายการ output
aplay -l
pactl list short sinks

# ตั้ง default เป็น HDMI (ชื่อ sink แต่ละเครื่องไม่เหมือนกัน — ดูจาก list ด้านบน)
pactl set-default-sink "$(pactl list short sinks | grep -i hdmi | head -1 | cut -f2)"
```

Pi OS ใหม่ (PipeWire) อาจใช้:

```bash
wpctl status
# เลือก sink ที่ขึ้นคำว่า HDMI แล้ว:
wpctl set-default ID
```

**3) Pi 4 / Pi 5 — มี 2 พอร์ต micro-HDMI**

ถ้าเสียบ TV แล้วไม่มีภาพ/เสียง ลองสลับพอร์ต หรือเลือก HDMI อีกตัวใน `raspi-config`  
แก้ `/boot/firmware/config.txt` ถ้าจำเป็น:

```ini
hdmi_force_hotplug=1
disable_overscan=1
```

จากนั้น `sudo reboot` แล้วเลือก Audio ใน `raspi-config` ให้ตรงพอร์ตที่ใช้

**4) ทดสอบเสียงออก TV**

```bash
# ดูชื่อการ์ด HDMI ก่อน
aplay -l

# ทดสอบ tone ออก HDMI (Ctrl+C หยุด) — ปรับ CARD/DEV ตาม aplay -l
speaker-test -D hdmi:CARD=vc4hdmi0,DEV=0 -c 2 -t wav
# ถ้าไม่ขึ้น ลอง vc4hdmi1 หรือ DEV=1

# ทดสอบ TTS หลังติด speech-dispatcher (ขั้น 7.3)
spd-say "HDMI audio test"
```

ได้ยินจากลำโพง TV = ระบบพร้อม → ตั้ง Chromium (ขั้น 7.4) แล้วกด **「เปิดเสียง」** บนหน้า TV

**5) ตั้งค่า TV (ถ้ายังเงียบ)**

- ปิดโหมด **External Speaker only** / บังคับลำโพงนอก
- เปิด **HDMI audio** / **PCM** (Pi ใช้เสียง HDMI ปกติ — ไม่จำเป็นต้องเปิด ARC)
- ปิด **Mute** ทั้ง TV และ Pi (`alsamixer` กด M ให้ไม่ mute ช่อง HDMI)

#### 7.2.2 ตรวจ volume ทั่วไป

```bash
# ทดสอบว่า Pi ออกเสียงได้ (Ctrl+C เพื่อหยุด)
speaker-test -t wav -c 2 -l 1

# ปรับ volume / ตรวจ mute
alsamixer
# กด F6 เลือกการ์ด HDMI ถ้ามีหลายตัว, กด M ให้ไม่ mute
```

ตั้ง output ที่ใช้จริง (ถ้ายังไม่ได้ตั้งใน 7.2.1):

```bash
sudo raspi-config
# System Options → Audio → เลือก HDMI ตามพอร์ตที่ต่อ TV
```

ถ้า `speaker-test` ไม่มีเสียงจาก TV → กลับไป **7.2.1** (สาย HDMI, input TV, volume) ก่อนตั้ง Browser

### 7.3 ติดตั้ง TTS สำหรับ Chromium

```bash
sudo apt update
sudo apt install -y speech-dispatcher espeak-ng alsa-utils pulseaudio
sudo systemctl enable --now speech-dispatcher
```

ทดสอบ TTS นอก Browser:

```bash
spd-say "Rack A Level 1 Box B1 Slot 3"
spd-say -l th "ทดสอบเสียงภาษาไทย"
```

- ได้ยินภาษาอังกฤษแต่ไทยไม่มี → ใช้ `?lang=en` บน TV ชั่วคราว หรือติด voice engine เพิ่ม (ขั้นสูง)
- `spd-say` เงียบ → กลับไปขั้น 7.2

### 7.4 เปิด Chromium แบบ Kiosk (แนะนำ)

สร้างสคริปต์เปิด TV เช่น `~/start-tv-kiosk.sh`:

```bash
#!/bin/bash
# แก้ URL, tv_key, และ IP เซิร์ฟเวอร์ให้ตรงโรงงาน
TV_URL="http://192.168.1.100/visual_inventory/public/tv_display?lang=th&sound=1&tv_key=YOUR_TV_KIOSK_KEY"

chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  "$TV_URL"
```

```bash
chmod +x ~/start-tv-kiosk.sh
```

| Flag | เหตุผล |
|------|--------|
| `--kiosk` | โหมดจอเต็ม ไม่มีแถบ URL |
| `--autoplay-policy=no-user-gesture-required` | ลดการบล็อก TTS / audio โดยไม่ต้องคลิกก่อน |

**สำคัญ:** ครั้งแรกหลัง boot ควรกด **「เปิดเสียง」** บนจอ TV อย่างน้อย 1 ครั้ง (หรือใช้วิธี 7.5) จนได้ยิน “ระบบเสียงพร้อมใช้งาน”

ตั้ง `TV_KIOSK_KEY` ใน `.env` ฝั่ง PHP ให้ตรงกับ `tv_key=` ใน URL — ดู [docs/USER_GUIDE_TH.md](../docs/USER_GUIDE_TH.md) หมวด TV Display

### 7.5 Kiosk ไม่มีเมาส์ — unlock เสียงอัตโนมัติ (ทางเลือก)

ถ้าเปิด kiosk แล้วกดปุ่มไม่ได้ ใช้ `xdotool` จำลองคลิกปุ่มเสียงหลัง Chromium โหลด:

```bash
sudo apt install -y xdotool

# ตัวอย่างใน ~/.config/labwc/autostart หรือ script เปิด TV
( sleep 15 && xdotool mousemove 120 40 click 1 ) &
```

ปรับพิกัด `mousemove X Y` ให้ตรงปุ่ม 「เปิดเสียง」 บนจอความละเอียดของ TV

### 7.6 Autostart ตอน boot (ตัวอย่าง)

Desktop autostart (Raspberry Pi OS with desktop):

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/tv-kiosk.desktop
```

```ini
[Desktop Entry]
Type=Application
Name=Visual Inventory TV
Exec=/home/pi/start-tv-kiosk.sh
X-GNOME-Autostart-enabled=true
```

### 7.7 แก้ปัญหาเสียง TV

| อาการ | วิธีตรวจ / แก้ |
|-------|------------------|
| ไม่มีเสียงเลย | `speaker-test` / `speaker-test -D hdmi:...` → `alsamixer` → volume TV |
| มีภาพแต่ไม่มีเสียง HDMI | TV เลือก input HDMI ที่ต่อ Pi; `raspi-config` → Audio → HDMI; ปิด mute TV |
| Pi 4/5 ไม่มีภาพ/เสียง | สลับพอร์ต micro-HDMI หรือเลือก HDMI ใน `raspi-config` |
| มีเสียงระบบ แต่ TV เงียบ | กด **「เปิดเสียง」** หรือเพิ่ม `&sound=1` + flag `--autoplay-policy=...` |
| Console: `Unlocked=false` | Browser บล็อก — คลิกเปิดเสียงหรือใช้ xdotool (7.5) |
| Console: `No th voice found` | ไม่มี voice ไทย — ใช้ `?lang=en` หรือติด `espeak-ng` / voice เพิ่ม |
| TTS ขาดเป็นช่วงๆ | ตรวจ WiFi latency; รีสตาร์ท `speech-dispatcher` |
| หลัง reboot ต้องกดเสียงใหม่ | ใส่ `sound=1` ใน URL + autostart script (7.4–7.6) |

---

## คำสั่ง systemd ที่ใช้บ่อย

```bash
sudo systemctl status visual-inventory-io
sudo systemctl restart visual-inventory-io
sudo systemctl stop visual-inventory-io
journalctl -u visual-inventory-io -n 100 --no-pager
```

---

## อัปเดตเวอร์ชัน

```bash
cd ~/visual-inventory-io   # โฟลเดอร์ source ใหม่
sudo bash install.sh       # rsync ทับ /opt และ restart service
```

Config ที่ `/etc/visual-inventory-io/env` จะไม่ถูกลบ

---

## แก้ปัญหา

| อาการ | วิธีตรวจ |
|-------|----------|
| PHP ได้ error / timeout | จากเซิร์ฟเวอร์ PHP: `ping {pi_wifi_ip}` และ `curl http://{pi_wifi_ip}:8080/health` |
| HTTP 401 Unauthorized | ตรวจ `IO_API_KEY` บน Pi = `RASPI_IO_KEY` บน PHP |
| HTTP 502 Modbus error | บน Pi: `ping {MODBUS_HOST}` ตรวจ eth0 IP และสาย Ethernet |
| ไฟไม่ติดแต่ API ok | ตรวจหมายเลข pin ใน Admin (1-based); ทดสอบ pin ทีละตัว |
| Service ไม่ start | `journalctl -u visual-inventory-io -n 50` |
| TV / Chromium ไม่มีเสียง | ดู [ขั้นตอนที่ 7 — จอ TV และเสียง TTS](#ขั้นตอนที่-7--จอ-tv-chromium-และเสียง-tts) |

---

## โครงสร้างไฟล์

```
raspi/
├── README.md              ← คู่มือนี้
├── install.sh             ← ติดตั้งบน Pi
├── run.py                 ← entry point
├── requirements.txt
├── config.example.env
├── app/
│   ├── server.py          ← Flask REST API
│   ├── modbus_io.py       ← Modbus FC05
│   ├── highlight_timer.py ← auto-off
│   └── config.py
├── scripts/
│   └── test_highlight.sh
└── systemd/
    └── visual-inventory-io.service
```

---

## รองรับ Pi รุ่นใดบ้าง

| รุ่น | สถานะ |
|-----|--------|
| Raspberry Pi 3 | รองรับ (32/64-bit OS) |
| Raspberry Pi 4 | รองรับ |
| Raspberry Pi 5 | รองรับ |

ใช้ Python 3 มาตรฐานของ Raspberry Pi OS — ไม่มีโค้ดเฉพาะรุ่น
