<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");

if ($_SESSION['role'] !== 'admin') {
    $msg = __('admin_only');
    echo "<script>alert('$msg'); window.location='index';</script>";
    exit;
}

$devices = $condb->query("SELECT * FROM ethernet_ios ORDER BY name");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Test IO Manual' : 'ทดสอบ IO แบบ Manual' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --bg: #f8fafc;
            --surface: #ffffff;
            --text-main: #1e293b;
            --border: #e2e8f0;
            --success: #10b981;
            --danger: #ef4444;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .card {
            background: var(--surface);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        select {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid var(--border);
            margin-bottom: 20px;
        }
        .io-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
        }
        .io-btn {
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            border: 2px solid var(--border);
            background: #fff;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        .io-btn.on {
            border-color: var(--success);
            background: #dcfce7;
            color: #166534;
        }
        .io-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .indicator {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ccc;
        }
        .io-btn.on .indicator {
            background: var(--success);
            box-shadow: 0 0 10px var(--success);
        }
        #log-area {
            width: 100%;
            height: 150px;
            background: #1e293b;
            color: #10b981;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            overflow-y: auto;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2><i class="fas fa-network-wired"></i> <?= __('logout') == 'Logout' ? 'Test IO Manual' : 'ทดสอบ IO แบบ Manual' ?></h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button type="button" onclick="resetAllLights()" style="padding:10px 20px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:8px; cursor:pointer;">
                    <i class="fas fa-lightbulb"></i> <?= __('logout') == 'Logout' ? 'Reset all lights' : 'ดับไฟทั้งหมด' ?>
                </button>
                <a href="admin.php" style="text-decoration:none; padding:10px 20px; background:#e2e8f0; color:#1e293b; border-radius:8px;">
                    <i class="fas fa-arrow-left"></i> <?= __('logout') == 'Logout' ? 'Back to Admin' : 'กลับสู่หน้า Admin' ?>
                </a>
            </div>
        </div>

        <div class="card">
            <label><strong><?= __('logout') == 'Logout' ? 'Select Ethernet IO Device' : 'เลือกอุปกรณ์ Ethernet IO' ?></strong></label>
            <select id="deviceSelect" onchange="loadPins()">
                <option value="">-- <?= __('logout') == 'Logout' ? 'Select Device' : 'เลือกอุปกรณ์' ?> --</option>
                <?php while($dev = $devices->fetch_assoc()): ?>
                    <option value="<?= $dev['id'] ?>" data-inputs="<?= isset($dev['inputs']) ? htmlspecialchars($dev['inputs']) : 16 ?>" data-outputs="<?= isset($dev['outputs']) ? htmlspecialchars($dev['outputs']) : 16 ?>"><?= htmlspecialchars($dev['name']) ?> (<?= htmlspecialchars($dev['ip_address']) ?>)</option>
                <?php endwhile; ?>
            </select>

            <div id="ioPanel" style="display:none;">
                <div style="display:flex; gap: 30px;">
                    <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed var(--border);">
                        <p style="color: #64748b; margin-top: 0;"><i class="fas fa-sign-in-alt"></i> <strong><?= __('logout') == 'Logout' ? 'Inputs (Read-Only)' : 'Inputs (อ่านสถานะ)' ?></strong></p>
                        <div class="io-grid" id="inputContainer">
                            <!-- Input Pins will be generated here -->
                        </div>
                    </div>
                    <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed var(--border);">
                        <p style="color: var(--primary); margin-top: 0;"><i class="fas fa-sign-out-alt"></i> <strong><?= __('logout') == 'Logout' ? 'Outputs (Toggle)' : 'Outputs (เปิด/ปิด)' ?></strong></p>
                        <div class="io-grid" id="outputContainer">
                            <!-- Output Pins will be generated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h4><i class="fas fa-terminal"></i> Activity Log</h4>
            <div id="log-area"></div>
        </div>
    </div>

    <script>
        // Store pin states (0 or 1)
        let pinStates = {};

        function logMessage(msg) {
            const logArea = document.getElementById('log-area');
            const time = new Date().toLocaleTimeString();
            logArea.innerHTML += `[${time}] ${msg}<br>`;
            logArea.scrollTop = logArea.scrollHeight;
        }

        function loadPins() {
            const selectEl = document.getElementById('deviceSelect');
            const deviceId = selectEl.value;
            const ioPanel = document.getElementById('ioPanel');
            const inputContainer = document.getElementById('inputContainer');
            const outputContainer = document.getElementById('outputContainer');
            
            if (!deviceId) {
                ioPanel.style.display = 'none';
                return;
            }

            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const inputs = parseInt(selectedOption.getAttribute('data-inputs')) || 16;
            const outputs = parseInt(selectedOption.getAttribute('data-outputs')) || 16;

            // Generate Inputs
            inputContainer.innerHTML = '';
            for (let i = 1; i <= inputs; i++) {
                inputContainer.innerHTML += `
                    <div class="io-btn" id="btn-in-${i}" style="cursor: default;" onclick="readInput(${deviceId}, ${i})">
                        <div class="indicator" style="background: #e2e8f0;"></div>
                        In ${i}
                    </div>
                `;
            }

            // Generate Outputs
            outputContainer.innerHTML = '';
            pinStates = {};
            for (let i = 1; i <= outputs; i++) {
                pinStates[i] = 0;
                outputContainer.innerHTML += `
                    <div class="io-btn" id="btn-out-${i}" onclick="togglePin(${deviceId}, ${i})">
                        <div class="indicator"></div>
                        Out ${i}
                    </div>
                `;
            }
            
            ioPanel.style.display = 'block';
            logMessage(`Loaded IO panel for device ID: ${deviceId} (${inputs} In / ${outputs} Out)`);
        }

        async function readInput(deviceId, pin) {
            logMessage(`Test Read Input ${pin}... (Mocked)`);
            const btn = document.getElementById(`btn-in-${pin}`);
            btn.style.opacity = '0.5';
            setTimeout(() => {
                btn.style.opacity = '1';
                btn.classList.toggle('on');
                logMessage(`Input ${pin} state changed`);
            }, 500);
        }

        async function togglePin(deviceId, pin) {
            // Toggle state locally
            const newState = pinStates[pin] === 0 ? 1 : 0;
            const btn = document.getElementById(`btn-out-${pin}`);
            
            // Visual feedback before request
            btn.style.opacity = '0.5';

            try {
                const response = await fetch('api_gateway.php?call=io_control.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId, pin: pin, state: newState })
                });

                const data = await response.json();
                
                if (data.status === 'success') {
                    // Update state
                    pinStates[pin] = newState;
                    if (newState === 1) {
                        btn.classList.add('on');
                    } else {
                        btn.classList.remove('on');
                    }
                    logMessage(`Success: Pin ${pin} -> ${newState} (HTTP ${data.http_code})`);
                } else {
                    logMessage(`Error: ${data.message}`);
                    alert("Error: " + data.message);
                }
            } catch (error) {
                logMessage(`Network Error: ${error}`);
            } finally {
                btn.style.opacity = '1';
            }
        }

        function resetAllLights() {
            const isEN = <?= json_encode(__('logout') == 'Logout') ?>;
            if (!confirm(isEN ? 'Turn OFF all configured IO outputs?' : 'ปิดไฟ output ทั้งหมดที่ตั้งค่าไว้ในระบบ?')) {
                return;
            }
            logMessage(isEN ? 'Resetting all lights...' : 'กำลังดับไฟทั้งหมด...');
            fetch('api/reset_all_io.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            })
            .then(res => res.json())
            .then(data => {
                logMessage(data.message || JSON.stringify(data));
                if (data.status !== 'success' && data.status !== 'warning') {
                    alert(data.message || 'Error');
                }
            })
            .catch(err => logMessage('Network error: ' + err));
        }
    </script>
</body>
</html>
