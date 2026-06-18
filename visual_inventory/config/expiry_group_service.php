<?php

function expiry_group_key(array $row): string
{
    $hana = trim((string) ($row['HanaPart'] ?? ''));
    $im = trim((string) ($row['IM'] ?? ''));

    return $hana . "\0" . $im;
}

function expiry_earliest_date(array $dates): ?string
{
    $dates = array_values(array_filter($dates, static function ($d): bool {
        return $d !== null && trim((string) $d) !== '';
    }));

    if ($dates === []) {
        return null;
    }

    usort($dates, static function ($a, $b): int {
        return strtotime((string) $a) <=> strtotime((string) $b);
    });

    return (string) $dates[0];
}

/**
 * @param list<array<string, mixed>> $rows
 * @return list<array<string, mixed>>
 */
function expiry_group_rows(array $rows): array
{
    $groups = [];

    foreach ($rows as $row) {
        $key = expiry_group_key($row);
        if (!isset($groups[$key])) {
            $groups[$key] = [
                'HanaPart' => trim((string) ($row['HanaPart'] ?? '')),
                'IM' => trim((string) ($row['IM'] ?? '')),
                'total_qty' => 0,
                'puid_count' => 0,
                'lots' => [],
                'expiration_dates' => [],
                'room_dates' => [],
            ];
        }

        $groups[$key]['total_qty'] += (int) ($row['QtyRemain'] ?? 0);
        $groups[$key]['puid_count']++;

        $lot = trim((string) ($row['LotNo'] ?? ''));
        if ($lot !== '') {
            $groups[$key]['lots'][$lot] = true;
        }

        if (!empty($row['ExpirationDate'])) {
            $groups[$key]['expiration_dates'][] = (string) $row['ExpirationDate'];
        }
        if (!empty($row['ExpireDate_RoomTemp'])) {
            $groups[$key]['room_dates'][] = (string) $row['ExpireDate_RoomTemp'];
        }
    }

    $grouped = array_values($groups);

    usort($grouped, static function (array $a, array $b): int {
        $dateA = expiry_earliest_date($a['expiration_dates'] ?? []) ?? '9999-12-31';
        $dateB = expiry_earliest_date($b['expiration_dates'] ?? []) ?? '9999-12-31';
        $cmp = strtotime($dateA) <=> strtotime($dateB);
        if ($cmp !== 0) {
            return $cmp;
        }

        return strcmp((string) $a['HanaPart'], (string) $b['HanaPart']);
    });

    return $grouped;
}

function expiry_format_lots(array $lotsMap, int $maxShown = 3): string
{
    $lots = array_keys($lotsMap);
    if ($lots === []) {
        return '-';
    }

    sort($lots, SORT_STRING);
    if (count($lots) <= $maxShown) {
        return implode(', ', $lots);
    }

    $shown = array_slice($lots, 0, $maxShown);

    return implode(', ', $shown) . ' (+' . (count($lots) - $maxShown) . ' more)';
}

function expiry_format_lots_csv(?string $lotsRaw, int $maxShown = 5): string
{
    if ($lotsRaw === null || trim($lotsRaw) === '') {
        return '-';
    }

    $lots = array_values(array_unique(array_filter(array_map('trim', explode(',', $lotsRaw)))));
    sort($lots, SORT_STRING);

    if (count($lots) <= $maxShown) {
        return implode(', ', $lots);
    }

    $shown = array_slice($lots, 0, $maxShown);

    return implode(', ', $shown) . ' (+' . (count($lots) - $maxShown) . ' more)';
}

/**
 * @return array{diff:float,statusClass:string,rowClass:string,icon:string,text:string,daysText:string,daysColor:string,statusText:string}
 */
function expiry_status_meta(?string $expDate, bool $isEN = false, ?string $today = null): array
{
    $today = $today ?? date('Y-m-d');

    if ($expDate === null || trim($expDate) === '') {
        return [
            'diff' => 0,
            'statusClass' => 'status-normal',
            'rowClass' => 'row-normal',
            'icon' => 'fa-minus-circle',
            'text' => $isEN ? 'Unknown' : 'ไม่ระบุ',
            'daysText' => '-',
            'daysColor' => '#64748b',
            'statusText' => 'Unknown',
        ];
    }

    $diff = (strtotime($expDate) - strtotime($today)) / (60 * 60 * 24);

    if ($diff < 0) {
        return [
            'diff' => $diff,
            'statusClass' => 'status-expired',
            'rowClass' => 'row-expired',
            'icon' => 'fa-times-circle',
            'text' => $isEN ? 'Expired' : 'หมดอายุแล้ว',
            'daysText' => $isEN ? abs(round($diff)) . ' days ago' : 'ผ่านมา ' . abs(round($diff)) . ' วัน',
            'daysColor' => '#ef4444',
            'statusText' => 'Expired',
        ];
    }

    if ($diff <= 7) {
        return [
            'diff' => $diff,
            'statusClass' => 'status-soon',
            'rowClass' => 'row-soon',
            'icon' => 'fa-exclamation-triangle',
            'text' => $isEN ? 'Soon' : 'ใกล้หมดอายุ',
            'daysText' => $isEN ? round($diff) . ' days left' : 'เหลืออีก ' . round($diff) . ' วัน',
            'daysColor' => '#c2410c',
            'statusText' => 'Expiring Soon',
        ];
    }

    return [
        'diff' => $diff,
        'statusClass' => 'status-normal',
        'rowClass' => 'row-normal',
        'icon' => 'fa-check-circle',
        'text' => $isEN ? 'Normal' : 'ปกติ',
        'daysText' => $isEN ? round($diff) . ' days left' : 'เหลืออีก ' . round($diff) . ' วัน',
        'daysColor' => '#15803d',
        'statusText' => 'Normal',
    ];
}

function expiry_count_groups(mysqli $condb, string $whereStr): int
{
    $sql = "SELECT COUNT(*) AS total FROM (
        SELECT 1 FROM inventory_receive $whereStr GROUP BY HanaPart, IM
    ) grouped";
    $res = $condb->query($sql);

    return $res ? (int) $res->fetch_assoc()['total'] : 0;
}

function expiry_count_puids(mysqli $condb, string $whereStr): int
{
    $sql = "SELECT COUNT(*) AS total FROM inventory_receive $whereStr";
    $res = $condb->query($sql);

    return $res ? (int) $res->fetch_assoc()['total'] : 0;
}

/**
 * @return list<array<string, mixed>>
 */
function expiry_fetch_grouped(mysqli $condb, string $whereStr, ?int $limit = null, ?int $offset = null): array
{
    $sql = "SELECT HanaPart, IM,
            COUNT(*) AS puid_count,
            SUM(QtyRemain) AS total_qty,
            MIN(ExpirationDate) AS ExpirationDate,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(LotNo), '') ORDER BY LotNo SEPARATOR ', ') AS lots_raw
        FROM inventory_receive
        $whereStr
        GROUP BY HanaPart, IM
        ORDER BY MIN(ExpirationDate) ASC";

    if ($limit !== null) {
        $sql .= ' LIMIT ' . (int) $limit;
        if ($offset !== null) {
            $sql .= ' OFFSET ' . (int) $offset;
        }
    }

    $res = $condb->query($sql);
    if (!$res) {
        return [];
    }

    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }

    return $rows;
}
