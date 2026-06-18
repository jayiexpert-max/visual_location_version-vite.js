<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // Allow all domains
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

mb_internal_encoding('UTF-8');
mb_http_output('UTF-8');

require_once __DIR__ . '/../includes/functions.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $userQuestion = $input['question'] ?? '';

    if (empty($userQuestion)) {
        echo json_encode(['error' => 'กรุณาพิมพ์คำถาม']);
        exit;
    }

    // 🇹🇭 Pre-process Thai Question (Normalize dates/terms)
    $processedQuestion = preprocessThaiQuestion($userQuestion);
    $questionHash = hash('sha256', trim($processedQuestion));
    $pdo = getDB();

    // ⚡ 1. Query Cache Check (Speed up repeats)
    $stmt = $pdo->prepare("SELECT generated_sql FROM ai_query_cache WHERE question_hash = ?");
    $stmt->execute([$questionHash]);
    $cached = $stmt->fetch();

    if ($cached) {
        $sql = $cached['generated_sql'];
        $pdo->prepare("UPDATE ai_query_cache SET hit_count = hit_count + 1 WHERE question_hash = ?")->execute([$questionHash]);
    } else {
        // ⚡ 2. Direct Search Bypass (Speed up obvious Part Number searches)
        // Pattern: Starts with 4+ digits/chars that look like a part number (e.g. 8041IST, 1051, 3003)
        $isDirectSearch = false;
        $searchTerm = '';
        if (preg_match('/^[a-zA-Z0-9]{4,}$/', trim($processedQuestion), $matches)) {
            $isDirectSearch = true;
            $searchTerm = $matches[0];
        }

        if ($isDirectSearch) {
            // Search in both location view (for part numbers) and receive table (for PUIDs)
            $sql = "SELECT part_name, current_qty, rack_name, level_no, box_code, slot_no, slot_id, box_id, product_id FROM v_inventory_location WHERE part_name LIKE '%$searchTerm%' 
                    UNION ALL
                    SELECT HanaPart as part_name, QtyRemain as current_qty, Loc_Shelf as rack_name, Loc_Level as level_no, Loc_Box as box_code, 'N/A' as slot_no, 0 as slot_id, 0 as box_id, 0 as product_id 
                    FROM inventory_receive 
                    WHERE PUID = '$searchTerm' OR HanaPart LIKE '%$searchTerm%'
                    LIMIT 20;";
        } else {
            // 🧠 Smart Schema Selection (Hard Mapping)
            $dynamicSchema = getSmartSchemaForQuestion($processedQuestion);

            $prompt = "[INST] You are an expert MySQL SQL generator for an Inventory & Warehouse system. 
Output ONLY raw SQL. No explanation. No markdown.

DATABASE SCHEMA:
$dynamicSchema

VIEWS (USE THESE IF POSSIBLE):
- v_inventory_location: [part_name, current_qty, slot_no, box_code, level_no, rack_name, earliest_expiration, slot_id, box_id, product_id] (Use for location and NEARBY expiration)
- v_stock_history: [username, role, part_name, action, action_type, quantity, created_at, log_remark] (Use for history/logs. Column is 'log_remark' NOT 'remark')
- users: [id, username, role, email, created_at, remark] (ALWAYS exclude password)

BOM SCHEMA:
- models: [id, model_code, description]
- model_revisions: [id, model_id, revision, status] (Use revision_id in bom_items)
- bom_items: [id, revision_id, material_id, qty]
- products: [id, name, qty] (Join bom_items.material_id = products.id)

RELATIONSHIPS:
- products.name = inventory_receive.HanaPart = v_inventory_location.part_name
- bom_items.material_id = products.id
- models.id = model_revisions.model_id
- model_revisions.id = bom_items.revision_id

CRITICAL RULES:
1. For LOCATION searches: Use `v_inventory_location` for Part Names. Use `inventory_receive` if searching by PUID.
2. For PUID searches: ALWAYS use `inventory_receive` (e.g., WHERE PUID = '...').
3. For NEARLY EXPIRED / EXPIRATION:
   - ALWAYS include `DATEDIFF(earliest_expiration, CURDATE()) AS DaysRemaining`.
   - Use `v_inventory_location.earliest_expiration`. Default range: Next 30 days `BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`.
4. For PRODUCTION PLANNING / CALCULATOR (Reservation Aware):
   - BASE TABLE: `materials` joined with `bom_items` and `model_revisions` and `models`.
   - Physical Stock: `(SELECT IFNULL(SUM(QtyRemain), 0) FROM inventory_receive WHERE HanaPart = m.material_code AND QtyRemain > 0)`
   - Reserved Stock: `(SELECT IFNULL(SUM(bi2.qty * pr.production_qty), 0) FROM production_reservations pr JOIN bom_items bi2 ON pr.revision_id = bi2.revision_id JOIN materials m2 ON bi2.material_id = m2.id WHERE pr.status = 'active' AND m2.material_code = m.material_code)`.
   - Available Stock: `(Physical - Reserved)`.
   - Status: `(Available - total_required) >= 0`.
   - Show columns: `m.material_code, m.description, bi.qty as per_unit, (bi.qty * [qty]) as total_required, [Physical] as physical_stock, [Reserved] as reserved_stock, [Available] as available_stock`.
   - Use `WHERE mr.status IN ('ACTIVE', 'DRAFT')`.
5. For AVAILABLE / READY TO WITHDRAW: Filter by `current_qty > 0` or `QtyRemain > 0`.
6. SECURITY: NEVER select `password`.
7. Return ONLY raw SELECT statement ending with ;
8. Always include location columns (`rack_name, level_no, box_code, slot_no, slot_id, box_id`) for searchable items in `v_inventory_location` to support UI features.

EXAMPLES:
Q: ขอข้อมูล User ทั้งหมด
A: SELECT id, username, role, email, created_at, remark FROM users;

Q: ค้นหาตำแหน่งพาร์ท 8041IST
A: SELECT part_name, current_qty, rack_name, level_no, box_code, slot_no, slot_id, box_id, product_id FROM v_inventory_location WHERE part_name LIKE '%8041IST%';

Q: ค้นหา PUID VL084BLE
A: SELECT HanaPart as part_name, QtyRemain as current_qty, Loc_Shelf as rack_name, Loc_Level as level_no, Loc_Box as box_code, PUID FROM inventory_receive WHERE PUID = 'VL084BLE';

Q: มีสินค้าอะไรที่พร้อมเบิกบ้าง
A: SELECT part_name, current_qty, rack_name, level_no, box_code, slot_no FROM v_inventory_location WHERE current_qty > 0 ORDER BY part_name ASC;

Q: สินค้าที่ 'หมดอายุแล้ว' (Already Expired - วันหมดอายุผ่านมาแล้ว)
A: SELECT part_name, earliest_expiration, DATEDIFF(earliest_expiration, CURDATE()) AS DaysRemaining, current_qty, rack_name, level_no, box_code, slot_no, slot_id, box_id FROM v_inventory_location WHERE earliest_expiration < CURDATE() AND current_qty > 0 ORDER BY earliest_expiration ASC;

Q: สินค้าที่ 'ใกล้จะหมดอายุ' (Expiring Soon - วันหมดอายุยังมาไม่ถึงแต่ใกล้แล้ว)
A: SELECT part_name, earliest_expiration, DATEDIFF(earliest_expiration, CURDATE()) AS DaysRemaining, current_qty, rack_name, level_no, box_code, slot_no, slot_id, box_id FROM v_inventory_location WHERE earliest_expiration >= CURDATE() AND earliest_expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY DaysRemaining ASC;

RULE: 'หมดอายุ' (Expired) means < CURDATE(). 'ใกล้หมดอายุ' (Expiring Soon) means >= CURDATE().

Q: ขอรายการ 'ทุกล็อต' ที่หมดอายุแล้ว (All individual expired batches)
A: SELECT HanaPart, Description, ExpirationDate, QtyRemain, Loc_Shelf, Loc_Level, Loc_Box FROM inventory_receive WHERE ExpirationDate < CURDATE() AND QtyRemain > 0 ORDER BY ExpirationDate ASC;

Q: ขอประวัติของ PUID 05OLRM
A: SELECT username, action, quantity, created_at FROM v_stock_history WHERE action LIKE '%05OLRM%';

Q: เบิกพาร์ทของรุ่น TV-001 Rev.1 จำนวน 10 ชุด (withdraw_by_bom)
A: SELECT m.material_code, m.description, bi.qty as qty_per_unit, (bi.qty * 10) as total_required, p.qty as in_stock, (p.qty >= bi.qty * 10) as is_ready FROM models mo JOIN model_revisions mr ON mo.id = mr.model_id JOIN bom_items bi ON mr.id = bi.revision_id JOIN materials m ON bi.material_id = m.id JOIN products p ON m.material_code = p.name WHERE mo.model_code = 'TV-001' AND mr.revision = 1 AND mr.status IN ('ACTIVE', 'DRAFT') ORDER BY is_ready ASC;

Q: Bom 3003IST6000329A พร้อมผลิต 1440 ตัวหรือไม่ (เช็คยอดจองด้วย)
A: SELECT m.material_code, m.description, bi.qty as per_unit, (bi.qty * 1440) as total_required, (SELECT IFNULL(SUM(QtyRemain), 0) FROM inventory_receive WHERE HanaPart = m.material_code AND QtyRemain > 0) as physical_stock, (SELECT IFNULL(SUM(bi2.qty * pr.production_qty), 0) FROM production_reservations pr JOIN bom_items bi2 ON pr.revision_id = bi2.revision_id JOIN materials m2 ON bi2.material_id = m2.id WHERE pr.status = 'active' AND m2.material_code = m.material_code) as reserved_stock, ((SELECT IFNULL(SUM(QtyRemain), 0) FROM inventory_receive WHERE HanaPart = m.material_code AND QtyRemain > 0) - (SELECT IFNULL(SUM(bi2.qty * pr.production_qty), 0) FROM production_reservations pr JOIN bom_items bi2 ON pr.revision_id = bi2.revision_id JOIN materials m2 ON bi2.material_id = m2.id WHERE pr.status = 'active' AND m2.material_code = m.material_code)) as available_stock FROM models mo JOIN model_revisions mr ON mo.id = mr.model_id JOIN bom_items bi ON mr.id = bi.revision_id JOIN materials m ON bi.material_id = m.id WHERE mo.model_code = '3003IST6000329A' AND mr.status IN ('ACTIVE', 'DRAFT') ORDER BY available_stock ASC;

    Q: $processedQuestion
    A: [/INST]";

            // 🤖 Call AI
            $sql = callGemini($prompt);
            $sql = cleanSQLOutput($sql);

            // 💾 Save to Cache if successful later
            $shouldCache = true;
        }
    }

    // 🔐 Validate
    if (!validateSQL($sql, [])) {
        logQuery('anonymous', $userQuestion, $sql, 'REJECTED');
        echo json_encode(['error' => 'ระบบความปลอดภัยปฏิเสธคำสั่งนี้', 'debug_sql' => $sql]);
        exit;
    }

    // Execute with Fallback Logic
    $results = [];
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll();

        // 💾 Save to Cache if it was a new AI query
        if (isset($shouldCache) && $shouldCache && count($results) > 0) {
            $ins = $pdo->prepare("INSERT IGNORE INTO ai_query_cache (question_hash, original_question, generated_sql) VALUES (?, ?, ?)");
            $ins->execute([$questionHash, $processedQuestion, $sql]);
        }
    } catch (\PDOException $e) {

        // 🧠 Intelligent Fallback: If 0 results, try a broader search or different table
        if (count($results) === 0) {
            // Check if it was a part number search (common case)
            if (preg_match("/LIKE '%(.*?)%'/", $sql, $matches)) {
                $searchTerm = $matches[1];

                // If searching in v_inventory_location and nothing found, try inventory_receive
                if (strpos($sql, 'v_inventory_location') !== false) {
                    $fallbackSql = "SELECT HanaPart as part_name, QtyRemain as current_qty, Description, Loc_Shelf, Loc_Level, Loc_Box, PUID FROM inventory_receive WHERE PUID LIKE :term OR HanaPart LIKE :term OR Description LIKE :term LIMIT 5";
                    $stmt = $pdo->prepare($fallbackSql);
                    $stmt->execute(['term' => "%$searchTerm%"]);
                    $results = $stmt->fetchAll();
                    if (count($results) > 0) {
                        $sql = "[FALLBACK] " . $fallbackSql . " (Term: $searchTerm)";
                    }
                }
            }
        }
    } catch (\PDOException $e) {
        // Retry once with AI fix
        $retryPrompt = "[INST] Fix this SQL error. Output ONLY corrected SQL. No explanation.\nError: {$e->getMessage()}\nSQL: $sql [/INST]";
        $sql = callGemini($retryPrompt);
        $sql = cleanSQLOutput($sql);

        if (validateSQL($sql, [])) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll();
        } else {
            throw $e;
        }
    }

    logQuery('anonymous', $userQuestion, $sql, count($results) > 0 ? 'SUCCESS' : 'NO_RESULTS');

    echo json_encode([
        'sql' => $sql,
        'results' => $results,
        'count' => count($results),
        'note' => (count($results) === 0) ? "ไม่พบข้อมูลที่ตรงกัน ลองใช้คำค้นหาที่กว้างขึ้น" : ""
    ]);
} catch (Exception $e) {
    logQuery('anonymous', $userQuestion ?? 'N/A', $sql ?? 'N/A', 'ERROR: ' . $e->getMessage());
    echo json_encode(['error' => 'System error: ' . $e->getMessage(), 'sql' => $sql ?? '']);
}
