<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abdul Chat | Visual Location Management</title>
    <meta name="description" content="ระบบค้นหาสินค้าอัจฉริยะด้วย Intent Engine สำหรับ Visual Location Management">
    <link rel="icon" type="image/png" href="assets/img/abdul_ai_2.png">
    <link rel="stylesheet" href="../plugins/google-fonts/fonts.css">
    <link rel="stylesheet" href="../plugins/font-awesome/all.css">
    <style>
        /* ─── Design Tokens ─── */
        :root {
            --primary: #8b5cf6;
            --primary-dark: #7c3aed;
            --primary-glow: rgba(139, 92, 246, 0.4);
            --accent: #06d6a0;
            --accent-glow: rgba(6, 214, 160, 0.3);
            --warning: #fbbf24;
            --danger: #ef4444;
            --bg-deep: #0a0e1a;
            --bg-card: rgba(15, 23, 42, 0.85);
            --bg-input: rgba(30, 41, 59, 0.6);
            --border: rgba(255, 255, 255, 0.08);
            --border-focus: rgba(139, 92, 246, 0.5);
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --text-dim: #64748b;
            --glass: rgba(255, 255, 255, 0.03);
            --radius: 16px;
            --radius-lg: 24px;
            --shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', 'Prompt', -apple-system, sans-serif;
            background: var(--bg-deep);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* ─── Animated Background ─── */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
                radial-gradient(ellipse 80% 50% at 20% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 60%),
                radial-gradient(ellipse 60% 40% at 80% 70%, rgba(6, 214, 160, 0.08) 0%, transparent 60%),
                radial-gradient(ellipse 50% 30% at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 60%);
            pointer-events: none;
            z-index: 0;
            animation: bgShift 20s ease-in-out infinite alternate;
        }

        @keyframes bgShift {
            0% {
                opacity: 1;
            }

            50% {
                opacity: 0.7;
            }

            100% {
                opacity: 1;
            }
        }

        .app-wrapper {
            position: relative;
            z-index: 1;
            max-width: 960px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
        }

        /* ─── Header ─── */
        .header {
            text-align: center;
            padding: 2rem 0 2.5rem;
            animation: fadeDown 0.7s ease-out;
        }

        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.25);
            padding: 0.4rem 1rem;
            border-radius: 100px;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 1.2rem;
            letter-spacing: 0.03em;
        }

        .header-badge i {
            font-size: 0.7rem;
        }

        .header h1 {
            font-size: 2.4rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            background: linear-gradient(135deg, #f1f5f9 30%, var(--primary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: var(--text-muted);
            font-size: 1rem;
        }

        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 0.5rem;
        }

        .logo-icon-wrapper {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            background: var(--bg-deep);
            box-shadow: 0 0 0 3px var(--primary-glow), 0 0 20px var(--primary-glow);
            animation: floatBot 3s ease-in-out infinite;
        }

        .logo-icon {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 10%;
            transform: scale(1.15);
        }

        @keyframes floatBot {

            0%,
            100% {
                transform: translateY(0px);
            }

            50% {
                transform: translateY(-6px);
            }
        }

        /* ─── Search Box ─── */
        .search-box {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 6px;
            display: flex;
            align-items: center;
            box-shadow: var(--shadow), 0 0 0 1px rgba(255, 255, 255, 0.02) inset;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: fadeUp 0.7s 0.1s ease-out both;
        }

        .search-box:focus-within {
            border-color: var(--border-focus);
            box-shadow: var(--shadow), 0 0 30px var(--primary-glow);
            transform: translateY(-2px);
        }

        .search-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text);
            padding: 1rem 1.25rem;
            font-size: 1.05rem;
            font-family: inherit;
            outline: none;
        }

        .search-input::placeholder {
            color: var(--text-dim);
        }

        .search-btn {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            border: none;
            padding: 0.9rem 1.8rem;
            border-radius: 18px;
            font-weight: 700;
            font-size: 0.95rem;
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .search-btn:hover {
            filter: brightness(1.1);
            transform: scale(1.03);
        }

        .search-btn:active {
            transform: scale(0.97);
        }

        /* ─── Quick Chips ─── */
        .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
            justify-content: center;
            animation: fadeUp 0.7s 0.2s ease-out both;
        }

        .chip {
            background: var(--glass);
            border: 1px solid var(--border);
            padding: 0.45rem 1rem;
            border-radius: 100px;
            font-size: 0.82rem;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        }

        .chip:hover {
            background: rgba(139, 92, 246, 0.12);
            border-color: rgba(139, 92, 246, 0.3);
            color: var(--text);
            transform: translateY(-1px);
        }

        /* ─── Response Area ─── */
        .response-area {
            margin-top: 2rem;
        }

        /* ─── Intent Badge ─── */
        .intent-bar {
            display: none;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1.25rem;
            animation: fadeUp 0.4s ease-out;
        }

        .intent-bar.show {
            display: flex;
        }

        .intent-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .intent-label {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(6, 214, 160, 0.1);
            border: 1px solid rgba(6, 214, 160, 0.25);
            color: var(--accent);
            padding: 0.35rem 0.9rem;
            border-radius: 100px;
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .perf-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.78rem;
            color: var(--text-dim);
        }

        .perf-badge .ms-val {
            color: var(--accent);
            font-weight: 700;
        }

        .result-count {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .result-count strong {
            color: var(--text);
        }

        /* ─── SQL Debug ─── */
        .sql-debug {
            display: none;
            background: rgba(0, 0, 0, 0.35);
            border-left: 3px solid var(--primary);
            border-radius: 10px;
            padding: 0.85rem 1.1rem;
            margin-bottom: 1.25rem;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 0.78rem;
            color: var(--text-dim);
            line-height: 1.6;
            overflow-x: auto;
            animation: fadeUp 0.4s ease-out;
        }

        .sql-debug.show {
            display: block;
        }

        .toggle-sql {
            background: none;
            border: 1px solid var(--border);
            color: var(--text-dim);
            padding: 0.3rem 0.7rem;
            border-radius: 8px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .toggle-sql:hover {
            border-color: var(--text-muted);
            color: var(--text-muted);
        }

        /* ─── Data Table ─── */
        .table-wrapper {
            display: none;
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: auto;
            max-height: 520px;
            box-shadow: var(--shadow);
            animation: fadeUp 0.5s ease-out;
        }

        .table-wrapper.show {
            display: block;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: rgba(139, 92, 246, 0.06);
            padding: 0.85rem 1rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.06em;
            position: sticky;
            top: 0;
            z-index: 5;
            border-bottom: 1px solid var(--border);
            text-align: left;
            white-space: nowrap;
        }

        td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-size: 0.9rem;
            white-space: nowrap;
        }

        tr {
            transition: background 0.15s;
        }

        tbody tr:hover {
            background: rgba(139, 92, 246, 0.04);
        }

        /* ─── Cell Badges ─── */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.25rem 0.6rem;
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 700;
        }

        .badge-danger {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }

        .badge-warning {
            background: rgba(251, 191, 36, 0.1);
            color: #fbbf24;
        }

        .badge-success {
            background: rgba(6, 214, 160, 0.1);
            color: #06d6a0;
        }

        .badge-info {
            background: rgba(139, 92, 246, 0.1);
            color: #a78bfa;
        }

        /* ─── Empty / Loader ─── */
        .empty-state {
            text-align: center;
            padding: 4rem 1rem;
            color: var(--text-dim);
            animation: fadeUp 0.6s 0.3s ease-out both;
        }

        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.3;
            display: block;
        }

        .empty-state p {
            font-size: 1rem;
        }

        .loader-container {
            display: none;
            justify-content: center;
            align-items: center;
            padding: 4rem;
        }

        .loader-container.show {
            display: flex;
        }

        .pulse-loader {
            display: flex;
            gap: 8px;
        }

        .pulse-loader span {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--primary);
            animation: pulse 1.2s ease-in-out infinite;
        }

        .pulse-loader span:nth-child(2) {
            animation-delay: 0.15s;
        }

        .pulse-loader span:nth-child(3) {
            animation-delay: 0.3s;
        }

        @keyframes pulse {

            0%,
            100% {
                transform: scale(0.6);
                opacity: 0.3;
            }

            50% {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* ─── No Results ─── */
        .no-results {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-dim);
        }

        .no-results i {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
            opacity: 0.4;
            display: block;
        }

        /* ─── Animations ─── */
        @keyframes fadeDown {
            from {
                opacity: 0;
                transform: translateY(-15px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeUp {
            from {
                opacity: 0;
                transform: translateY(15px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* ─── Navigation ─── */
        .nav-back {
            position: absolute;
            left: 0;
            top: 2rem;
            color: var(--text-muted);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            background: var(--glass);
            border: 1px solid var(--border);
            padding: 8px 14px;
            border-radius: 12px;
            transition: all 0.2s;
            z-index: 10;
        }

        .nav-back:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.3);
            color: var(--text);
        }

        /* ─── Responsive ─── */
        @media (max-width: 640px) {
            .app-wrapper {
                padding: 1rem;
            }

            .header h1 {
                font-size: 1.8rem;
            }

            .search-btn span {
                display: none;
            }

            .search-btn {
                padding: 0.9rem 1rem;
            }

            .intent-bar {
                flex-direction: column;
                align-items: flex-start;
            }

            .nav-back {
                position: relative;
                top: 0;
                margin-bottom: 1rem;
            }

            td,
            th {
                padding: 0.6rem 0.75rem;
                font-size: 0.8rem;
            }
        }
    </style>
</head>

<body>
    <div class="app-wrapper">

        <!-- Header -->
        <header class="header">
            <div class="header-badge">
                <i class="fas fa-bolt"></i>
                Intent Engine — ไม่ใช้ LLM, ตอบไว &lt; 100ms
            </div>
            <div class="logo-container">
                <div class="logo-icon-wrapper">
                    <img src="assets/img/abdul_ai_2.png" alt="Abdul AI" class="logo-icon">
                </div>
                <h1>Abdul Chat</h1>
            </div>
            <p>ถามภาษาธรรมชาติ → ระบบวิเคราะห์ Intent → คืนข้อมูลทันที</p>
        </header>

        <!-- Search -->
        <div class="search-box" id="searchBox">
            <input type="text"
                id="userInput"
                class="search-input"
                placeholder="ตัวอย่าง: 8041ISTC150J101 อยู่ไหน"
                autocomplete="off">
            <button class="search-btn" id="askBtn">
                <i class="fas fa-bolt"></i>
                <span>ค้นหา</span>
            </button>
        </div>

        <!-- Quick Chips -->
        <div class="chips">
            <div class="chip" data-q="8041ISTC150J101 อยู่ไหน">📍 หาตำแหน่ง 8041IST</div>
            <div class="chip" data-q="สินค้าที่หมดอายุ">⏰ สินค้าหมดอายุ</div>
            <div class="chip" data-q="สินค้าใกล้หมดอายุ">⚠️ ใกล้หมดอายุ</div>
            <div class="chip" data-q="ชั้น 3">🗄️ ชั้นวาง 3</div>
            <div class="chip" data-q="เช็คสต็อก 1051IST">📦 Stock 1051IST</div>
            <div class="chip" data-q="PUID 083B6N">🔖 PUID 083B6N</div>
            <div class="chip" data-q="ดูสินค้าทั้งหมด">📋 ทั้งหมด</div>
        </div>

        <!-- Response Area -->
        <div class="response-area">

            <!-- Loader -->
            <div class="loader-container" id="loader">
                <div class="pulse-loader">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <!-- Empty State -->
            <div class="empty-state" id="emptyState">
                <i class="fas fa-comments"></i>
                <p>พิมพ์คำถามหรือกดปุ่มตัวอย่างด้านบนเพื่อเริ่มต้น</p>
            </div>

            <!-- Intent Bar -->
            <div class="intent-bar" id="intentBar">
                <div class="intent-left">
                    <span class="intent-label" id="intentLabel"></span>
                    <span class="perf-badge">
                        <i class="fas fa-bolt"></i>
                        <span class="ms-val" id="perfMs">0</span>ms
                    </span>
                    <button class="toggle-sql" id="toggleSql">
                        <i class="fas fa-code"></i> SQL
                    </button>
                </div>
                <span class="result-count"><strong id="resultCount">0</strong> รายการ</span>
            </div>

            <!-- SQL Debug -->
            <div class="sql-debug" id="sqlDebug"></div>

            <!-- Table -->
            <div class="table-wrapper" id="tableWrapper">
                <table>
                    <thead>
                        <tr id="tableHead"></tr>
                    </thead>
                    <tbody id="tableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // ─── DOM Elements ───
        const userInput = document.getElementById('userInput');
        const askBtn = document.getElementById('askBtn');
        const loader = document.getElementById('loader');
        const emptyState = document.getElementById('emptyState');
        const intentBar = document.getElementById('intentBar');
        const intentLabel = document.getElementById('intentLabel');
        const perfMs = document.getElementById('perfMs');
        const resultCount = document.getElementById('resultCount');
        const sqlDebug = document.getElementById('sqlDebug');
        const toggleSql = document.getElementById('toggleSql');
        const tableWrapper = document.getElementById('tableWrapper');
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');

        // ─── Intent → Thai Label Map ───
        const intentNames = {
            'find_location': '📍 ค้นหาตำแหน่ง',
            'stock_check': '📦 เช็คสต็อก',
            'expired_material': '💀 หมดอายุแล้ว',
            'near_expiry': '⚠️ ใกล้หมดอายุ',
            'find_puid': '🔖 ค้นหา PUID',
            'rack_items': '🗄️ รายการในชั้นวาง',
            'search_item': '🔍 ค้นหาสินค้า',
            'list_all': '📋 รายการทั้งหมด',
        };

        // ─── Column → Thai Header Map ───
        const colNames = {
            'HanaPart': 'รหัสพาร์ท',
            'Description': 'รายละเอียด',
            'QtyRemain': 'จำนวนคงเหลือ',
            'QtyOriginal': 'จำนวนรับเข้า',
            'Shelf': 'ชั้นวาง',
            'Level': 'ระดับ',
            'Box': 'ช่อง',
            'Block': 'บล็อก',
            'ExpirationDate': 'วันหมดอายุ',
            'DaysRemaining': 'เหลือ (วัน)',
            'DaysOverdue': 'เกิน (วัน)',
            'StatusName': 'สถานะ',
            'PUID': 'PUID',
            'LotNo': 'Lot No.',
            'DateCode': 'Date Code',
        };

        // ─── Chips ───
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                userInput.value = chip.dataset.q;
                askQuestion();
            });
        });

        // ─── Toggle SQL ───
        toggleSql.addEventListener('click', () => {
            sqlDebug.classList.toggle('show');
        });

        // ─── Ask ───
        askBtn.addEventListener('click', askQuestion);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askQuestion();
        });

        async function askQuestion() {
            const q = userInput.value.trim();
            if (!q) return;

            // Reset UI
            loader.classList.add('show');
            emptyState.style.display = 'none';
            intentBar.classList.remove('show');
            sqlDebug.classList.remove('show');
            tableWrapper.classList.remove('show');
            tableHead.innerHTML = '';
            tableBody.innerHTML = '';

            try {
                const res = await fetch('api/abdul-chat.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        question: q
                    }),
                });

                const data = await res.json();

                if (data.error) {
                    showError(data.error);
                    return;
                }

                renderResponse(data);

            } catch (err) {
                showError('เชื่อมต่อ API ไม่ได้: ' + err.message);
            } finally {
                loader.classList.remove('show');
            }
        }

        function renderResponse(data) {
            // Intent Badge
            intentLabel.textContent = intentNames[data.intent] || data.intent;
            perfMs.textContent = data.response_ms;
            resultCount.textContent = data.count;
            intentBar.classList.add('show');

            // SQL
            sqlDebug.textContent = data.sql_debug;

            // No results
            if (!data.data || data.data.length === 0) {
                tableWrapper.classList.add('show');
                tableBody.innerHTML = `
                    <tr><td colspan="100">
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <p>ไม่พบข้อมูลที่ตรงกับคำถามของคุณ</p>
                        </div>
                    </td></tr>`;
                return;
            }

            // Headers
            const keys = Object.keys(data.data[0]);
            keys.forEach(key => {
                const th = document.createElement('th');
                th.textContent = colNames[key] || key;
                tableHead.appendChild(th);
            });

            // Rows
            data.data.forEach(row => {
                const tr = document.createElement('tr');
                keys.forEach(key => {
                    const td = document.createElement('td');
                    const val = row[key];

                    // Styled cells
                    if (key === 'DaysRemaining') {
                        const n = parseInt(val);
                        if (n <= 3) {
                            td.innerHTML = `<span class="badge badge-danger"><i class="fas fa-exclamation-triangle"></i> ${n} วัน</span>`;
                        } else if (n <= 7) {
                            td.innerHTML = `<span class="badge badge-warning"><i class="fas fa-clock"></i> ${n} วัน</span>`;
                        } else if (n <= 14) {
                            td.innerHTML = `<span class="badge badge-warning">${n} วัน</span>`;
                        } else {
                            td.innerHTML = `<span class="badge badge-success">${n} วัน</span>`;
                        }
                    } else if (key === 'DaysOverdue') {
                        td.innerHTML = `<span class="badge badge-danger"><i class="fas fa-skull-crossbones"></i> +${val} วัน</span>`;
                    } else if (key === 'QtyRemain' || key === 'QtyOriginal') {
                        const n = parseInt(val);
                        if (n === 0) {
                            td.innerHTML = `<span style="color: var(--text-dim); font-weight:700;">0</span>`;
                        } else if (n <= 100) {
                            td.innerHTML = `<span style="color: var(--warning); font-weight:700;">${n.toLocaleString()}</span>`;
                        } else {
                            td.innerHTML = `<span style="color: var(--accent); font-weight:700;">${n.toLocaleString()}</span>`;
                        }
                    } else if (key === 'Shelf' || key === 'Level' || key === 'Box' || key === 'Block') {
                        td.innerHTML = `<span class="badge badge-info"><i class="fas fa-map-marker-alt"></i> ${val || '-'}</span>`;
                    } else if (key === 'ExpirationDate') {
                        if (!val) {
                            td.innerHTML = '<span style="color:var(--text-dim);">—</span>';
                        } else {
                            const dateStr = val.substring(0, 10);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const exp = new Date(dateStr + 'T00:00:00');
                            if (exp < today) {
                                td.innerHTML = `<span class="badge badge-danger"><i class="fas fa-calendar-times"></i> ${dateStr}</span>`;
                            } else {
                                td.textContent = dateStr;
                            }
                        }
                    } else if (key === 'StatusName') {
                        const s = (val || '').toLowerCase();
                        if (s.includes('withdrawn') || s.includes('empty')) {
                            td.innerHTML = `<span class="badge badge-danger">${val}</span>`;
                        } else if (s.includes('blocked')) {
                            td.innerHTML = `<span class="badge badge-warning">${val}</span>`;
                        } else {
                            td.innerHTML = `<span class="badge badge-success">${val}</span>`;
                        }
                    } else if (val === null || val === undefined) {
                        td.innerHTML = '<span style="color:var(--text-dim);">—</span>';
                    } else {
                        td.textContent = val;
                    }

                    tr.appendChild(td);
                });
                tableBody.appendChild(tr);
            });

            tableWrapper.classList.add('show');
        }

        function showError(msg) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                <p style="color: var(--danger);">${msg}</p>
            `;
        }
    </script>
    <footer style="text-align:center;padding:1.5rem 1rem 2rem;color:var(--text-muted);font-size:0.8rem;">
        &copy; <?= date('Y') ?> Visual Location Management
    </footer>
</body>

</html>