<?php
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/io_device_service.php';

echo "=== .env (Raspi) ===\n";
echo 'RASPI_IO_KEY=' . (io_raspi_io_key() !== '' ? '(set, len ' . strlen(io_raspi_io_key()) . ')' : '(empty)') . "\n";
echo 'IO_HIGHLIGHT_DURATION_SEC=' . io_highlight_duration_sec() . "\n\n";

echo "=== ethernet_ios (Admin → จัดการ Ethernet IO) ===\n";
$res = $condb->query('SELECT id, name, ip_address, port, controller_type, url_format, inputs, outputs FROM ethernet_ios ORDER BY id');
while ($row = $res->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
}

echo "\n=== racks (Admin → IO Device + pins) ===\n";
$res = $condb->query('SELECT id, name, io_device_id, io_red_pin, io_yellow_pin, io_green_pin, io_buzzer_pin FROM racks ORDER BY name');
while ($row = $res->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
}

echo "\n=== boxes with IO mapped ===\n";
$res = $condb->query("
    SELECT b.id, b.box_code, b.io_device_id, b.io_output_pin, r.name AS rack_name, l.level_no
    FROM boxes b
    JOIN levels l ON b.level_id = l.id
    JOIN racks r ON l.rack_id = r.id
    WHERE b.io_device_id IS NOT NULL AND b.io_output_pin IS NOT NULL AND b.io_output_pin > 0
    ORDER BY r.name, l.level_no, b.box_code
    LIMIT 50
");
$count = 0;
while ($row = $res->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    $count++;
}
if ($count === 0) {
    echo "(none — ยังไม่ map IO ที่ Box)\n";
}

echo "\n=== boxes ชี้ io_device_id ที่ไม่มีในระบบ ===\n";
$res = $condb->query("
    SELECT b.id, b.box_code, b.io_device_id, b.io_output_pin, r.name AS rack_name
    FROM boxes b
    JOIN levels l ON b.level_id = l.id
    JOIN racks r ON l.rack_id = r.id
    LEFT JOIN ethernet_ios e ON e.id = b.io_device_id
    WHERE b.io_device_id IS NOT NULL AND b.io_device_id > 0 AND e.id IS NULL
");
$orphan = 0;
while ($row = $res->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    $orphan++;
}
if ($orphan === 0) {
    echo "(none)\n";
}

require_once __DIR__ . '/../config/io_device_service.php';
