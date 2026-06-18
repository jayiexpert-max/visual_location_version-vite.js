<?php

require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/helpers.php';

function db_apply_timezone(): void
{
    static $applied = false;
    if ($applied) {
        return;
    }

    $timezone = env('TIMEZONE', 'Asia/Bangkok') ?? 'Asia/Bangkok';
    putenv("TZ=$timezone");
    date_default_timezone_set($timezone);
    ini_set('date.timezone', $timezone);
    $applied = true;
}

function db_mysqli(): mysqli
{
    static $connection = null;

    if ($connection instanceof mysqli) {
        return $connection;
    }

    db_apply_timezone();

    $host = env('DB_HOST', 'localhost') ?? 'localhost';
    $name = env('DB_NAME', 'visual_inventory_db') ?? 'visual_inventory_db';
    $user = env('DB_USER', 'root') ?? 'root';
    $pass = env('DB_PASS', '') ?? '';
    $charset = env('DB_CHARSET', 'utf8mb4') ?? 'utf8mb4';

    $connection = new mysqli($host, $user, $pass, $name);

    if ($connection->connect_error) {
        die('Database connection failed: ' . $connection->connect_error);
    }

    $connection->set_charset($charset);

    return $connection;
}

function db_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    db_apply_timezone();

    $host = env('DB_HOST', 'localhost') ?? 'localhost';
    $name = env('DB_NAME', 'visual_inventory_db') ?? 'visual_inventory_db';
    $user = env('DB_USER', 'root') ?? 'root';
    $pass = env('DB_PASS', '') ?? '';
    $charset = env('DB_CHARSET', 'utf8mb4') ?? 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$name;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        throw new PDOException($e->getMessage(), (int) $e->getCode());
    }

    return $pdo;
}
