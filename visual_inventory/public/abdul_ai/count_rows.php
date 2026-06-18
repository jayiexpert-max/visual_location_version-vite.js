<?php
require 'includes/functions.php';
$pdo = getDB();
$tables = ['inventory_receive', 'products', 'v_inventory_location'];
foreach($tables as $t) {
    $stmt = $pdo->query("SELECT COUNT(*) FROM $t");
    echo "ตาราง $t: มีข้อมูล " . $stmt->fetchColumn() . " แถว\n";
}
