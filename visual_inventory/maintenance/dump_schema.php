<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';

$tables_result = $condb->query("SHOW TABLES");
$schema = "";

while ($row = $tables_result->fetch_array()) {
    $table = $row[0];
    $schema .= "Table: $table\n";
    $schema .= str_repeat("-", 30) . "\n";
    
    $cols_result = $condb->query("SHOW COLUMNS FROM $table");
    while ($col = $cols_result->fetch_assoc()) {
        $schema .= "  " . $col['Field'] . " | " . $col['Type'] . "\n";
    }
    $schema .= "\n";
}

file_put_contents(__DIR__ . '/../scratch/schema.txt', $schema);
echo "Schema dumped to scratch/schema.txt";
