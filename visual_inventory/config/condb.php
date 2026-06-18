<?php

/**
 * Database bootstrap — require this file to expose $condb (mysqli) in the caller's scope.
 *
 * @var mysqli $condb Available in any file that require/include's this script.
 */

require_once __DIR__ . '/database.php';

if (!function_exists('condb_connection')) {
    /**
     * Shared MySQLi connection (singleton).
     */
    function condb_connection(): mysqli
    {
        static $instance = null;
        if (!$instance instanceof mysqli) {
            $instance = db_mysqli();
        }

        return $instance;
    }
}

/** @var mysqli $condb */
$condb = condb_connection();
