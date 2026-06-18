<?php

require_once __DIR__ . '/../config/maintenance_guard.php';
require_once __DIR__ . '/../config/cpk_service.php';

maintenance_cpk_test_guard();

header('Content-Type: text/html; charset=UTF-8');

$tests = [];
$keyword = trim($_GET['res_no'] ?? '');

$versionResult = cpk_get('GetVersion');
$tests[] = [
    'name' => 'GetVersion',
    'ok' => $versionResult['http_code'] >= 200 && $versionResult['http_code'] < 300,
    'detail' => is_string($versionResult['data'])
        ? $versionResult['data']
        : ($versionResult['raw'] ?: ($versionResult['error'] ?? 'failed')),
];

if ($keyword !== '') {
    $resResult = cpk_get('GET_RESNoInfo', $keyword);
    $tests[] = [
        'name' => 'GET_RESNoInfo',
        'ok' => $resResult['ok'],
        'detail' => $resResult['cpk_message'] ?? $resResult['error'] ?? 'OK',
    ];
}

$publicUidTest = null;
if (cpk_mcid() !== null) {
    $uid = cpk_public_uid(true);
    $publicUidTest = [
        'ok' => $uid['ok'],
        'detail' => $uid['ok']
            ? ('PublicUID: ' . substr($uid['public_uid'], 0, 8) . '… expires ' . ($_SESSION['cpk_public_uid_expires'] ?? '?'))
            : $uid['message'],
    ];
} else {
    $publicUidTest = [
        'ok' => false,
        'detail' => cpk_mcid_missing_message(),
    ];
}
$tests[] = array_merge(['name' => 'GetPublicUID'], $publicUidTest);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CPK Service Test</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 720px; }
        table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
        th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
        .ok { color: #15803d; }
        .fail { color: #b91c1c; }
        form { margin-top: 1.5rem; }
        input[type=text] { width: 100%; max-width: 320px; padding: 0.4rem; }
    </style>
</head>
<body>
    <h1>CPK Service Test</h1>
    <p>Base URL: <code><?= htmlspecialchars(cpk_base_url()) ?></code>
        (legacy: <?= cpk_use_legacy_url() ? 'yes' : 'no' ?>)</p>
    <p>McID configured: <?= cpk_mcid() !== null ? 'yes' : '<strong>no — set CPK_MC_ID in .env</strong>' ?></p>
    <p>StationKey configured: <?= cpk_station_key() !== null ? 'yes' : 'no' ?></p>

    <table>
        <thead>
            <tr><th>Test</th><th>Result</th><th>Detail</th></tr>
        </thead>
        <tbody>
            <?php foreach ($tests as $t): ?>
            <tr>
                <td><?= htmlspecialchars($t['name']) ?></td>
                <td class="<?= $t['ok'] ? 'ok' : 'fail' ?>"><?= $t['ok'] ? 'PASS' : 'FAIL' ?></td>
                <td><?= htmlspecialchars((string) $t['detail']) ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <form method="get">
        <label>RES No (optional GET_RESNoInfo test)</label><br>
        <input type="text" name="res_no" value="<?= htmlspecialchars($keyword) ?>" placeholder="0010012345">
        <button type="submit">Run with RES No</button>
    </form>

    <p><a href="../public/index.php">Back to app</a></p>
</body>
</html>
