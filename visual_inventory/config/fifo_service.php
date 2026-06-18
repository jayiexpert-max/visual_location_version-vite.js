<?php

require_once __DIR__ . '/app_settings_service.php';
require_once __DIR__ . '/inventory_api_service.php';

function fifo_normalize_puid(string $puid): string
{
    return preg_replace('/^(vl)/i', '', trim($puid));
}

function fifo_normalize_part(string $part): string
{
    return strtoupper(trim($part));
}

function fifo_get_issue_mode(mysqli $condb): string
{
    $mode = app_setting_get($condb, APP_SETTING_FIFO_ISSUE_MODE, FIFO_ISSUE_MODE_EXPIRATION);

    return fifo_issue_mode_is_valid($mode) ? $mode : FIFO_ISSUE_MODE_EXPIRATION;
}

function fifo_get_dummy_im_marker(mysqli $condb): string
{
    return app_setting_get($condb, APP_SETTING_FIFO_DUMMY_IM, 'DUMMYBATCH');
}

function fifo_is_dummy_batch(mysqli $condb, ?string $im): bool
{
    $im = trim((string) $im);
    if ($im === '') {
        return false;
    }

    $marker = fifo_get_dummy_im_marker($condb);
    if ($marker === '') {
        return false;
    }

    return stripos($im, $marker) !== false;
}

/**
 * SQL fragment: rows eligible for FIFO ordering (excludes dummy batch IM).
 */
function fifo_eligible_stock_sql(mysqli $condb): string
{
    $marker = fifo_get_dummy_im_marker($condb);
    $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $marker);

    return "QtyRemain > 0
        AND (StatusName IS NULL OR StatusName NOT IN ('Withdrawn', 'Empty'))
        AND (IM IS NULL OR IM = '' OR IM NOT LIKE '%{$escaped}%' ESCAPE '\\\\')";
}

function fifo_normalize_expiration(?string $exp): ?string
{
    $exp = trim((string) $exp);
    if ($exp === '' || $exp === '0000-00-00') {
        return null;
    }

    return $exp;
}

function fifo_near_expiry_days(): int
{
    return expiration_sync_near_days();
}

/** Not expired — eligible to issue (expired rolls are excluded from FIFO queue). */
function fifo_issueable_date_sql(): string
{
    return "(ExpirationDate IS NULL OR ExpirationDate = '' OR ExpirationDate = '0000-00-00' OR ExpirationDate >= CURDATE())";
}

function fifo_near_expiry_date_sql(): string
{
    $d = (int) fifo_near_expiry_days();

    return "(ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
        AND ExpirationDate >= CURDATE()
        AND ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL {$d} DAY))";
}

function fifo_fresh_date_sql(): string
{
    $d = (int) fifo_near_expiry_days();

    return "(ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
        AND ExpirationDate > DATE_ADD(CURDATE(), INTERVAL {$d} DAY))";
}

function fifo_expired_date_sql(): string
{
    return "(ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
        AND ExpirationDate < CURDATE())";
}

/**
 * expired | near | fresh | unknown (no date — treated like fresh for blocking rules).
 */
function fifo_expiry_tier(?string $expirationDate): string
{
    $exp = fifo_normalize_expiration($expirationDate);
    if ($exp === null) {
        return 'unknown';
    }

    $today = date('Y-m-d');
    if ($exp < $today) {
        return 'expired';
    }

    $cutoff = date('Y-m-d', strtotime('+' . fifo_near_expiry_days() . ' days'));
    if ($exp <= $cutoff) {
        return 'near';
    }

    return 'fresh';
}

/**
 * Recommend near-expiry first, then fresh; never expired.
 */
function fifo_order_by_clause(string $mode): string
{
    $near = fifo_near_expiry_date_sql();

    return "CASE
            WHEN {$near} THEN 0
            WHEN ExpirationDate IS NULL OR ExpirationDate = '' OR ExpirationDate = '0000-00-00' THEN 2
            ELSE 1
        END,
        ExpirationDate ASC,
        CASE WHEN IM IS NULL OR IM = '' THEN 1 ELSE 0 END,
        IM ASC,
        id ASC";
}

function fifo_format_expiration_display(?string $exp): string
{
    $exp = fifo_normalize_expiration($exp);
    if ($exp === null) {
        return '-';
    }

    return date('d/m/Y', strtotime($exp));
}

/**
 * @return array{puid: string, expiration_date: string, expiration_display: string, im: string, qty_remain: int, expiry_tier: string}
 */
function fifo_map_stock_row(array $row, bool $isRecommended = false): array
{
    $exp = $row['ExpirationDate'] ?? '';
    $tier = fifo_expiry_tier($exp);

    return [
        'puid' => (string) ($row['PUID'] ?? ''),
        'im' => (string) ($row['IM'] ?? ''),
        'expiration_date' => $exp,
        'expiration_display' => fifo_format_expiration_display($exp),
        'qty_remain' => (int) ($row['QtyRemain'] ?? 0),
        'loc_box' => (string) ($row['Loc_Box'] ?? ''),
        'expiry_tier' => $tier,
        'is_expired' => ($tier === 'expired'),
        'is_near_expiry' => ($tier === 'near'),
        'is_recommended' => $isRecommended,
    ];
}

function fifo_same_expiration_tier(?string $a, ?string $b): bool
{
    $a = fifo_normalize_expiration($a);
    $b = fifo_normalize_expiration($b);

    if ($a === null && $b === null) {
        return true;
    }

    return $a !== null && $a === $b;
}

/**
 * @return list<array<string, mixed>>
 */
function fifo_fetch_list(mysqli $condb, string $hanaPart, int $limit = 8): array
{
    $hanaPart = fifo_normalize_part($hanaPart);
    if ($hanaPart === '') {
        return [];
    }

    $mode = fifo_get_issue_mode($condb);
    $eligible = fifo_eligible_stock_sql($condb);
    $issueable = fifo_issueable_date_sql();
    $orderBy = fifo_order_by_clause($mode);

    $sql = "
        SELECT PUID, IM, ExpirationDate, QtyRemain, Loc_Box, StatusName
        FROM inventory_receive
        WHERE HanaPart = ?
          AND {$eligible}
          AND {$issueable}
        ORDER BY {$orderBy}
        LIMIT ?
    ";
    $stmt = $condb->prepare($sql);
    $stmt->bind_param('si', $hanaPart, $limit);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $list = [];
    foreach ($rows as $i => $row) {
        $mapped = fifo_map_stock_row($row, $i === 0);
        $mapped['fifo_mode'] = $mode;
        $list[] = $mapped;
    }

    return $list;
}

/**
 * @return list<array<string, mixed>>
 */
function fifo_fetch_expired_rolls(mysqli $condb, string $hanaPart, int $limit = 12): array
{
    $hanaPart = fifo_normalize_part($hanaPart);
    if ($hanaPart === '') {
        return [];
    }

    $eligible = fifo_eligible_stock_sql($condb);
    $expired = fifo_expired_date_sql();

    $sql = "
        SELECT PUID, IM, ExpirationDate, QtyRemain, Loc_Box
        FROM inventory_receive
        WHERE HanaPart = ?
          AND {$eligible}
          AND {$expired}
        ORDER BY ExpirationDate ASC, IM ASC, id ASC
        LIMIT ?
    ";
    $stmt = $condb->prepare($sql);
    $stmt->bind_param('si', $hanaPart, $limit);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $list = [];
    foreach ($rows as $row) {
        $mapped = fifo_map_stock_row($row);
        $list[] = $mapped;
    }

    return $list;
}

function fifo_has_near_expiry_stock(mysqli $condb, string $hanaPart): bool
{
    $hanaPart = fifo_normalize_part($hanaPart);
    if ($hanaPart === '') {
        return false;
    }

    $eligible = fifo_eligible_stock_sql($condb);
    $issueable = fifo_issueable_date_sql();
    $near = fifo_near_expiry_date_sql();

    $sql = "
        SELECT 1
        FROM inventory_receive
        WHERE HanaPart = ?
          AND {$eligible}
          AND {$issueable}
          AND {$near}
        LIMIT 1
    ";
    $stmt = $condb->prepare($sql);
    $stmt->bind_param('s', $hanaPart);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (bool) $row;
}

/**
 * @return array<string, mixed>|null
 */
function fifo_fetch_recommended_inventory_row(mysqli $condb, string $hanaPart): ?array
{
    $hanaPart = fifo_normalize_part($hanaPart);
    if ($hanaPart === '') {
        return null;
    }

    $mode = fifo_get_issue_mode($condb);
    $eligible = fifo_eligible_stock_sql($condb);
    $issueable = fifo_issueable_date_sql();
    $orderBy = fifo_order_by_clause($mode);

    $sql = "
        SELECT ir.PUID, ir.HanaPart, ir.QtyRemain, ir.IM,
               ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box, ir.ExpirationDate
        FROM inventory_receive ir
        WHERE ir.HanaPart = ?
          AND {$eligible}
          AND {$issueable}
        ORDER BY {$orderBy}
        LIMIT 1
    ";
    $stmt = $condb->prepare($sql);
    $stmt->bind_param('s', $hanaPart);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

/**
 * Stock that must be issued before the scanned PUID (issueable tiers only — skips expired).
 *
 * @return array<string, mixed>|null
 */
function fifo_find_older_stock(mysqli $condb, string $hanaPart, array $item): ?array
{
    if (fifo_is_dummy_batch($condb, $item['IM'] ?? '')) {
        return null;
    }

    $hanaPart = fifo_normalize_part($hanaPart);
    $eligible = fifo_eligible_stock_sql($condb);
    $issueable = fifo_issueable_date_sql();
    $near = fifo_near_expiry_date_sql();
    $tier = fifo_expiry_tier($item['ExpirationDate'] ?? null);

    if ($tier === 'expired') {
        return null;
    }

    if ($tier === 'fresh' || $tier === 'unknown') {
        $sql = "
            SELECT PUID, IM, ExpirationDate
            FROM inventory_receive
            WHERE HanaPart = ?
              AND {$eligible}
              AND {$issueable}
              AND {$near}
            ORDER BY ExpirationDate ASC, IM ASC, id ASC
            LIMIT 1
        ";
        $stmt = $condb->prepare($sql);
        $stmt->bind_param('s', $hanaPart);
        $stmt->execute();
        $older = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        return $older ?: null;
    }

    $sExp = fifo_normalize_expiration($item['ExpirationDate'] ?? null);
    if ($sExp === null) {
        return null;
    }

    $sql = "
        SELECT PUID, IM, ExpirationDate
        FROM inventory_receive
        WHERE HanaPart = ?
          AND {$eligible}
          AND {$issueable}
          AND {$near}
          AND ExpirationDate < ?
        ORDER BY ExpirationDate ASC, IM ASC, id ASC
        LIMIT 1
    ";
    $stmt = $condb->prepare($sql);
    $stmt->bind_param('ss', $hanaPart, $sExp);
    $stmt->execute();
    $older = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $older ?: null;
}

function fifo_format_violation_message(array $olderItem, string $mode, bool $isEN): string
{
    $olderExpDate = fifo_format_expiration_display($olderItem['ExpirationDate'] ?? null);
    $tier = fifo_expiry_tier($olderItem['ExpirationDate'] ?? null);

    if ($tier === 'near') {
        return $isEN
            ? "Issue near-expiry stock first: {$olderItem['PUID']} (EXP {$olderExpDate})"
            : "ต้องจ่ายม้วนใกล้หมดอายุก่อน: {$olderItem['PUID']} (หมดอายุ {$olderExpDate})";
    }

    return $isEN
        ? "FIFO violation! Use older stock first: {$olderItem['PUID']} (EXP {$olderExpDate})"
        : "ผิด FIFO! ต้องจ่ายของเก่าก่อน: {$olderItem['PUID']} (หมดอายุ {$olderExpDate})";
}

function fifo_format_expired_scan_message(string $puid, ?string $recommended, bool $isEN): string
{
    $puid = fifo_normalize_puid($puid);
    $rec = $recommended ? fifo_normalize_puid($recommended) : '';

    if ($rec !== '') {
        return $isEN
            ? "Cannot issue! PUID {$puid} is expired. Use {$rec} (not expired)."
            : "จ่ายไม่ได้! PUID {$puid} หมดอายุแล้ว — แนะนำ {$rec} (ยังไม่หมดอายุ)";
    }

    return $isEN
        ? "Cannot issue! PUID {$puid} is expired. No issueable stock found."
        : "จ่ายไม่ได้! PUID {$puid} หมดอายุแล้ว — ไม่พบม้วนที่จ่ายได้";
}

/**
 * @return array{expired_rolls: array, near_expiry_days: int}
 */
function fifo_expiry_context_for_part(mysqli $condb, string $hanaPart): array
{
    return [
        'expired_rolls' => fifo_fetch_expired_rolls($condb, $hanaPart),
        'near_expiry_days' => fifo_near_expiry_days(),
        'has_near_expiry' => fifo_has_near_expiry_stock($condb, $hanaPart),
    ];
}

/**
 * @param array{strict?: bool, is_en?: bool, picklist_operator_choice?: bool} $options
 *   strict=true blocks on warning (picklist, different expiry)
 *   picklist_operator_choice=true — same expiry date as FIFO head: operator picks any reel
 * @return array{status: string, message?: string, item?: array, fifo?: array, recommended_puid?: string|null, fifo_mode?: string, fifo_violation?: array}
 */
function fifo_validate_puid_for_part(mysqli $condb, string $hanaPart, string $puid, array $options = []): array
{
    $isEN = (bool) ($options['is_en'] ?? false);
    $strict = (bool) ($options['strict'] ?? false);
    $picklistOperatorChoice = !empty($options['picklist_operator_choice']);
    $hanaPart = fifo_normalize_part($hanaPart);
    $puid = fifo_normalize_puid($puid);
    $mode = fifo_get_issue_mode($condb);

    if ($hanaPart === '' || $puid === '') {
        return ['status' => 'error', 'message' => $isEN ? 'HanaPart and PUID are required' : 'ต้องระบุ HanaPart และ PUID'];
    }

    $fifo = fifo_fetch_list($condb, $hanaPart);
    $recommended = $fifo[0]['puid'] ?? null;

    $stmt = $condb->prepare("
        SELECT id, PUID, HanaPart, IM, QtyRemain, StatusName, ExpirationDate, Loc_Box
        FROM inventory_receive
        WHERE PUID = ?
        LIMIT 1
    ");
    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $item = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$item) {
        return [
            'status' => 'error',
            'message' => $isEN ? 'PUID not found in inventory history' : 'ไม่พบ PUID ในประวัติรับเข้า',
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
        ];
    }

    if (fifo_normalize_part($item['HanaPart']) !== $hanaPart) {
        return [
            'status' => 'error',
            'message' => ($isEN ? 'PUID belongs to ' : 'PUID นี้เป็นพาร์ท ') . $item['HanaPart'] . ($isEN ? ', not ' : ' ไม่ใช่ ') . $hanaPart,
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
        ];
    }

    $qtyRemain = (int) ($item['QtyRemain'] ?? 0);
    $statusName = $item['StatusName'] ?? '';
    $isReferenceOnly = ($qtyRemain <= 0 || in_array($statusName, ['Withdrawn', 'Empty'], true));

    if ($isReferenceOnly) {
        $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

        return [
            'status' => 'success',
            'mode' => 'reference',
            'message' => $isEN
                ? 'Old/empty PUID reference accepted for this HanaPart'
                : 'ยอมรับ PUID อ้างอิง (ม้วนเก่า/empty) สำหรับ HanaPart นี้',
            'item' => $item,
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
            'expired_rolls' => $expiryCtx['expired_rolls'],
            'near_expiry_days' => $expiryCtx['near_expiry_days'],
            'renewal_notice' => !empty($expiryCtx['expired_rolls']),
        ];
    }

    $scanTier = fifo_expiry_tier($item['ExpirationDate'] ?? null);
    if ($scanTier === 'expired') {
        $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

        return [
            'status' => 'error',
            'message' => fifo_format_expired_scan_message($puid, $recommended, $isEN),
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
            'expiry_tier' => 'expired',
            'expired_rolls' => $expiryCtx['expired_rolls'],
            'near_expiry_days' => $expiryCtx['near_expiry_days'],
            'renewal_required' => true,
        ];
    }

    if (fifo_is_dummy_batch($condb, $item['IM'] ?? '')) {
        $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

        return [
            'status' => 'success',
            'mode' => 'issue',
            'message' => $isEN
                ? 'PUID OK — Dummy Batch (FIFO bypass)'
                : 'PUID ใช้ได้ — Dummy Batch (ข้าม FIFO)',
            'item' => $item,
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
            'dummy_batch' => true,
            'expiry_tier' => $scanTier,
            'expired_rolls' => $expiryCtx['expired_rolls'],
            'near_expiry_days' => $expiryCtx['near_expiry_days'],
            'renewal_notice' => !empty($expiryCtx['expired_rolls']),
        ];
    }

    $recommendedExp = $fifo[0]['expiration_date'] ?? null;
    if (
        $picklistOperatorChoice
        && $recommended
        && fifo_same_expiration_tier($item['ExpirationDate'] ?? null, $recommendedExp)
    ) {
        $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

        return [
            'status' => 'success',
            'mode' => 'issue',
            'message' => $isEN
                ? 'PUID OK — same expiration date; operator may choose any reel for this date'
                : 'PUID ใช้ได้ — วันหมดอายุเดียวกัน ผู้จ่ายเลือกม้วนเองได้',
            'item' => $item,
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
            'same_expiration_tier' => true,
            'picklist_operator_choice' => true,
            'expiry_tier' => $scanTier,
            'expired_rolls' => $expiryCtx['expired_rolls'],
            'near_expiry_days' => $expiryCtx['near_expiry_days'],
            'renewal_notice' => !empty($expiryCtx['expired_rolls']),
        ];
    }

    $olderItem = fifo_find_older_stock($condb, $hanaPart, $item);
    if ($olderItem) {
        $blockPuid = fifo_normalize_puid((string) ($olderItem['PUID'] ?? ''));
        $blockRec = $blockPuid !== '' ? $blockPuid : $recommended;

        return [
            'status' => 'error',
            'message' => fifo_format_violation_message($olderItem, $mode, $isEN),
            'fifo' => $fifo,
            'recommended_puid' => $blockRec,
            'fifo_violation' => $olderItem,
            'fifo_mode' => $mode,
            'expiry_tier' => fifo_expiry_tier($item['ExpirationDate'] ?? null),
        ];
    }

    if ($recommended && strcasecmp($recommended, $puid) !== 0) {
        $recommendedExp = $fifo[0]['expiration_date'] ?? null;
        $sameExpTier = fifo_same_expiration_tier($item['ExpirationDate'] ?? null, $recommendedExp);

        if ($sameExpTier) {
            $recIm = $fifo[0]['im'] ?? '';
            $scanIm = trim((string) ($item['IM'] ?? ''));
            $imHint = $recIm !== '' ? " (IM {$recIm})" : '';

            $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

            return [
                'status' => 'success',
                'mode' => 'issue',
                'message' => $isEN
                    ? "PUID OK — same expiration; recommended by IM: {$recommended}{$imHint}"
                    : "PUID ใช้ได้ — วันหมดอายุเดียวกัน แนะนำตาม IM: {$recommended}{$imHint}",
                'item' => $item,
                'fifo' => $fifo,
                'recommended_puid' => $recommended,
                'fifo_mode' => $mode,
                'same_expiration_tier' => true,
                'expiry_tier' => $scanTier,
                'expired_rolls' => $expiryCtx['expired_rolls'],
                'near_expiry_days' => $expiryCtx['near_expiry_days'],
                'renewal_notice' => !empty($expiryCtx['expired_rolls']),
            ];
        }

        $warnMsg = $isEN
            ? "PUID valid but FIFO recommends {$recommended} first (earlier expiration)"
            : "PUID ใช้ได้ แต่ FIFO แนะนำให้จ่าย {$recommended} ก่อน (วันหมดอายุเร็วกว่า)";

        if ($strict) {
            $tier = fifo_expiry_tier($item['ExpirationDate'] ?? null);
            $strictMsg = ($tier === 'fresh' || $tier === 'unknown')
                ? ($isEN
                    ? "Cannot issue long-life stock yet. Issue near-expiry {$recommended} first."
                    : "ยังจ่ายม้วนอายุนานไม่ได้ — ต้องจ่ายม้วนใกล้หมดอายุ {$recommended} ก่อน")
                : ($isEN
                    ? "FIFO violation! Issue {$recommended} first (earlier expiration)"
                    : "ผิด FIFO! ต้องจ่าย {$recommended} ก่อน (วันหมดอายุเร็วกว่า)");

            return [
                'status' => 'error',
                'message' => $strictMsg,
                'fifo' => $fifo,
                'recommended_puid' => $recommended,
                'fifo_mode' => $mode,
                'expiry_tier' => $tier,
            ];
        }

        return [
            'status' => 'warning',
            'mode' => 'issue',
            'message' => $warnMsg,
            'item' => $item,
            'fifo' => $fifo,
            'recommended_puid' => $recommended,
            'fifo_mode' => $mode,
        ];
    }

    $expiryCtx = fifo_expiry_context_for_part($condb, $hanaPart);

    return [
        'status' => 'success',
        'mode' => 'issue',
        'message' => $isEN ? 'PUID OK — matches FIFO recommendation' : 'PUID ถูกต้อง — ตรง FIFO แนะนำ',
        'item' => $item,
        'fifo' => $fifo,
        'recommended_puid' => $recommended,
        'fifo_mode' => $mode,
        'expiry_tier' => $scanTier,
        'expired_rolls' => $expiryCtx['expired_rolls'],
        'near_expiry_days' => $expiryCtx['near_expiry_days'],
        'has_near_expiry' => $expiryCtx['has_near_expiry'],
        'renewal_notice' => !empty($expiryCtx['expired_rolls']),
    ];
}

/**
 * Validate PUID for picklist issue — block expired; strict FIFO only when expiry differs.
 * Same expiration date as FIFO recommendation: operator may choose any reel (no IM lock).
 *
 * @return array{ok: bool, message: string, data?: array}
 */
function fifo_validate_for_picklist_issue(mysqli $condb, string $puid, bool $isEN = false): array
{
    $puid = fifo_normalize_puid($puid);
    if ($puid === '') {
        return ['ok' => false, 'message' => $isEN ? 'PUID is required' : 'ต้องระบุ PUID'];
    }

    $stmt = $condb->prepare('SELECT HanaPart FROM inventory_receive WHERE PUID = ? LIMIT 1');
    $stmt->bind_param('s', $puid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || empty($row['HanaPart'])) {
        return ['ok' => true, 'message' => 'no_local_inventory_skip'];
    }

    $result = fifo_validate_puid_for_part($condb, (string) $row['HanaPart'], $puid, [
        'strict' => true,
        'is_en' => $isEN,
        'picklist_operator_choice' => true,
    ]);

    if ($result['status'] === 'success') {
        return [
            'ok' => true,
            'message' => $result['message'] ?? 'ok',
            'data' => $result,
            'renewal_notice' => !empty($result['renewal_notice']),
        ];
    }

    return [
        'ok' => false,
        'message' => $result['message'] ?? ($isEN ? 'FIFO validation failed' : 'ตรวจ FIFO ไม่ผ่าน'),
        'data' => $result,
        'renewal_required' => !empty($result['renewal_required']),
    ];
}
