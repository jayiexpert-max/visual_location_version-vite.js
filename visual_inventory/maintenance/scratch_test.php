<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard();

$_GET['puid'] = 'VL12345';
require __DIR__ . '/../api/get_inventory_from_api.php';
