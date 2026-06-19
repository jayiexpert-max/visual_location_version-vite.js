<?php
// tv_display.php - TV Layout Display (No Login Required)
// Security: deploy on factory VLAN only. Read-only APIs use TV_KIOSK_KEY (?tv_key= / X-TV-Kiosk-Key).
// Logged-in users push highlights via api_tv_highlight.php?action=set (session required).

require_once("../config/condb.php");
require_once __DIR__ . '/../config/tv_kiosk_auth.php';
require_once __DIR__ . '/../config/ip_whitelist.php';
ip_whitelist_deny_if_blocked('TV_ALLOWED_IPS');
$tvKioskKey = tv_kiosk_key_expected() ?? '';

// Load language (default: Thai)
if (!isset($_SESSION)) session_start();
if (!isset($_SESSION['lang'])) $_SESSION['lang'] = 'th';
if (isset($_GET['lang'])) $_SESSION['lang'] = $_GET['lang'];
$lang = $_SESSION['lang'];

// Simple translations
$texts = [
    'en' => [
        'title' => 'TV Layout Display',
        'subtitle' => 'Real-time Storage Location Monitor',
        'rack_overview' => 'Rack Overview',
        'waiting' => 'Waiting for search...',
        'last_search' => 'Last Search',
        'location' => 'Location',
        'product' => 'Product',
        'qty' => 'Qty',
        'searched_by' => 'Searched by',
        'box_details' => 'Box Details',
        'slot_details' => 'Slot Details',
        'empty' => 'Empty',
        'close' => 'Close',
        'sound_enable' => 'Enable Sound',
        'sound_active' => 'Sound Active'
    ],
    'th' => [
        'title' => 'จอแสดงผัง Layout',
        'subtitle' => 'ติดตามตำแหน่งสินค้าแบบเรียลไทม์',
        'rack_overview' => 'ภาพรวม Rack',
        'waiting' => 'รอการค้นหา...',
        'last_search' => 'ค้นหาล่าสุด',
        'location' => 'ตำแหน่ง',
        'product' => 'สินค้า',
        'qty' => 'จำนวน',
        'searched_by' => 'ค้นหาโดย',
        'box_details' => 'รายละเอียด Box',
        'slot_details' => 'รายละเอียด Slot',
        'empty' => 'ว่าง',
        'close' => 'ปิด',
        'sound_enable' => 'เปิดเสียง',
        'sound_active' => 'เปิดเสียงแล้ว'
    ]
];
$t = $texts[$lang] ?? $texts['th'];

// Load racks
$racks = $condb->query("SELECT * FROM racks ORDER BY id ASC");
?>
<!DOCTYPE html>
<html lang="<?= $lang ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $t['title'] ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">

    <style>
:root {
            --primary: #4f46e5;
            --primary-dark: #4338ca;
            --secondary: #10b981;
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-light: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --highlight: #3b82f6;
        }

* {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .header-left h1 {
            font-size: 2rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header-left p {
            opacity: 0.9;
            margin-top: 5px;
            font-size: 1rem;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .clock {
            font-size: 2.5rem;
            font-weight: 700;
            font-family: 'Roboto Mono', monospace;
        }

        .date {
            font-size: 1rem;
            opacity: 0.9;
        }

        /* Search Alert Banner */
        .search-alert {
            display: none;
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            padding: 20px 40px;
            animation: slideDown 0.5s ease-out;
        }

        .search-alert.active {
            display: flex;
            justify-content: flex-start;
            align-items: center;
        }

        .search-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .search-icon {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
        }

        .search-details h2 {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .search-details p {
            font-size: 1rem;
            opacity: 0.9;
        }

        .search-details .alert-loc-path {
            font-size: 1.15rem;
            font-weight: 700;
            margin: 6px 0;
            line-height: 1.35;
        }

        .search-details .alert-meta {
            font-size: 0.92rem;
            opacity: 0.88;
            margin-top: 4px;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-100%);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Main Content */
        .main-content {
            padding: 30px 40px;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text);
        }

        /* Layout Grid */
        .layout-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
        }

        .rack {
            background: var(--surface);
            border-radius: 20px;
            padding: 20px;
            border: 1px solid var(--surface-light);
            transition: all 0.3s;
        }

        /* Target Rack Mode (When search is active) */
        body.search-mode-active .rack {
            display: none;
            /* Hide others */
        }

        body.search-mode-active .rack.highlight-active {
            display: block !important;
            grid-column: 1 / -1;
            /* Take full width */
            border-color: var(--highlight);
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.5);
            background: rgba(59, 130, 246, 0.05);
            animation: fadeIn 0.5s ease-out;
        }

        /* Specific header colors when highlighted */
        .rack.highlight-active .rack-header {
            background: linear-gradient(135deg, var(--highlight) 0%, var(--primary) 100%) !important;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        }

        .level.highlight-active {
            background: rgba(59, 130, 246, 0.1) !important;
            border: 2px solid var(--highlight) !important;
            box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.2);
        }

        .level.highlight-active .level-header {
            color: var(--highlight) !important;
            font-weight: 800;
        }

        /* Compact Boxes for Target Rack to fit screen */
        body.search-mode-active .rack.highlight-active {
            padding: 10px;
            border-radius: 12px;
        }

        body.search-mode-active .rack.highlight-active .rack-header {
            padding: 8px;
            font-size: 1rem;
            margin: -10px -10px 10px -10px;
        }

        body.search-mode-active .rack.highlight-active .box {
            min-width: 80px;
            padding: 12px 10px;
            font-size: 1.1rem;
            border-width: 2px;
        }

        body.search-mode-active .rack.highlight-active .level {
            padding: 8px;
            margin-bottom: 8px;
        }

        body.search-mode-active .rack.highlight-active .level-header {
            font-size: 0.8rem;
            margin-bottom: 8px;
        }

        /* Hide "Rack Overview" title during search to save space */
        body.search-mode-active .section-title {
            display: none !important;
        }

        /* Save more vertical space in search mode */
        body.search-mode-active .header {
            padding: 10px 40px;
        }

        body.search-mode-active .main-content {
            padding: 15px 40px;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }

            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .rack.highlight-active {
            border-color: var(--highlight);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
        }

        .rack-header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 15px;
            border-radius: 12px;
            margin: -20px -20px 20px -20px;
            text-align: center;
            font-size: 1.2rem;
            font-weight: 700;
        }

        .level {
            background: var(--surface-light);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .level:last-child {
            margin-bottom: 0;
        }

        .level-header {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .boxes {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .box {
            flex: 1;
            min-width: 70px;
            background: var(--bg);
            border: 2px solid var(--surface-light);
            padding: 12px 8px;
            border-radius: 10px;
            text-align: center;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
        }

        .box:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }

        /* Highlight Animation */
        .box.highlight-pulse {
            border-color: var(--highlight) !important;
            background: rgba(59, 130, 246, 0.2) !important;
            animation: pulse-glow 1.5s infinite;
            transform: scale(1.05);
            z-index: 10;
            position: relative;
        }

        @keyframes pulse-glow {
            0% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            }

            70% {
                box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
        }

        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal-content {
            background: var(--surface);
            padding: 30px;
            border-radius: 20px;
            min-width: 350px;
            max-width: 90%;
            max-height: 80vh;
            text-align: center;
            border: 1px solid var(--surface-light);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            flex-shrink: 0;
        }

        #modalSlots {
            margin-bottom: 20px;
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            padding-right: 5px;
            /* Scrollbar styling */
            scrollbar-width: thin;
            scrollbar-color: var(--surface-light) var(--bg);
        }

        #modalSlots::-webkit-scrollbar {
            width: 8px;
        }

        #modalSlots::-webkit-scrollbar-track {
            background: var(--bg);
        }

        #modalSlots::-webkit-scrollbar-thumb {
            background: var(--surface-light);
            border-radius: 4px;
        }

        .slot {
            background: var(--bg);
            border: 1px solid var(--surface-light);
            border-radius: 10px;
            padding: 12px;
            text-align: center;
            transition: all 0.3s;
        }

        .slot.highlight {
            background: rgba(59, 130, 246, 0.2);
            border-color: var(--highlight);
        }

        .close-btn {
            width: 100%;
            padding: 15px;
            background: var(--danger);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .close-btn:hover {
            background: #dc2626;
            transform: translateY(-2px);
        }

        /* Status Indicator */
        .status-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--surface);
            padding: 15px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--surface-light);
        }

        .status-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            background: var(--success);
            border-radius: 50%;
            animation: blink 2s infinite;
        }

        @keyframes blink {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.5;
            }
        }

        .lang-switch {
            display: flex;
            gap: 10px;
        }

        .lang-switch a {
            color: var(--text-muted);
            text-decoration: none;
            padding: 5px 15px;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .lang-switch a:hover {
            background: var(--surface-light);
        }

        .lang-switch-header {
            display: flex;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            overflow: hidden;
            margin-right: 15px;
        }

        .lang-switch-header a {
            padding: 8px 15px;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-weight: 700;
            font-size: 0.85rem;
            transition: all 0.2s;
        }

        .lang-switch-header a:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .lang-switch-header a.active {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
        }

        /* Fullscreen for TV */
        @media (min-width: 1920px) {
            .header-left h1 {
                font-size: 2.5rem;
            }

            .clock {
                font-size: 3rem;
            }

            .layout-grid {
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            }

            .rack-header {
                font-size: 1.5rem;
            }

            .box {
                font-size: 1.1rem;
                padding: 15px 10px;
            }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--surface-light);
            border-radius: 4px;
        }

        /* Split Screen Layout */
        .split-container {
            display: flex;
            gap: 20px;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            height: calc(100vh - 200px);
            /* Adjust based on header/footer */
        }

        .rack-view {
            flex: 1;
            overflow-y: auto;
            padding-right: 10px;
            transition: all 0.5s ease;
        }

        .detail-view {
            width: 0;
            opacity: 0;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--surface);
            border-radius: 20px;
            border: 1px solid var(--surface-light);
            display: flex;
            flex-direction: column;
            margin-left: 0;
        }

        /* Active Split State */
        body.split-active .detail-view {
            width: 40%;
            opacity: 1;
            margin-left: 20px;
            padding: 20px;
            border-color: var(--highlight);
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
        }

        body.split-active .rack-view {
            width: 60%;
        }

        /* Detail View Content */
        .detail-header {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--surface-light);
            color: var(--highlight);
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .detail-puid-bar {
            flex-shrink: 0;
            margin: -8px 0 16px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(6, 182, 212, 0.15);
            border: 1px solid rgba(34, 211, 238, 0.4);
            font-family: ui-monospace, Consolas, monospace;
            font-size: 1rem;
            font-weight: 700;
            color: #a5f3fc;
            word-break: break-all;
            line-height: 1.35;
        }

        .detail-puid-bar i {
            margin-right: 6px;
            color: #22d3ee;
        }

        .detail-content {
            flex: 1;
            overflow-y: auto;
            display: grid;
            gap: 15px;
            align-content: start;
            padding-right: 5px;
            padding-bottom: 20px;
            /* Hide scrollbar but keep scrollable */
            scrollbar-width: none;
        }

        .detail-content::-webkit-scrollbar {
            display: none;
        }

        .detail-slot {
            background: var(--bg);
            border: 2px solid var(--surface-light);
            border-radius: 12px;
            padding: 15px 10px;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 120px;
            /* Restored for clarity */
        }

        .detail-slot.highlight {
            border-color: var(--success);
            background: rgba(16, 185, 129, 0.1);
            border-width: 3px;
            animation: pulse-green 1.5s infinite;
        }

        .detail-slot.empty {
            border-style: dashed;
            opacity: 0.3;
        }

        @keyframes pulse-green {
            0% {
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            }

            70% {
                box-shadow: 0 0 0 15px rgba(16, 185, 129, 0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
        }

        .detail-product-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text);
            margin: 5px 0;
            line-height: 1.3;
        }

        .detail-qty {
            font-size: 1.4rem;
            color: var(--text-muted);
            /* Changed to Gray as requested */
            font-weight: 800;
        }

        .main-content {
            padding-bottom: 80px;
            flex: 1;
            /* Occupy remaining space */
            display: flex;
            flex-direction: column;
            overflow: hidden;
            /* Prevent body scroll */
        }

        .rack-view {
            flex: 1;
            overflow-y: auto;
            padding-right: 10px;
            transition: all 0.5s ease;
        }

        body.search-mode-active .rack-view {
            overflow: hidden;
            /* No scroll when focusing on one rack */
        }
    </style>
</head>

<body>
    <!-- Header -->
    <header class="header">
        <div class="header-left">
            <h1><i class="fas fa-tv"></i> <?= $t['title'] ?></h1>
            <p><?= $t['subtitle'] ?></p>
        </div>
        <div class="header-right">
            <!-- Language Switcher -->
            <div class="lang-switch-header">
                <a href="javascript:void(0)" onclick="switchLang('th')" class="<?= $lang == 'th' ? 'active' : '' ?>">TH</a>
                <a href="javascript:void(0)" onclick="switchLang('en')" class="<?= $lang == 'en' ? 'active' : '' ?>">EN</a>
            </div>

            <div id="soundToggle" onclick="toggleAudio()" style="margin-right: 20px; background: var(--danger); padding: 8px 15px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.2);">
                <i class="fas fa-volume-mute" id="soundIcon"></i>
                <span id="soundText"><?= $t['sound_enable'] ?></span>
            </div>
            <div style="text-align: right;">
                <div class="clock" id="clock">00:00:00</div>
                <div class="date" id="date"></div>
            </div>
        </div>
    </header>

    <!-- Search Alert Banner (shows when product is searched) -->
    <div class="search-alert" id="searchAlert">
        <div class="search-info">
            <div class="search-icon"><i class="fas fa-search"></i></div>
            <div class="search-details">
                <h2 id="alertProduct">-</h2>
                <p class="alert-loc-path"><i class="fas fa-map-marker-alt"></i> <span id="alertLocation">-</span></p>
                <p class="alert-meta"><i class="fas fa-user"></i> <span id="alertUser">-</span> • <span id="alertTime">-</span></p>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <div class="split-container">
            <!-- Left: Rack View -->
            <div class="rack-view">
                <div class="section-title"
                    style="position: sticky; top: 0; background: var(--bg); z-index: 10; padding-bottom: 10px; border-bottom: 2px solid var(--surface-light); margin-bottom: 20px;">
                    <i class="fas fa-warehouse"></i> <?= $t['rack_overview'] ?>
                </div>

                <div class="layout-grid">
                    <?php while ($rack = $racks->fetch_assoc()): ?>
                        <div class="rack" id="rack-<?= $rack['id'] ?>">
                            <div class="rack-header">
                                <i class="fas fa-server"></i> Rack: <?= htmlspecialchars($rack['name']) ?>
                            </div>
                            <?php
                            $levels = $condb->query("SELECT * FROM levels WHERE rack_id={$rack['id']} ORDER BY level_no ASC");
                            while ($level = $levels->fetch_assoc()):
                                $boxes = $condb->query("SELECT * FROM boxes WHERE level_id={$level['id']} ORDER BY id ASC");
                            ?>
                                <div class="level">
                                    <div class="level-header">Level <?= $level['level_no'] ?></div>
                                    <div class="boxes">
                                        <?php while ($box = $boxes->fetch_assoc()): ?>
                                            <div class="box" id="box-<?= $box['id'] ?>" data-box-id="<?= $box['id'] ?>"
                                                data-layout="<?= htmlspecialchars($box['layout']) ?>"
                                                onclick="showDetailPanel(<?= $box['id'] ?>, 0, '<?= htmlspecialchars($box['layout']) ?>')">
                                                <?= htmlspecialchars($box['box_code']) ?>
                                            </div>
                                        <?php endwhile; ?>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        </div>
                    <?php endwhile; ?>
                </div>
            </div>

            <!-- Right: Detail View Panel -->
            <div class="detail-view" id="detailPanel">
                <div class="detail-header">
                    <i class="fas fa-box-open"></i> <span id="detailBoxTitle"><?= $t['box_details'] ?></span>
                </div>
                <div id="detailPuidBar" class="detail-puid-bar" hidden>
                    <i class="fas fa-barcode"></i> PUID: <span id="detailPuidValue"></span>
                </div>
                <div class="detail-content" id="detailContent">
                    <div style="text-align:center; color:var(--text-muted); padding:20px;">
                        <i class="fas fa-search" style="font-size:3rem; margin-bottom:10px; opacity:0.5;"></i><br>
                        Waiting for selection...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal -->
    <div class="modal" id="boxModal">
        <div class="modal-content">
            <div class="modal-title">
                <i class="fas fa-box"></i> <?= $t['box_details'] ?>
            </div>
            <div id="modalSlots"></div>
            <button class="close-btn" onclick="closeModal()">
                <i class="fas fa-times"></i> <?= $t['close'] ?>
            </button>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
        <div class="status-left">
            <div class="status-dot"></div>
            <span>Auto-refresh: 0.5s</span>
        </div>
    </div>

    <script src="assets/tts-voice-picker.js?v=20260616"></script>
    <script>
        const TV_KIOSK_KEY = <?= json_encode($tvKioskKey, JSON_UNESCAPED_UNICODE) ?>;
        function tvKioskQuery(extra = '') {
            if (!TV_KIOSK_KEY) return extra;
            const sep = extra.includes('?') ? '&' : (extra ? '?' : '?');
            return extra + sep + 'tv_key=' + encodeURIComponent(TV_KIOSK_KEY);
        }
        const isEN = <?= json_encode($lang == 'en') ?>;
        let currentHighlight = null;
        let isAudioUnlocked = false;

        function highlightSig(h) {
            if (!h) return '';
            return String(h.highlight_seq || ((h.updated_at || h.expires_at || '') + '-' + h.box_id + '-' + h.slot_id));
        }

        function formatForTTS(str, isThaiLanguage = false) {
            if (!str) return '';
            let s = str.toString();

            if (isThaiLanguage) {
                s = s.replace(/-/g, ' ขีด ');
                s = s.replace(/A/gi, ' เอ ');
                s = s.replace(/B/gi, ' บี ');
                s = s.replace(/C/gi, ' ซี ');
                s = s.replace(/D/gi, ' ดี ');
                s = s.replace(/E/gi, ' อี ');
                return s;
            }
            return s;
        }

        function applyTvHighlight(h) {
            h.sig = highlightSig(h);
            currentHighlight = h;

            document.body.classList.add('split-active', 'search-mode-active');

            const boxEl = document.getElementById('box-' + h.box_id);
            let layout = '1x1';
            if (boxEl) layout = boxEl.dataset.layout || '1x1';

            showDetailPanel(h.box_id, h.slot_id, layout);

            document.querySelectorAll('.highlight-pulse').forEach(el => el.classList.remove('highlight-pulse'));
            document.querySelectorAll('.highlight-active').forEach(el => el.classList.remove('highlight-active'));
            document.querySelectorAll('.rack').forEach(el => el.style.display = 'none');

            if (boxEl) {
                boxEl.classList.add('highlight-pulse');
                const rack = boxEl.closest('.rack');
                if (rack) {
                    rack.style.display = 'block';
                    rack.classList.add('highlight-active');
                    const level = boxEl.closest('.level');
                    if (level) level.classList.add('highlight-active');
                    rack.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                const speakText = isEN ?
                    `Rack ${formatForTTS(h.rack_name, false)} Level ${formatForTTS(h.level_no, false)} Box ${formatForTTS(h.box_code, false)} Slot ${formatForTTS(h.slot_no, false)}` :
                    `แร็ค ${formatForTTS(h.rack_name, true)}... ชั้น ${formatForTTS(h.level_no, true)}... กล่อง ${formatForTTS(h.box_code, true)}... ช่อง ${formatForTTS(h.slot_no, true)}`;
                speak(speakText);
            }

            const alert = document.getElementById('searchAlert');
            if (alert) {
                alert.classList.add('active');
                document.getElementById('alertProduct').textContent = h.product_name || '-';
                updateDetailPuidBar();
                document.getElementById('alertUser').textContent = h.searched_by || 'User';
                document.getElementById('alertTime').textContent = h.searched_at || '-';
                var locEl = document.getElementById('alertLocation');
                if (locEl) {
                    locEl.textContent =
                        `Rack ${h.rack_name || '-'} → Level ${h.level_no || '-'} → Box ${h.box_code || '-'} → Slot ${h.slot_no || '-'}`;
                }
            }
        }

        function switchLang(l) {
            const url = new URL(window.location.href);
            url.searchParams.set('lang', l);
            if (isAudioUnlocked) url.searchParams.set('sound', '1');
            window.location.href = url.toString();
        }

        // Clock
        function updateClock() {
            const now = new Date();
            document.getElementById('clock').textContent = now.toLocaleTimeString('th-TH', {
                hour12: false
            });
            document.getElementById('date').textContent = now.toLocaleDateString(isEN ? 'en-US' : 'th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Check for new search highlights (poll fast — switch immediately on new highlight_seq)
        function checkHighlight() {
            fetch(tvKioskQuery('api_tv_highlight.php?action=get&_=' + Date.now()), { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    const hasData = (data.status === 'success' && data.data);

                    if (hasData) {
                        const h = data.data;
                        const sig = highlightSig(h);

                        if (!currentHighlight || currentHighlight.sig !== sig) {
                            applyTvHighlight(h);
                        }
                    } else {
                        // No active search
                        if (currentHighlight !== null) {
                            // Instead of reload (which resets audio lock), clear UI manually
                            document.body.classList.remove('split-active', 'search-mode-active');
                            const alert = document.getElementById('searchAlert');
                            if (alert) alert.classList.remove('active');

                            // Restore racks visibility
                            document.querySelectorAll('.rack').forEach(el => el.style.display = 'block');

                            // Clear Highlighting
                            document.querySelectorAll('.highlight-pulse').forEach(el => el.classList.remove('highlight-pulse'));
                            document.querySelectorAll('.highlight-active').forEach(el => el.classList.remove('highlight-active'));

                            // Reset detail panel
                            const detailContent = document.getElementById('detailContent');
                            if (detailContent) detailContent.innerHTML = '';
                            const detailTitle = document.getElementById('detailBoxTitle');
                            if (detailTitle) detailTitle.innerText = 'Box Details';

                            // Stop any pending speech
                            if ('speechSynthesis' in window) {
                                window.speechSynthesis.cancel();
                            }
                        }
                        currentHighlight = null;
                        updateDetailPuidBar();
                    }
                })
                .catch(err => console.error('Highlight check error:', err));
        }

        // Text To Speech Function
        let voices = [];
        let currentUtterance = null;
        // isAudioUnlocked is already declared at the top of the script
        // Use real file instead of base64 for better compatibility
        const beepSound = new Audio("assets/notification.mp3");


        function loadVoices() {
            voices = window.TtsVoicePicker ? TtsVoicePicker.loadVoices() : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
            console.log("Voices loaded:", voices.length);
            return voices;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoices();
                const dbg = new URLSearchParams(location.search).get('tts_debug');
                if (window.TtsVoicePicker && dbg === '1') {
                    TtsVoicePicker.logVoices(voices, 'th');
                } else if (window.TtsVoicePicker && dbg === 'en') {
                    TtsVoicePicker.logVoices(voices, 'en');
                }
            };
            loadVoices();
        }

        function toggleAudio(force = null) {
            if (force !== null) isAudioUnlocked = !force; // will be toggled below

            if (isAudioUnlocked && force === null) {
                // Disable
                isAudioUnlocked = false;
                localStorage.setItem('tv_audio_enabled', 'false');
                updateAudioUI(false);
                window.speechSynthesis.cancel();
            } else {
                // Enable
                isAudioUnlocked = true;
                localStorage.setItem('tv_audio_enabled', 'true');
                updateAudioUI(true);

                if (voices.length === 0) loadVoices();
                const testMsg = isEN ? "Audio Online" : "ระบบเสียงพร้อมใช้งาน";
                if (window.TtsVoicePicker) {
                    TtsVoicePicker.speak(testMsg, voices, !isEN, { rate: isEN ? 0.65 : (TtsVoicePicker.THAI_SPEECH_RATE || 0.42) });
                }
            }
        }

        function updateAudioUI(enabled) {
            const btn = document.getElementById('soundToggle');
            const icon = document.getElementById('soundIcon');
            const text = document.getElementById('soundText');

            if (enabled) {
                if (btn) {
                    btn.style.background = 'var(--success)';
                    btn.style.borderColor = 'rgba(255,255,255,0.4)';
                }
                if (icon) icon.className = 'fas fa-volume-up';
                if (text) text.innerText = <?= json_encode($t['sound_active']) ?>;
            } else {
                if (btn) {
                    btn.style.background = 'var(--danger)';
                    btn.style.borderColor = 'rgba(255,255,255,0.2)';
                }
                if (icon) icon.className = 'fas fa-volume-mute';
                if (text) text.innerText = <?= json_encode($t['sound_enable']) ?>;
            }
        }

        // Auto-unlock if was enabled or via URL
        window.addEventListener('load', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const wasEnabled = localStorage.getItem('tv_audio_enabled') === 'true' || urlParams.get('sound') === '1';

            if (wasEnabled) {
                // Note: We can only auto-unlock if the page load was triggered by a user gesture (like language switch)
                // or if the browser allows it. We'll try.
                isAudioUnlocked = true;
                updateAudioUI(true);
            }
        });

        function speak(text) {
            if (!isAudioUnlocked || !('speechSynthesis' in window)) {
                console.warn("Speech skipped: Unlocked=" + isAudioUnlocked);
                return;
            }

            if (voices.length === 0) {
                loadVoices();
                if (voices.length === 0) {
                    console.warn("No voices available yet, waiting...");
                    setTimeout(() => speak(text), 500);
                    return;
                }
            }

            const forThai = !isEN;
            if (window.TtsVoicePicker) {
                TtsVoicePicker.speak(text, voices, forThai, { rate: forThai ? (TtsVoicePicker.THAI_SPEECH_RATE || 0.42) : 0.65 });
            }
        }

        // Poll every 500ms — new highlights replace old immediately (no wait for expiry)
        setInterval(checkHighlight, 500);
        checkHighlight();

        function updateDetailPuidBar() {
            var bar = document.getElementById('detailPuidBar');
            var val = document.getElementById('detailPuidValue');
            if (!bar || !val) {
                return;
            }
            var puid = currentHighlight && currentHighlight.puid
                ? String(currentHighlight.puid).trim()
                : '';
            if (puid) {
                val.textContent = puid;
                bar.hidden = false;
            } else {
                val.textContent = '';
                bar.hidden = true;
            }
        }

        // Show Detail Panel (Replaces Modal)
        function showDetailPanel(box_id, highlight_slot_id = 0, layout = '1x1') {
            const detailContent = document.getElementById('detailContent');
            const detailTitle = document.getElementById('detailBoxTitle');

            // Get Box Code from DOM for title
            const boxEl = document.getElementById('box-' + box_id);
            if (boxEl) detailTitle.innerText = 'Box ' + boxEl.innerText.trim();

            const gridCols = layout.includes('x') ? parseInt(layout.split('x')[0]) : 1;

            // Setup Grid
            detailContent.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
            detailContent.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align:center; color:white;">Loading...</div>';

            updateDetailPuidBar();

            fetch(tvKioskQuery('get_box_layout.php?box_id=' + box_id + '&highlight_slot_id=' + highlight_slot_id))
                .then(res => res.json())
                .then(data => {
                    detailContent.innerHTML = '';
                    let totalSlots = data.slots.length;
                    let gridRows = Math.ceil(totalSlots / gridCols);

                    // Reset grid rows to natural size for scrolling
                    detailContent.style.gridTemplateRows = 'none';

                    let arrangedSlots = [];

                    // Arrange slots to match physical layout (Top-Left start vs Bottom-Left?)
                    // Usually Rack logic: Row 1 is Bottom?
                    // Assuming standard left-to-right, top-to-bottom or matching visual logic
                    // We use simple fill for now, assuming array is sorted by slot_no logic

                    // Logic from previous version: (c * gridRows) + ... seems strictly column-major?
                    // Let's use simpler logic if possible, or stick to provided logic if it matches physical.
                    // Previous Logic was: blockIndex = (c * gridRows) + (gridRows - 1 - r);
                    // This implies Vertical Wrapping (Column Major), bottom-up?
                    // Let's reuse it to ensure consistency with previous modal.

                    for (let r = 0; r < gridRows; r++) {
                        for (let c = 0; c < gridCols; c++) {
                            let slotIndex = (c * gridRows) + (gridRows - 1 - r);
                            // Verify boundary
                            if (slotIndex < data.slots.length && data.slots[slotIndex]) {
                                arrangedSlots.push(data.slots[slotIndex]);
                            } else {
                                arrangedSlots.push({
                                    empty: true
                                });
                            }
                        }
                    }

                    arrangedSlots.forEach((s) => {
                        let div = document.createElement('div');
                        div.className = 'detail-slot';

                        if (s.empty) {
                            div.classList.add('empty');
                            div.innerHTML = '<span style="opacity:0.2;">-</span>';
                        } else {
                            if (s.highlight) {
                                div.classList.add('highlight');
                                // Give it an ID to scroll to it
                                div.id = 'target-slot';
                            }

                            let content = `<div style="font-size:1.8rem; color:var(--success); font-weight:800; margin-bottom:5px;">Slot ${s.slot_no}</div>`;

                            if (s.name) {
                                content += `<div class="detail-product-name">${s.name}</div>`;
                                content += `<div class="detail-qty">${s.qty}</div>`;
                                if (s.puids && s.puids.length > 0) {
                                    content += `<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px; justify-content:center;">` +
                                        s.puids.map(function (p) {
                                            return `<span style="background:rgba(59,130,246,0.2); color:#93c5fd; padding:2px 8px; border-radius:6px; font-size:0.85rem; font-weight:700; border:1px solid rgba(59,130,246,0.35); font-family:'Roboto Mono',monospace;">${p}</span>`;
                                        }).join('') +
                                        `</div>`;
                                }
                            } else {
                                content += `<div style="color:var(--text-muted); font-size:0.9rem; margin-top:10px;">${isEN ? 'Empty' : 'ว่าง'}</div>`;
                            }
                            div.innerHTML = content;
                        }
                        detailContent.appendChild(div);
                    });

                    // AUTO-SCROLL to the highlighted slot
                    setTimeout(() => {
                        const target = document.getElementById('target-slot');
                        if (target) {
                            target.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                        }
                    }, 300);
                })
                .catch(err => {
                    console.error(err);
                    detailContent.innerHTML = '<div style="color:var(--danger); grid-column: 1/-1; text-align:center;">Error loading data</div>';
                });
        }
    </script>
</body>

</html>