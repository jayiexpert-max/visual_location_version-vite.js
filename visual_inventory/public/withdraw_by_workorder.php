<?php
// Legacy URL — redirect to renamed page
$qs = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
    ? '?' . $_SERVER['QUERY_STRING']
    : '';
header('Location: wo_material_calc' . $qs, true, 301);
exit;
