<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

$sql_commands = [
    // 1. Create ethernet_ios table
    "CREATE TABLE IF NOT EXISTS ethernet_ios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        port INT DEFAULT 80,
        controller_type VARCHAR(50) DEFAULT 'http',
        url_format VARCHAR(255) DEFAULT 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
        inputs INT DEFAULT 16,
        outputs INT DEFAULT 16,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )",

    // 2. Modify ethernet_ios table (for existing installations)
    "ALTER TABLE ethernet_ios ADD COLUMN inputs INT DEFAULT 16",
    "ALTER TABLE ethernet_ios ADD COLUMN outputs INT DEFAULT 16",

    // 3. Modify boxes table
    "ALTER TABLE boxes ADD COLUMN io_device_id INT DEFAULT NULL",
    "ALTER TABLE boxes ADD COLUMN io_output_pin INT DEFAULT NULL",

    // 3. Modify racks table
    "ALTER TABLE racks ADD COLUMN io_device_id INT DEFAULT NULL",
    "ALTER TABLE racks ADD COLUMN io_red_pin INT DEFAULT NULL",
    "ALTER TABLE racks ADD COLUMN io_yellow_pin INT DEFAULT NULL",
    "ALTER TABLE racks ADD COLUMN io_green_pin INT DEFAULT NULL",
    "ALTER TABLE racks ADD COLUMN io_buzzer_pin INT DEFAULT NULL"
];

foreach ($sql_commands as $sql) {
    if ($condb->query($sql)) {
        echo "Success: $sql\n";
    } else {
        // Ignore duplicate column errors
        if ($condb->errno != 1060) {
            echo "Error: " . $condb->error . " \nSQL: $sql\n";
        } else {
            echo "Column already exists: $sql\n";
        }
    }
}
echo "Migration complete.\n";
