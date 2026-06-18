<?php

require_once __DIR__ . '/helpers.php';

return [
    'host' => env('MAIL_HOST', ''),
    'port' => (int) (env('MAIL_PORT', '587') ?? 587),
    'username' => env('MAIL_USERNAME', ''),
    'password' => env('MAIL_PASSWORD', ''),
    'from_email' => env('MAIL_FROM_EMAIL', env('MAIL_USERNAME', '')),
    'from_name' => env('MAIL_FROM_NAME', 'Visual Location Management'),
];
