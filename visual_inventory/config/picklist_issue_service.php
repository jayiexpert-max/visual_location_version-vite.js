<?php

require_once __DIR__ . '/cpk_service.php';

function picklist_issue_is_en(): bool
{
    return (($_SESSION['lang'] ?? 'th') === 'en');
}

/**
 * @param array<string, string|callable> $args placeholder => value
 */
function picklist_issue_msg(bool $isEN, string $key, array $args = []): string
{
    $catalog = [
        'puid_required' => ['Scan a PUID first.', 'กรุณาสแกน PUID'],
        'picklist_required' => ['Select a picklist first.', 'กรุณาเลือก Picklist'],
        'operator_required' => ['Operator is required.', 'ต้องระบุผู้ดำเนินการ'],
        'ids_required' => ['Picklist and PUID are required.', 'ต้องระบุ Picklist และ PUID'],
        'puid_not_found' => ['PUID not found in warehouse.', 'ไม่พบ PUID ในคลัง'],
        'no_stock' => ['No stock — reel empty or withdrawn.', 'ไม่มีสต็อก — ม้วนว่างหรือเบิกแล้ว'],
        'part_not_on_picklist' => ['Part not on this picklist: %s', 'พาร์ทไม่อยู่ใน Picklist: %s'],
        'part_done' => ['Part fully issued: %s', 'พาร์ทจ่ายครบแล้ว: %s'],
        'issue_failed' => ['Issue failed.', 'จ่ายไม่สำเร็จ'],
        'cpk_rejected' => ['CPK rejected — check PUID and picklist.', 'CPK ปฏิเสธ — ตรวจ PUID และ Picklist'],
        'already_issued' => ['Already issued to this picklist.', 'จ่ายกับ Picklist นี้แล้ว'],
        'network_error' => ['CPK connection failed.', 'เชื่อมต่อ CPK ไม่ได้'],
    ];

    $pair = $catalog[$key] ?? ['Issue failed.', 'จ่ายไม่สำเร็จ'];
    $text = $isEN ? $pair[0] : $pair[1];

    foreach ($args as $value) {
        $text = preg_replace('/%s/', (string) $value, $text, 1) ?? $text;
    }

    return $text;
}

/**
 * Map raw CPK / API text to concise TH/EN (session language).
 */
function picklist_localize_issue_message(?string $message, ?bool $isEN = null): string
{
    $isEN = $isEN ?? picklist_issue_is_en();
    $raw = trim((string) $message);
    if ($raw === '') {
        return picklist_issue_msg($isEN, 'issue_failed');
    }

    $lower = strtolower($raw);

    if (cpk_is_already_issued_message($raw)) {
        return picklist_issue_msg($isEN, 'already_issued');
    }

    $rules = [
        ['not found in inventory', 'puid_not_found'],
        ['ไม่พบ puid', 'puid_not_found'],
        ['puid not found', 'puid_not_found'],
        ['not found in local stock', 'no_stock'],
        ['already withdrawn', 'no_stock'],
        ['no issueable stock', 'no_stock'],
        ['not on picklist', 'cpk_rejected'],
        ['not in picklist', 'cpk_rejected'],
        ['no material', 'cpk_rejected'],
        ['no matching material', 'cpk_rejected'],
        ['material not found', 'cpk_rejected'],
        ['does not belong', 'cpk_rejected'],
        ['timed out', 'network_error'],
        ['timeout', 'network_error'],
        ['connection', 'network_error'],
    ];

    foreach ($rules as [$needle, $key]) {
        if (strpos($lower, $needle) !== false) {
            return picklist_issue_msg($isEN, $key);
        }
    }

    if (strpos($raw, 'ไม่ใช่') !== false || strpos($raw, 'เป็นพาร์ท') !== false) {
        return $raw;
    }
    if (stripos($raw, 'FIFO') !== false || strpos($raw, 'หมดอายุ') !== false || stripos($raw, 'expired') !== false) {
        return $raw;
    }

    if (!$isEN && preg_match('/^[A-Za-z0-9\s\.,!?\-_():]+$/', $raw)) {
        return picklist_issue_msg($isEN, 'cpk_rejected');
    }

    return $raw;
}

/**
 * @return array{ok: bool, message?: string, hana_part?: string}
 */
function picklist_validate_puid_for_open_lines(mysqli $condb, string $puid, array $openLines, ?bool $isEN = null): array
{
    require_once __DIR__ . '/inventory_api_service.php';
    require_once __DIR__ . '/cpk_service.php';

    $isEN = $isEN ?? picklist_issue_is_en();
    $puid = cpk_normalize_puid_input(trim($puid));
    if ($puid === '') {
        return ['ok' => false, 'message' => picklist_issue_msg($isEN, 'puid_required')];
    }

    $inv = inventory_fetch_by_puid($condb, $puid, '', []);
    if (($inv['status'] ?? '') !== 'success' || empty($inv['data'])) {
        return ['ok' => false, 'message' => picklist_issue_msg($isEN, 'puid_not_found')];
    }

    $data = $inv['data'];
    $hanaPart = trim((string) ($data['HanaPart'] ?? ''));
    $remain = (int) ($data['QtyRemain'] ?? 0);
    $status = (string) ($data['StatusName'] ?? '');

    if ($hanaPart === '' || $remain <= 0 || in_array($status, ['Withdrawn', 'Empty'], true)) {
        return ['ok' => false, 'message' => picklist_issue_msg($isEN, 'no_stock')];
    }

    $openParts = [];
    $allParts = [];
    foreach ($openLines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $part = trim((string) (
            $line['PartNumber'] ?? $line['HanaPart'] ?? $line['MatNumber'] ?? $line['Material'] ?? ''
        ));
        if ($part === '') {
            continue;
        }
        $allParts[$part] = true;
        $req = (float) ($line['QtyRequired'] ?? $line['RequiredQty'] ?? $line['ReqQty'] ?? $line['Qty'] ?? 0);
        if ($req <= 0 && !empty($line['SAP_Info'])) {
            if (preg_match('/_\{([0-9]+(?:[.,][0-9]+)?)\}\s*$/', (string) $line['SAP_Info'], $m)) {
                $req = (float) str_replace(',', '.', $m[1]);
            }
        }
        $issued = trim((string) (
            $line['PUID'] ?? $line['IssuedPUID'] ?? $line['PUIDIssued'] ?? $line['Issued_PUID'] ?? ''
        ));
        $isOpen = $req > 0 && (strlen($issued) < 4 || strtolower($issued) === 'x');
        if ($isOpen) {
            $openParts[$part] = true;
        }
    }

    if (!isset($openParts[$hanaPart])) {
        if (isset($allParts[$hanaPart])) {
            return ['ok' => false, 'message' => picklist_issue_msg($isEN, 'part_done', [$hanaPart])];
        }

        return ['ok' => false, 'message' => picklist_issue_msg($isEN, 'part_not_on_picklist', [$hanaPart])];
    }

    return ['ok' => true, 'hana_part' => $hanaPart];
}
