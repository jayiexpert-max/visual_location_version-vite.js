<?php
require_once __DIR__ . '/../config/dev_guard.php';
dev_guard_or_exit();
require __DIR__ . '/../maintenance/test_api.php';
