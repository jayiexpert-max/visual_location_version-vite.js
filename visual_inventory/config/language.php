<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set default language
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'th';
}

// Handle language switch
if (isset($_GET['lang'])) {
    $lang = $_GET['lang'];
    if (in_array($lang, ['en', 'th'])) {
        $_SESSION['lang'] = $lang;
    }
    // Redirect back to the same page without the lang parameter
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    header("Location: $uri");
    exit;
}

$lang_code = $_SESSION['lang'];
$lang_file = __DIR__ . "/../languages/{$lang_code}.php";

if (file_exists($lang_file)) {
    $translations = require($lang_file);
} else {
    $translations = require(__DIR__ . "/../languages/th.php");
}

function __($key)
{
    global $translations;
    return $translations[$key] ?? $key;
}
?>