<?php
/**
 * ทดสอบ Tower Light เขียวที่ Rack 3 (device IO1 / pin จาก Admin)
 * Usage: php scripts/test_tower_green.php [rack_id]
 */
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/io_device_service.php';

$rackId = (int) ($argv[1] ?? 3);
$rack = $condb->query("SELECT id, name, io_device_id, io_green_pin, io_red_pin FROM racks WHERE id = {$rackId}")->fetch_assoc();
if (!$rack || empty($rack['io_device_id'])) {
    fwrite(STDERR, "Rack {$rackId} has no IO device.\n");
    exit(1);
}

$device = io_fetch_device($condb, (int) $rack['io_device_id']);
$pin = (int) ($rack['io_green_pin'] ?? 0);
echo "Tower test Rack {$rack['name']}: device {$device['name']} @ {$device['ip_address']}:{$device['port']} green pin {$pin}\n";
echo 'IO_TOWER_ONLY=' . (io_tower_only() ? 'true' : 'false') . "\n\n";

if ($pin <= 0) {
    fwrite(STDERR, "Green pin not set in Admin.\n");
    exit(1);
}

$on = io_send_single_pin($device, $pin, 1);
echo "ON:  " . json_encode($on, JSON_UNESCAPED_UNICODE) . "\n";
sleep(2);
$off = io_send_single_pin($device, $pin, 0);
echo "OFF: " . json_encode($off, JSON_UNESCAPED_UNICODE) . "\n";
