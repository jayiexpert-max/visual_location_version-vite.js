<?php
/**
 * One-off: point ethernet_ios #1 at Raspi WiFi gateway.
 * Usage: php scripts/update_raspi_gateway.php [ip]
 */
require_once __DIR__ . '/../config/condb.php';

$ip = $argv[1] ?? '192.168.113.18';
$port = 8080;

$stmt = $condb->prepare("
    UPDATE ethernet_ios
    SET ip_address = ?,
        port = ?,
        controller_type = 'raspi',
        url_format = 'http://{IP}:{PORT}/api/io/highlight'
    WHERE controller_type = 'raspi' OR id IN (SELECT id FROM (SELECT id FROM ethernet_ios ORDER BY id LIMIT 1) t)
");
$stmt->bind_param('si', $ip, $port);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();

// Fallback: update all rows still pointing at Modbus IO IP
$stmt2 = $condb->prepare("
    UPDATE ethernet_ios
    SET ip_address = ?,
        port = ?,
        controller_type = 'raspi',
        url_format = 'http://{IP}:{PORT}/api/io/highlight'
    WHERE ip_address IN ('192.168.0.244', '192.168.113.18') OR name = 'IO1'
");
$stmt2->bind_param('si', $ip, $port);
$stmt2->execute();
$affected += $stmt2->affected_rows;

echo "Updated rows: " . $affected . PHP_EOL;

$res = $condb->query('SELECT id, name, ip_address, port, controller_type FROM ethernet_ios ORDER BY id');
while ($row = $res->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
