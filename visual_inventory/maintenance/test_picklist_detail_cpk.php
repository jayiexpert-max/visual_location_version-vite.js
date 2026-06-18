<?php

require_once __DIR__ . '/../config/env_loader.php';
require_once __DIR__ . '/../config/cpk_service.php';

session_start();

$picklistId = $argv[1] ?? 'MPL26231113';

$uid = cpk_public_uid(true);
echo 'PublicUID: ' . ($uid['ok'] ? $uid['public_uid'] : $uid['message']) . PHP_EOL . PHP_EOL;

$tests = [
    ['label' => 'RequiredOnly=true', 'body' => ['PicklistID' => $picklistId, 'RequiredOnly' => true]],
    ['label' => 'no RequiredOnly', 'body' => ['PicklistID' => $picklistId]],
];

echo 'URL: ' . cpk_path('GetPicklistDetail') . PHP_EOL . PHP_EOL;

foreach ($tests as $test) {
    $result = cpk_post_authenticated('GetPicklistDetail', $test['body']);
    echo '--- ' . $test['label'] . ' ---' . PHP_EOL;
    echo 'HTTP ok=' . ($result['ok'] ? '1' : '0') . PHP_EOL;
    echo 'Message: ' . ($result['cpk_message'] ?? $result['error'] ?? '') . PHP_EOL;
    $data = is_array($result['data']) ? $result['data'] : [];
    $lineCount = isset($data['Lines']) && is_array($data['Lines']) ? count($data['Lines']) : -1;
    echo 'Status=' . ($data['Status'] ?? '') . ' Lines=' . $lineCount . PHP_EOL;
    if ($lineCount > 0) {
        echo 'First line: ' . json_encode($data['Lines'][0], JSON_UNESCAPED_UNICODE) . PHP_EOL;
    }
    echo PHP_EOL;
}

$open = cpk_post_authenticated('GetOpenPicklists', []);
echo '--- GetOpenPicklists ---' . PHP_EOL;
echo 'ok=' . ($open['ok'] ? '1' : '0') . ' msg=' . ($open['cpk_message'] ?? '') . PHP_EOL;
$data = is_array($open['data']) ? $open['data'] : [];
foreach (['Picklists', 'OpenPicklists', 'Items', 'List'] as $key) {
    if (!empty($data[$key]) && is_array($data[$key])) {
        echo $key . ' count=' . count($data[$key]) . PHP_EOL;
        foreach ($data[$key] as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = $row['PicklistID'] ?? $row['Picklist#'] ?? $row['Picklist'] ?? '';
            if ((string) $id === $picklistId || str_contains(json_encode($row), $picklistId)) {
                echo 'MATCH: ' . json_encode($row, JSON_UNESCAPED_UNICODE) . PHP_EOL;
            }
        }
    }
}
