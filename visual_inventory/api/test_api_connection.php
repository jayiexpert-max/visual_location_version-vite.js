<?php
require_once __DIR__ . '/../config/dev_guard.php';
dev_guard_or_exit(true);
require __DIR__ . '/../maintenance/test_api_connection.php';
