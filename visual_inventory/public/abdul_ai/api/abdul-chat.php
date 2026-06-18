<?php

/**
 * =============================================
 * Abdul Chat Engine API (V2)
 * =============================================
 * ใช้ข้อมูลจริงจาก smart_store database
 * ตาราง: inventory_receive, v_inventory_location, products
 * 
 * Flow: question → detectIntent → extractParam → runSQL → return JSON
 * 
 * ⚡ ไม่ใช้ LLM ค้น Database
 * ⚡ ใช้ Prepared Statement ทั้งหมด
 * ⚡ Response Time < 100ms
 * =============================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

mb_internal_encoding('UTF-8');

require_once __DIR__ . '/../includes/functions.php';

// ─── Timing Start ───
$startTime = microtime(true);

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $question = trim($input['question'] ?? '');

    if (empty($question)) {
        echo json_encode(['error' => 'กรุณาพิมพ์คำถาม'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo = getDB();

    // ─── Step 1: Detect Intent ───
    $intent = detectIntent($question);

    // ─── Step 2: Extract Parameter ───
    $param = extractParam($question, $intent);

    // ─── Step 3: Run SQL (ใช้ตารางจริง) ───
    $result = runIntentQuery($pdo, $intent, $param);

    // ─── Timing End ───
    $elapsed = round((microtime(true) - $startTime) * 1000, 2);

    echo json_encode([
        'intent'        => $intent,
        'param'         => $param,
        'data'          => $result['data'],
        'count'         => $result['count'],
        'sql_debug'     => $result['sql'],
        'response_ms'   => $elapsed,
        'question'      => $question,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode([
        'error'   => 'System Error: ' . $e->getMessage(),
        'intent'  => $intent ?? 'unknown',
    ], JSON_UNESCAPED_UNICODE);
}


// =============================================
// FUNCTIONS
// =============================================

/**
 * 🧠 Detect Intent from question
 * ใช้ strpos() ตรวจ keyword — ไม่ใช้ LLM
 */
function detectIntent(string $question): string
{
    $q = mb_strtolower($question, 'UTF-8');

    // Order matters: more specific intents first, broader intents last
    $intentMap = [
        'near_expiry'       => ['ใกล้หมดอายุ', 'ใกล้หมด', 'expire soon', 'near expiry', 'expiring soon', 'จะหมดอายุ', 'เกือบหมดอายุ'],
        'expired_material'  => ['หมดอายุ', 'expired', 'หมดแล้ว', 'เลยกำหนด'],
        'find_location'     => ['อยู่ไหน', 'อยู่ที่ไหน', 'location', 'where', 'ตำแหน่ง', 'เก็บไว้ไหน', 'วางไว้ไหน', 'เก็บที่ไหน', 'หาของ', 'อยู่ตรงไหน'],
        'stock_check'       => ['เหลือ', 'stock', 'qty', 'จำนวน', 'เหลือเท่าไหร่', 'คงเหลือ', 'มีกี่', 'เช็คสต็อก', 'check stock', 'ยอดคงเหลือ', 'เหลือกี่'],
        'find_puid'         => ['puid'],
        'rack_items'        => ['rack', 'ชั้น', 'ชั้นวาง', 'shelf', 'แร็ค'],
        'list_all'          => ['ทั้งหมด', 'all', 'รายการทั้งหมด', 'list all', 'แสดงทั้งหมด', 'ขอดูทั้งหมด', 'รายการ', 'list', 'แสดง', 'ขอดู'],
        'search_item'       => ['ค้นหา', 'search', 'หา', 'ข้อมูล', 'ดู', 'เช็ค', 'check'],
    ];

    foreach ($intentMap as $intent => $keywords) {
        foreach ($keywords as $kw) {
            if (mb_strpos($q, $kw) !== false) {
                return $intent;
            }
        }
    }

    // Default: try to search
    return 'search_item';
}


/**
 * 🔍 Extract parameter (HanaPart, PUID, rack, search term)
 */
function extractParam(string $question, string $intent): string
{
    $q = trim($question);

    // For PUID — extract the PUID code
    if ($intent === 'find_puid') {
        if (preg_match('/puid\s*[:\s]*([a-zA-Z0-9]+)/i', $q, $m)) {
            return strtoupper($m[1]);
        }
        // Try to find alphanumeric code
        if (preg_match('/\b([a-zA-Z0-9]{6,})\b/i', $q, $m)) {
            return strtoupper($m[1]);
        }
    }

    // For rack — find shelf/rack number
    if ($intent === 'rack_items') {
        if (preg_match('/\b(\d{1,2})\b/', $q, $m)) {
            return $m[1];
        }
        if (preg_match('/ชั้น\s*(\S+)/u', $q, $m)) {
            return $m[1];
        }
    }

    // For location / stock / search — extract part code or search term
    if (in_array($intent, ['find_location', 'stock_check', 'search_item'])) {
        // Pattern 1: IST part numbers (e.g. 8041ISTC150J101, 1051ISTC154F011)
        if (preg_match('/\b(\d{3,4}IST\S*)\b/i', $q, $m)) {
            return strtoupper($m[1]);
        }
        // Pattern 2: General alphanumeric code 4+ chars
        if (preg_match('/\b([A-Za-z0-9]{4,}[A-Za-z0-9]*)\b/i', $q, $m)) {
            $code = $m[1];
            // Skip common Thai-converted words
            $skipWords = ['location', 'where', 'stock', 'check', 'search', 'PUID'];
            if (!in_array(strtoupper($code), array_map('strtoupper', $skipWords))) {
                return strtoupper($code);
            }
        }
        // Pattern 3: Extract quoted text
        if (preg_match('/["\'"](.+?)["\'"]/u', $q, $m)) {
            return trim($m[1]);
        }
        // Pattern 4: Extract remaining text after removing keywords
        $removeWords = [
            'อยู่ไหน',
            'อยู่ที่ไหน',
            'เหลือ',
            'เหลือเท่าไหร่',
            'มีกี่',
            'จำนวน',
            'ค้นหา',
            'หา',
            'ดู',
            'เช็ค',
            'สินค้า',
            'ของ',
            'ข้อมูล',
            'พาร์ท',
            'part',
            'check',
            'stock',
            'เช็คสต็อก',
            'คงเหลือ',
            'เบิก',
            'ยอด',
        ];
        $cleaned = $q;
        foreach ($removeWords as $w) {
            $cleaned = str_ireplace($w, '', $cleaned);
        }
        $cleaned = trim($cleaned);
        if (!empty($cleaned)) {
            return $cleaned;
        }
    }

    // For expired / near_expiry / list_all — no param needed
    if (in_array($intent, ['expired_material', 'near_expiry', 'list_all'])) {
        return '';
    }

    return trim($q);
}


/**
 * ⚡ Run SQL Template (Prepared Statements)
 * ใช้ตารางจริง: inventory_receive, v_inventory_location, products
 */
function runIntentQuery(PDO $pdo, string $intent, string $param): array
{
    $data = [];
    $sql  = '';

    switch ($intent) {

        // ── Find Location (ค้นหาตำแหน่งจาก Part Number) ──
        case 'find_location':
            $sql = "SELECT 
                        part_name AS HanaPart,
                        current_qty AS QtyRemain,
                        rack_name AS Shelf,
                        level_no AS Level,
                        box_code AS Box,
                        slot_no AS Slot,
                        earliest_expiration AS ExpirationDate
                    FROM v_inventory_location
                    WHERE part_name LIKE :like_param
                    ORDER BY current_qty DESC
                    LIMIT 20";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':like_param' => "%{$param}%"]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fallback: ถ้าหาไม่เจอใน v_inventory_location ลองหาใน inventory_receive
            if (empty($data)) {
                $sql = "SELECT 
                            HanaPart, Description, QtyRemain,
                            Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                            ExpirationDate, PUID, StatusName
                        FROM inventory_receive
                        WHERE HanaPart LIKE :like_param OR Description LIKE :like_param2
                        ORDER BY QtyRemain DESC
                        LIMIT 20";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':like_param'  => "%{$param}%",
                    ':like_param2' => "%{$param}%",
                ]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            break;

        // ── Stock Check (เช็คจำนวนคงเหลือ) ──
        case 'stock_check':
            $sql = "SELECT 
                        HanaPart, Description, 
                        QtyRemain, Qty AS QtyOriginal,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName, PUID
                    FROM inventory_receive
                    WHERE (HanaPart LIKE :like_param OR PUID = :exact_param)
                      AND QtyRemain > 0
                    ORDER BY QtyRemain DESC
                    LIMIT 20";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':like_param' => "%{$param}%",
                ':exact_param' => $param,
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fallback: รวมจาก v_inventory_location ด้วย
            if (empty($data)) {
                $sql = "SELECT 
                            part_name AS HanaPart, 
                            current_qty AS QtyRemain,
                            rack_name AS Shelf, level_no AS Level, box_code AS Box
                        FROM v_inventory_location
                        WHERE part_name LIKE :like_param AND current_qty > 0
                        LIMIT 20";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':like_param' => "%{$param}%"]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            break;

        // ── Expired Material (สินค้าหมดอายุแล้ว) ──
        case 'expired_material':
            $sql = "SELECT 
                        HanaPart, Description, 
                        ExpirationDate,
                        DATEDIFF(CURDATE(), ExpirationDate) AS DaysOverdue,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName
                    FROM inventory_receive
                    WHERE ExpirationDate <= CURDATE()
                      AND ExpirationDate IS NOT NULL
                      AND QtyRemain > 0
                    ORDER BY ExpirationDate ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        // ── Near Expiry (ใกล้หมดอายุภายใน 30 วัน) ──
        case 'near_expiry':
            $sql = "SELECT 
                        HanaPart, Description,
                        ExpirationDate,
                        DATEDIFF(ExpirationDate, CURDATE()) AS DaysRemaining,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        StatusName
                    FROM inventory_receive
                    WHERE ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                      AND ExpirationDate IS NOT NULL
                      AND QtyRemain > 0
                    ORDER BY ExpirationDate ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        // ── Find PUID ──
        case 'find_puid':
            $sql = "SELECT 
                        PUID, HanaPart, Description,
                        QtyRemain, Qty AS QtyOriginal,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName, LotNo, DateCode
                    FROM inventory_receive
                    WHERE PUID = :param
                    LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':param' => $param]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        // ── Rack/Shelf Items (สินค้าในชั้นวาง) ──
        case 'rack_items':
            $sql = "SELECT 
                        part_name AS HanaPart,
                        current_qty AS QtyRemain,
                        rack_name AS Shelf,
                        level_no AS Level,
                        box_code AS Box,
                        slot_no AS Slot,
                        earliest_expiration AS ExpirationDate
                    FROM v_inventory_location
                    WHERE rack_name = :param
                    ORDER BY part_name ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':param' => $param]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        // ── Search Item (ค้นหาทั่วไป) ──
        case 'search_item':
            $sql = "SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    WHERE HanaPart LIKE :like1
                       OR Description LIKE :like2
                       OR PUID LIKE :like3
                    ORDER BY QtyRemain DESC
                    LIMIT 20";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':like1' => "%{$param}%",
                ':like2' => "%{$param}%",
                ':like3' => "%{$param}%",
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fallback: ลองหาใน v_inventory_location
            if (empty($data)) {
                $sql = "SELECT 
                            part_name AS HanaPart,
                            current_qty AS QtyRemain,
                            rack_name AS Shelf, level_no AS Level, box_code AS Box,
                            earliest_expiration AS ExpirationDate
                        FROM v_inventory_location
                        WHERE part_name LIKE :like_param
                        ORDER BY current_qty DESC
                        LIMIT 20";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':like_param' => "%{$param}%"]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            break;

        // ── List All (แสดงทั้งหมด) ──
        case 'list_all':
            $sql = "SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    WHERE QtyRemain > 0
                    ORDER BY HanaPart ASC
                    LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        default:
            $sql = "SELECT 
                        HanaPart, Description,
                        QtyRemain, PUID,
                        Loc_Shelf AS Shelf, Loc_Level AS Level, Loc_Box AS Box,
                        ExpirationDate, StatusName
                    FROM inventory_receive
                    ORDER BY HanaPart ASC
                    LIMIT 20";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
    }

    return [
        'data'  => $data,
        'count' => count($data),
        'sql'   => $sql,
    ];
}
