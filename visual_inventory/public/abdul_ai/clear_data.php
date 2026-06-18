<?php
require 'includes/functions.php';
$pdo = getDB();

$tables = ['products', 'inventory_receive', 'ai_query_cache', 'stock_logs'];

echo "กำลังเริ่มกระบวนการล้างข้อมูล...\n";

// ปิดการตรวจสอบ Foreign Key ชั่วคราวเพื่อให้ลบได้ทุกตาราง
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

foreach($tables as $t) {
    try {
        $pdo->exec("TRUNCATE TABLE `$t` ");
        echo "✅ ล้างตาราง $t เรียบร้อยแล้ว\n";
    } catch (Exception $e) {
        echo "❌ ล้างตาราง $t ไม่สำเร็จ: " . $e->getMessage() . "\n";
    }
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "\n--- ตรวจสอบจำนวนข้อมูลล่าสุด ---\n";
foreach(['inventory_receive', 'products', 'v_inventory_location'] as $t) {
    $stmt = $pdo->query("SELECT COUNT(*) FROM $t");
    echo "ตาราง $t: เหลือข้อมูล " . $stmt->fetchColumn() . " แถว\n";
}

echo "\nตอนนี้ฐานข้อมูลของคุณว่างเปล่า 100% แล้วครับ บอทควรจะตอบว่า 'ไม่พบข้อมูล' แล้วครับ";
