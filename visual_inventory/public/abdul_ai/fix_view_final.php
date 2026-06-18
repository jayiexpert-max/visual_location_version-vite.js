<?php
require 'includes/functions.php';
$pdo = getDB();

try {
    $dbName = $_ENV['DB_NAME'];
    echo "กำลังปรับปรุง View ใน $dbName ให้มองหาตารางตัวเอง...\n";

    $pdo->exec("DROP VIEW IF EXISTS v_inventory_location");
    
    $sql = "CREATE VIEW v_inventory_location AS 
            SELECT 
                p.id AS product_id, p.name AS part_name, p.qty AS current_qty, p.remark AS product_remark,
                sl.id AS slot_id, sl.slot_no AS slot_no, b.id AS box_id, b.box_code AS box_code,
                l.id AS level_id, l.level_no AS level_no, r.id AS rack_id, r.name AS rack_name,
                (SELECT MIN(ir.ExpirationDate) FROM inventory_receive ir WHERE ir.HanaPart = p.name AND ir.QtyRemain > 0) AS earliest_expiration
            FROM products p
            JOIN slots sl ON p.slot_id = sl.id
            JOIN boxes b ON sl.box_id = b.id
            JOIN levels l ON b.level_id = l.id
            JOIN racks r ON l.rack_id = r.id";
    
    $pdo->exec($sql);
    echo "✅ สำเร็จ! ตอนนี้ View จะมองหาเฉพาะข้อมูลใน $dbName เท่านั้นครับ\n";

    // เช็คจำนวนอีกรอบ
    $stmt = $pdo->query("SELECT COUNT(*) FROM v_inventory_location");
    echo "ตาราง v_inventory_location: เหลือข้อมูล " . $stmt->fetchColumn() . " แถว\n";

} catch (Exception $e) {
    echo "❌ ผิดพลาด: " . $e->getMessage() . "\n";
}
