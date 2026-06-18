<?php
/**
 * Public proxy for box layout JSON (TV kiosk key bypass + session auth).
 */
require_once __DIR__ . '/../config/tv_kiosk_auth.php';
public_display_try_bypass();
tv_kiosk_try_bypass();
require_once __DIR__ . '/../api/get_box_layout.php';
