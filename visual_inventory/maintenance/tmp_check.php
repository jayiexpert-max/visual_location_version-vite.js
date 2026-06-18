<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require __DIR__ . '/../config/condb.php';
$res = $condb->query("DESCRIBE users");
while($row = $res->fetch_assoc()) {
    if($row['Field'] == 'role') {
        print_r($row);
    }
}
?>
