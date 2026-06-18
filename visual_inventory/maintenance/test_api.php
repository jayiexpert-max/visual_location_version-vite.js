<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_only_guard();

header('Content-Type: text/html; charset=UTF-8');

require_once __DIR__ . '/../config/helpers.php';

$puid = $_GET['puid'] ?? 'TEST_PUID';
$url = pdservice_puid_url($puid);

echo "<h1>API Connectivity Test</h1>";
echo "<p><strong>Target URL:</strong> " . htmlspecialchars($url) . "</p>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HEADER, true);

echo "<h2>Executing Request...</h2>";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if ($response === false) {
    echo "<p style='color:red'><strong>cURL Error:</strong> " . htmlspecialchars($curlError) . "</p>";
} else {
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    echo "<p><strong>HTTP Status Code:</strong> $httpCode</p>";

    echo "<h3>Response Headers:</h3>";
    echo "<pre style='background:#f4f4f4; padding:10px;'>" . htmlspecialchars($headers) . "</pre>";

    echo "<h3>Response Body:</h3>";
    echo "<pre style='background:#f4f4f4; padding:10px;'>" . htmlspecialchars($body) . "</pre>";

    echo "<h3>JSON Decode Check:</h3>";
    $json = json_decode($body, true);
    if ($json) {
        echo "<pre style='color:green'>" . htmlspecialchars(print_r($json, true)) . "</pre>";
    } else {
        echo "<p style='color:red'>Failed to decode JSON (Error: " . htmlspecialchars(json_last_error_msg()) . ")</p>";
    }
}
?>
<hr>
<form method="GET">
    <label>Test another PUID:</label>
    <input type="text" name="puid" value="<?php echo htmlspecialchars($puid); ?>">
    <button type="submit">Test</button>
</form>
