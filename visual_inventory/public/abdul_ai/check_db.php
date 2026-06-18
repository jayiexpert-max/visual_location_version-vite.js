<?php
require 'includes/functions.php';

try {
    $pdo = getDB();
    $dbName = $_ENV['DB_NAME'];
    echo "เชื่อมต่อเซิร์ฟเวอร์สำเร็จ! กำลังเช็คฐานข้อมูล: $dbName\n";

    // เช็คว่ามีตารางไหม
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo "⚠️ คำเตือน: ฐานข้อมูล '$dbName' บนเซิร์ฟเวอร์นี้ว่างเปล่า (ไม่มีตารางเลย)\n";
    } else {
        echo "พบตารางในฐานข้อมูล " . count($tables) . " ตาราง\n";
        foreach($tables as $t) echo "- $t\n";
    }

} catch (Exception $e) {
    echo "❌ เข้าฐานข้อมูลไม่ได้: " . $e->getMessage() . "\n";
}
