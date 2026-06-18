<?php
// audio_diagnostic.php - Advanced Voice Diagnostic Tool (development / admin only)
require_once __DIR__ . '/../config/session_check.php';

if (($_SESSION['role'] ?? '') !== 'admin' && !is_development()) {
    require_once __DIR__ . '/../config/dev_guard.php';
    dev_guard_or_exit();
}

require_once __DIR__ . '/../config/helpers.php';
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio & Voice Diagnostic | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 30px;
            min-height: 100vh;
        }

        h1 { font-size: 2rem; margin-bottom: 5px; color: #f8fafc; }
        h1 i { color: #4f46e5; }
        .subtitle { color: #94a3b8; margin-bottom: 30px; }

        .card {
            background: #1e293b;
            padding: 25px;
            border-radius: 16px;
            margin-bottom: 20px;
            border: 1px solid #334155;
        }
        .card h3 { color: #f8fafc; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .card h3 i { color: #4f46e5; }

        .btn {
            padding: 12px 24px;
            cursor: pointer;
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.95rem;
            margin-right: 10px;
            margin-top: 8px;
            transition: all 0.2s;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .btn-primary { background: #4f46e5; }
        .btn-success { background: #10b981; }
        .btn-warning { background: #f59e0b; color: #000; }
        .btn-danger { background: #ef4444; }
        .btn-sm { padding: 8px 14px; font-size: 0.8rem; }

        .status-box {
            margin-top: 15px;
            font-family: 'Consolas', 'Courier New', monospace;
            padding: 15px;
            background: #0f172a;
            color: #10b981;
            border-radius: 10px;
            border: 1px solid #334155;
            max-height: 300px;
            overflow-y: auto;
            font-size: 0.85rem;
            line-height: 1.6;
        }
        .status-box .error { color: #f87171; }
        .status-box .success { color: #34d399; }
        .status-box .warn { color: #fbbf24; }
        .status-box .info { color: #60a5fa; }

        .voice-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .voice-table th {
            background: #334155;
            padding: 10px 12px;
            text-align: left;
            font-weight: 700;
            font-size: 0.85rem;
            color: #94a3b8;
            text-transform: uppercase;
        }
        .voice-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #1e293b;
            font-size: 0.85rem;
        }
        .voice-table tr:hover { background: rgba(79, 70, 229, 0.1); }
        .voice-table tr.thai-voice { background: rgba(16, 185, 129, 0.1); }
        .voice-table tr.thai-voice td { color: #34d399; font-weight: 600; }

        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .badge-success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .badge-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }

        .result-big {
            text-align: center;
            padding: 30px;
            border-radius: 12px;
            margin-top: 15px;
        }
        .result-big.ok { background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; }
        .result-big.fail { background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; }
        .result-big .icon { font-size: 3rem; margin-bottom: 10px; }
        .result-big .text { font-size: 1.2rem; font-weight: 700; }
        .result-big .detail { font-size: 0.9rem; color: #94a3b8; margin-top: 8px; }

        .install-guide {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }
        .install-guide h4 { color: #f59e0b; margin-bottom: 10px; }
        .install-guide ol { padding-left: 20px; line-height: 2; }
        .install-guide code { background: #334155; padding: 2px 8px; border-radius: 4px; }
    </style>
</head>

<body>
    <h1><i class="fas fa-stethoscope"></i> Audio & Voice Diagnostic</h1>
    <p class="subtitle">ตรวจสอบระบบเสียงและ Voice ภาษาไทยบนเครื่องนี้</p>

    <!-- Section 1: Quick Thai Voice Check -->
    <div class="card">
        <h3><i class="fas fa-language"></i> 1. ตรวจสอบ Thai Voice</h3>
        <p style="color:#94a3b8; margin-bottom:15px;">ตรวจสอบว่าเครื่องนี้มี Voice ภาษาไทยหรือไม่</p>
        <button class="btn btn-primary" onclick="checkThaiVoice()"><i class="fas fa-search"></i> ตรวจสอบเลย</button>
        <div id="thai-result"></div>
    </div>

    <!-- Section 2: Test Speech -->
    <div class="card">
        <h3><i class="fas fa-volume-up"></i> 2. ทดสอบเสียงพูด</h3>
        <button class="btn btn-success" onclick="testSpeak('th')"><i class="fas fa-play"></i> ทดสอบเสียงไทย</button>
        <button class="btn btn-primary" onclick="testSpeak('en')"><i class="fas fa-play"></i> ทดสอบเสียง English</button>
        <button class="btn btn-danger" onclick="window.speechSynthesis.cancel()"><i class="fas fa-stop"></i> หยุด</button>
        <div id="speak-status" class="status-box" style="margin-top:15px;">รอการทดสอบ...</div>
    </div>

    <!-- Section 3: All Voices -->
    <div class="card">
        <h3><i class="fas fa-list"></i> 3. รายการ Voice ทั้งหมดในเครื่อง</h3>
        <button class="btn btn-primary btn-sm" onclick="loadAllVoices()"><i class="fas fa-sync"></i> โหลดรายการ Voice</button>
        <div id="voice-count" style="margin-top:10px; color:#94a3b8;"></div>
        <div id="voices-container"></div>
    </div>

    <!-- Section 4: MP3 Test -->
    <div class="card">
        <h3><i class="fas fa-music"></i> 4. ทดสอบเสียง MP3</h3>
        <button class="btn btn-success" onclick="testMP3()"><i class="fas fa-play"></i> Play notification.mp3</button>
        <div id="mp3-status" class="status-box" style="margin-top:15px;">รอการทดสอบ...</div>
    </div>

    <!-- Section 5: Log -->
    <div class="card">
        <h3><i class="fas fa-terminal"></i> 5. System Log</h3>
        <div id="log-box" class="status-box">เริ่มต้นระบบ...</div>
    </div>

    <script>
        function log(msg, type = 'info') {
            const div = document.getElementById('log-box');
            const entry = document.createElement('div');
            entry.className = type;
            entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
            div.prepend(entry);
            console.log(`[Diag] ${msg}`);
        }

        let allVoices = [];

        function loadVoicesInternal() {
            if (!('speechSynthesis' in window)) return [];
            allVoices = window.speechSynthesis.getVoices();
            return allVoices;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoicesInternal();
                log(`Voices changed event: ${allVoices.length} voices loaded`);
            };
            loadVoicesInternal();
        }

        function checkThaiVoice() {
            const resultDiv = document.getElementById('thai-result');
            const voices = loadVoicesInternal();

            if (voices.length === 0) {
                // Voices might not be loaded yet
                resultDiv.innerHTML = `<div class="result-big fail">
                    <div class="icon">⏳</div>
                    <div class="text">กำลังโหลด Voice...</div>
                    <div class="detail">กรุณารอสักครู่แล้วกดปุ่มอีกครั้ง</div>
                </div>`;
                log('No voices loaded yet, retrying in 1s...', 'warn');
                setTimeout(checkThaiVoice, 1000);
                return;
            }

            const thaiVoices = voices.filter(v => {
                const lang = v.lang.toLowerCase().replace('_', '-');
                return lang.includes('th');
            });

            log(`Total voices: ${voices.length}, Thai voices: ${thaiVoices.length}`);

            if (thaiVoices.length > 0) {
                let voiceList = thaiVoices.map(v => `<li><b>${v.name}</b> (${v.lang}) ${v.localService ? '<span class="badge badge-info">Local</span>' : '<span class="badge badge-success">Online</span>'}</li>`).join('');
                
                resultDiv.innerHTML = `
                    <div class="result-big ok">
                        <div class="icon" style="color:#10b981;">✅</div>
                        <div class="text" style="color:#10b981;">พบ Voice ภาษาไทย ${thaiVoices.length} เสียง!</div>
                        <div class="detail">
                            <ul style="text-align:left; list-style:none; padding:0; margin-top:10px;">${voiceList}</ul>
                        </div>
                    </div>`;
                log(`Thai voices found: ${thaiVoices.map(v => v.name).join(', ')}`, 'success');
            } else {
                resultDiv.innerHTML = `
                    <div class="result-big fail">
                        <div class="icon" style="color:#ef4444;">❌</div>
                        <div class="text" style="color:#ef4444;">ไม่พบ Voice ภาษาไทยในเครื่องนี้!</div>
                        <div class="detail">นี่คือสาเหตุที่ระบบพูดเป็นภาษาอังกฤษ</div>
                    </div>
                    <div class="install-guide">
                        <h4><i class="fas fa-download"></i> วิธีติดตั้ง Voice ภาษาไทย (Windows 10/11)</h4>
                        <ol>
                            <li>เปิด <code>Settings</code> (กด Win + I)</li>
                            <li>ไปที่ <code>Time & Language</code> → <code>Language & region</code></li>
                            <li>กด <code>Add a language</code> → ค้นหา <code>ไทย (Thai)</code></li>
                            <li>ติ๊กเลือก <code>Text-to-speech</code> แล้วกด <code>Install</code></li>
                            <li>รอให้ดาวน์โหลดเสร็จ แล้ว <b>Restart เครื่อง</b></li>
                            <li>เปิด Browser ใหม่แล้วทดสอบอีกครั้ง</li>
                        </ol>
                        <p style="margin-top:15px; color:#94a3b8;">
                            <i class="fas fa-info-circle"></i> หรือใช้ <b>Google Chrome</b> ซึ่งมี Voice ภาษาไทยจาก Google ในตัว (ต้องเชื่อมต่ออินเทอร์เน็ต)
                        </p>
                    </div>`;
                log('NO THAI VOICE FOUND - This is why speech is in English!', 'error');
            }
        }

        function testSpeak(lang) {
            const statusDiv = document.getElementById('speak-status');
            const voices = loadVoicesInternal();

            if (!('speechSynthesis' in window)) {
                statusDiv.innerHTML = '<div class="error">❌ Browser ไม่รองรับ Web Speech API</div>';
                return;
            }

            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();

            const isThai = lang === 'th';
            const text = isThai
                ? 'แร็ค เอ ชั้น 1 กล่อง 3 ช่อง (Slot) 5'
                : 'Rack A Level 1 Box 3 Slot 5';
            const targetLang = isThai ? 'th' : 'en';
            const langCode = isThai ? 'th-TH' : 'en-US';

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langCode;
            utterance.rate = 0.95;
            utterance.volume = 1.0;

            // Find voice
            let voice = null;
            voice = voices.find(v => v.lang.toLowerCase().replace('_','-').includes(targetLang) && (v.name.includes('Google') || v.name.includes('Natural')));
            if (!voice) voice = voices.find(v => v.lang.toLowerCase().replace('_','-').includes(targetLang) && (v.name.includes('Pattara') || v.name.includes('Hemlata') || v.name.includes('Microsoft')));
            if (!voice) voice = voices.find(v => v.lang.toLowerCase().replace('_','-').includes(targetLang));

            if (voice) {
                utterance.voice = voice;
                statusDiv.innerHTML = `<div class="info">🔊 กำลังพูด (${langCode}): "${text}"</div>
                    <div class="success">✅ ใช้ Voice: ${voice.name} (${voice.lang})</div>`;
                log(`Speaking ${langCode} with voice: ${voice.name}`, 'success');
            } else {
                statusDiv.innerHTML = `<div class="warn">⚠️ ไม่พบ Voice ${langCode} - ใช้ Default</div>
                    <div class="info">🔊 กำลังพูด: "${text}"</div>`;
                log(`No ${targetLang} voice found, using default`, 'warn');
            }

            utterance.onstart = () => log(`Speech started (${langCode})`, 'success');
            utterance.onend = () => {
                log(`Speech ended (${langCode})`, 'info');
                statusDiv.innerHTML += '<div class="success">✅ พูดเสร็จแล้ว!</div>';
            };
            utterance.onerror = (e) => {
                log(`Speech error: ${e.error}`, 'error');
                statusDiv.innerHTML += `<div class="error">❌ Error: ${e.error}</div>`;
            };

            window.speechSynthesis.speak(utterance);
        }

        function loadAllVoices() {
            const voices = loadVoicesInternal();
            const container = document.getElementById('voices-container');
            const countDiv = document.getElementById('voice-count');

            if (voices.length === 0) {
                countDiv.innerText = '⏳ ยังไม่มี Voice... กรุณารอสักครู่';
                setTimeout(loadAllVoices, 1000);
                return;
            }

            const thCount = voices.filter(v => v.lang.toLowerCase().replace('_','-').includes('th')).length;
            const enCount = voices.filter(v => v.lang.toLowerCase().replace('_','-').includes('en')).length;
            countDiv.innerHTML = `พบทั้งหมด <b>${voices.length}</b> voices | 
                <span style="color:${thCount > 0 ? '#10b981' : '#ef4444'}">🇹🇭 Thai: ${thCount}</span> | 
                <span style="color:#60a5fa">🇺🇸 English: ${enCount}</span>`;

            let html = `<table class="voice-table">
                <thead><tr>
                    <th>#</th><th>ชื่อ Voice</th><th>ภาษา</th><th>ประเภท</th><th>ทดสอบ</th>
                </tr></thead><tbody>`;

            voices.forEach((v, i) => {
                const isThai = v.lang.toLowerCase().replace('_','-').includes('th');
                html += `<tr class="${isThai ? 'thai-voice' : ''}">
                    <td>${i + 1}</td>
                    <td>${v.name} ${isThai ? '🇹🇭' : ''}</td>
                    <td>${v.lang}</td>
                    <td>${v.localService ? '<span class="badge badge-info">Local</span>' : '<span class="badge badge-success">Online</span>'}</td>
                    <td><button class="btn btn-sm ${isThai ? 'btn-success' : 'btn-primary'}" onclick="testVoiceByIndex(${i})"><i class="fas fa-play"></i></button></td>
                </tr>`;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
            log(`Voice list loaded: ${voices.length} total, ${thCount} Thai`, 'success');
        }

        function testVoiceByIndex(index) {
            const voices = loadVoicesInternal();
            if (index >= voices.length) return;
            const v = voices[index];

            window.speechSynthesis.cancel();
            const isThai = v.lang.toLowerCase().replace('_','-').includes('th');
            const text = isThai ? 'แร็ค เอ ชั้น 1 กล่อง 3 ช่อง 5' : 'Rack A Level 1 Box 3 Block 5';

            const u = new SpeechSynthesisUtterance(text);
            u.voice = v;
            u.lang = v.lang;
            u.rate = 0.95;
            u.volume = 1.0;

            log(`Testing voice: ${v.name} (${v.lang})`, 'info');
            window.speechSynthesis.speak(u);
        }

        async function testMP3() {
            const status = document.getElementById('mp3-status');
            try {
                const audio = new Audio('assets/notification.mp3');
                await audio.play();
                status.innerHTML = '<div class="success">✅ เล่น MP3 สำเร็จ!</div>';
                log('MP3 played successfully', 'success');
            } catch (err) {
                status.innerHTML = `<div class="error">❌ เล่น MP3 ไม่ได้: ${err.message}</div>`;
                log('MP3 play error: ' + err.message, 'error');
            }
        }

        // Auto-check on load
        setTimeout(() => {
            log('Diagnostic tool ready. Browser: ' + navigator.userAgent.split(' ').pop());
            checkThaiVoice();
            loadAllVoices();
        }, 500);
    </script>
</body>

</html>