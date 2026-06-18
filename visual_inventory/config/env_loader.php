<?php

/**
 * Simple .env loader
 */
function loadEnv($path)
{
    if (!file_exists($path)) {
        return false;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        if (strpos($line, '=') === false) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
            $quote = $value[0];
            if (str_ends_with($value, $quote) && strlen($value) > 1) {
                $value = substr($value, 1, -1);
            }
        } elseif (($commentPos = strpos($value, ' #')) !== false) {
            $value = trim(substr($value, 0, $commentPos));
        }

        // .env always wins — override empty system env (common on XAMPP / Apache)
        putenv(sprintf('%s=%s', $name, $value));
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
    return true;
}

// Load .env relative to this file's directory (assuming it's in /config/)
loadEnv(__DIR__ . '/../.env');
