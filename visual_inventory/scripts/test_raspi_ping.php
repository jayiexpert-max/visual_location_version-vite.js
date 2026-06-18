<?php
require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/io_device_service.php';

$device = io_fetch_device($condb, 2);
if (!$device) {
    $device = io_fetch_device($condb, 1);
}
if (!$device) {
    fwrite(STDERR, "No ethernet_ios device found.\n");
    exit(1);
}

echo "Device: {$device['name']} {$device['ip_address']}:{$device['port']} ({$device['controller_type']})\n";

$result = io_send_single_pin($device, 1, 1);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
