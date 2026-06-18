<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();
require_once __DIR__ . '/../config/condb.php';
$res = $condb->query("DESCRIBE inventory_receive");
while($row = $res->fetch_assoc()){
    print_r($row);
}
