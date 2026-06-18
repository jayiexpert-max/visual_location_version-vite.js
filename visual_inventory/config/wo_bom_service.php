<?php

require_once __DIR__ . '/cpk_service.php';
require_once __DIR__ . '/inventory_api_service.php';

/**
 * Sub store (kitting room) — stock in inventory_receive for this station.
 */
function wo_substore_machine_like(): string
{
    $like = trim((string) (env('WO_SUBSTORE_MACHINE_LIKE', '%Kitting%') ?? '%Kitting%'));

    return $like !== '' ? $like : '%Kitting%';
}

/**
 * @return array{total: float, puid_count: int}
 */
function wo_fetch_substore_stock(mysqli $condb, string $hanaPart): array
{
    $hanaPart = trim($hanaPart);
    if ($hanaPart === '') {
        return ['total' => 0.0, 'puid_count' => 0];
    }

    $mcid = cpk_mcid();
    $like = wo_substore_machine_like();

    if ($mcid !== null) {
        $sql = 'SELECT COALESCE(SUM(QtyRemain), 0) AS total, COUNT(DISTINCT PUID) AS puid_count
            FROM inventory_receive
            WHERE HanaPart = ?
              AND QtyRemain > 0
              AND StatusName NOT IN ("Withdrawn", "Empty")
              AND (McID = ? OR MachineName LIKE ?)';
        $stmt = $condb->prepare($sql);
        if (!$stmt) {
            return ['total' => 0.0, 'puid_count' => 0];
        }
        $stmt->bind_param('sis', $hanaPart, $mcid, $like);
    } else {
        $sql = 'SELECT COALESCE(SUM(QtyRemain), 0) AS total, COUNT(DISTINCT PUID) AS puid_count
            FROM inventory_receive
            WHERE HanaPart = ?
              AND QtyRemain > 0
              AND StatusName NOT IN ("Withdrawn", "Empty")
              AND MachineName LIKE ?';
        $stmt = $condb->prepare($sql);
        if (!$stmt) {
            return ['total' => 0.0, 'puid_count' => 0];
        }
        $stmt->bind_param('ss', $hanaPart, $like);
    }

    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return [
        'total' => (float) ($row['total'] ?? 0),
        'puid_count' => (int) ($row['puid_count'] ?? 0),
    ];
}

function wo_substore_label(bool $isEN): string
{
    $custom = trim((string) (env('WO_SUBSTORE_LABEL', '') ?? ''));
    if ($custom !== '') {
        return $custom;
    }

    return $isEN ? 'Sub store (kitting)' : 'ห้อง Sub Store (Kitting)';
}

function wo_system_stock_label(bool $isEN): string
{
    return $isEN
        ? 'Warehouse system (inventory_receive)'
        : 'คลังในระบบ (inventory_receive)';
}

/**
 * Stock summary from visual inventory (inventory_receive) — primary qty for WO calc.
 *
 * @return array{
 *   system_stock_qty: float,
 *   usable_stock_qty: float,
 *   puid_count: int,
 *   earliest_expiration: ?string,
 *   expiration_display: string,
 *   expiry_status: string,
 *   expired_rolls: int,
 *   near_expiry_rolls: int,
 *   recommended_puid: ?string
 * }
 */
function wo_fetch_system_stock(mysqli $condb, string $hanaPart): array
{
    require_once __DIR__ . '/fifo_service.php';
    require_once __DIR__ . '/warehouse_highlight_service.php';

    $hanaPart = fifo_normalize_part($hanaPart);
    $empty = [
        'system_stock_qty' => 0.0,
        'usable_stock_qty' => 0.0,
        'puid_count' => 0,
        'earliest_expiration' => null,
        'expiration_display' => '-',
        'expiry_status' => 'none',
        'expired_rolls' => 0,
        'near_expiry_rolls' => 0,
        'recommended_puid' => null,
    ];

    if ($hanaPart === '') {
        return $empty;
    }

    $eligible = fifo_eligible_stock_sql($condb);
    $nearDays = expiration_sync_near_days();

    $sql = "SELECT
            COALESCE(SUM(QtyRemain), 0) AS system_qty,
            COALESCE(SUM(
                CASE
                    WHEN ExpirationDate IS NULL OR ExpirationDate = '' OR ExpirationDate = '0000-00-00'
                         OR ExpirationDate >= CURDATE()
                    THEN QtyRemain ELSE 0
                END
            ), 0) AS usable_qty,
            COUNT(DISTINCT PUID) AS puid_count,
            MIN(
                CASE
                    WHEN ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
                    THEN ExpirationDate
                END
            ) AS earliest_expiration,
            SUM(
                CASE
                    WHEN ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
                         AND ExpirationDate < CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS expired_rolls,
            SUM(
                CASE
                    WHEN ExpirationDate IS NOT NULL AND ExpirationDate != '' AND ExpirationDate != '0000-00-00'
                         AND ExpirationDate >= CURDATE()
                         AND ExpirationDate <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
                    THEN 1 ELSE 0
                END
            ) AS near_expiry_rolls
        FROM inventory_receive
        WHERE HanaPart = ?
          AND {$eligible}";

    $stmt = $condb->prepare($sql);
    if (!$stmt) {
        return $empty;
    }
    $stmt->bind_param('is', $nearDays, $hanaPart);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $systemQty = (float) ($row['system_qty'] ?? 0);
    $usableQty = (float) ($row['usable_qty'] ?? 0);
    $expiredRolls = (int) ($row['expired_rolls'] ?? 0);
    $nearRolls = (int) ($row['near_expiry_rolls'] ?? 0);
    $earliest = fifo_normalize_expiration($row['earliest_expiration'] ?? null);

    $expiryStatus = 'ok';
    if ($systemQty <= 0) {
        $expiryStatus = 'none';
    } elseif ($usableQty <= 0 && $expiredRolls > 0) {
        $expiryStatus = 'expired';
    } elseif ($expiredRolls > 0) {
        $expiryStatus = 'mixed_expired';
    } elseif ($nearRolls > 0) {
        $expiryStatus = 'near';
    }

    $fifoRow = fifo_fetch_recommended_inventory_row($condb, $hanaPart);
    $recommendedPuid = $fifoRow['PUID'] ?? null;
    if ($fifoRow && $earliest === null) {
        $earliest = fifo_normalize_expiration($fifoRow['ExpirationDate'] ?? null);
    }

    $expDisplay = '-';
    if ($earliest !== null) {
        $expDisplay = date('d/m/Y', strtotime($earliest));
        if ($earliest < date('Y-m-d')) {
            $expDisplay .= ' ⚠';
        } elseif ($earliest <= date('Y-m-d', strtotime('+' . $nearDays . ' days'))) {
            $expDisplay .= ' ⏳';
        }
    }

    return [
        'system_stock_qty' => $systemQty,
        'usable_stock_qty' => $usableQty,
        'puid_count' => (int) ($row['puid_count'] ?? 0),
        'earliest_expiration' => $earliest,
        'expiration_display' => $expDisplay,
        'expiry_status' => $expiryStatus,
        'expired_rolls' => $expiredRolls,
        'near_expiry_rolls' => $nearRolls,
        'recommended_puid' => $recommendedPuid,
    ];
}

/**
 * FIFO location + expiration for TV/3D highlight.
 *
 * @return array<string, mixed>|null
 */
function wo_resolve_highlight_for_material(mysqli $condb, string $materialCode): ?array
{
    require_once __DIR__ . '/fifo_service.php';
    require_once __DIR__ . '/warehouse_highlight_service.php';

    $materialCode = fifo_normalize_part($materialCode);
    if ($materialCode === '') {
        return null;
    }

    $loc = wh_resolve_location_by_material($condb, $materialCode);
    if (!$loc) {
        return null;
    }

    $stock = wo_fetch_system_stock($condb, $materialCode);
    $exp = fifo_normalize_expiration($loc['ExpirationDate'] ?? $stock['earliest_expiration'] ?? null);
    $nearDays = expiration_sync_near_days();
    $today = date('Y-m-d');

    $loc['product_name'] = $materialCode;
    $loc['HanaPart'] = $materialCode;
    $loc['material_code'] = $materialCode;
    $loc['puid'] = $loc['puid'] ?? $loc['PUID'] ?? $stock['recommended_puid'] ?? '';
    $loc['qty'] = $stock['usable_stock_qty'] > 0 ? $stock['usable_stock_qty'] : $stock['system_stock_qty'];
    $loc['earliest_expiration'] = $stock['earliest_expiration'];
    $loc['expiration_display'] = $stock['expiration_display'];
    $loc['expiry_status'] = $stock['expiry_status'];
    $loc['expired_rolls'] = $stock['expired_rolls'];
    $loc['near_expiry_rolls'] = $stock['near_expiry_rolls'];

    if ($exp !== null) {
        $loc['ExpirationDate'] = $exp;
        if ($exp < $today) {
            $loc['expiry_highlight'] = 'expired';
        } elseif ($exp <= date('Y-m-d', strtotime('+' . $nearDays . ' days'))) {
            $loc['expiry_highlight'] = 'near';
        } else {
            $loc['expiry_highlight'] = 'ok';
        }
    }

    return $loc;
}
