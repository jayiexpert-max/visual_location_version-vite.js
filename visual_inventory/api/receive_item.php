<?php
require_once("../config/helpers.php");
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/env_loader.php");
require_once("../config/cpk_service.php");
require_once("../config/res_info_service.php");

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST allowed']);
    exit;
}

$data = api_json_body();
if ($data === []) {
    $data = $_POST;
}

if (!$data || empty($data['PUID']) || empty($data['slot_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required data (PUID or Slot ID)']);
    exit;
}

// Check if already received or withdrawn locally (VL prefix / case variants)
$existingRow = res_info_find_inventory_row_any($condb, (string) $data['PUID']);
$alreadyInLocal = $existingRow
    && !in_array((string) ($existingRow['StatusName'] ?? ''), ['Withdrawn', 'Empty'], true);
$alreadyWithdrawn = $existingRow
    && in_array((string) ($existingRow['StatusName'] ?? ''), ['Withdrawn', 'Empty'], true);

$cpkWarnings = [];
$reservationNo = trim($data['ReservationNo'] ?? $data['RES_NO'] ?? '');
$cpkAlreadyReceived = false;
$skipCpk = !empty($data['skip_cpk']);

if ($reservationNo !== '' && !$skipCpk) {
    if (cpk_mcid() === null) {
        echo json_encode([
            'status' => 'error',
            'message' => cpk_mcid_missing_message(),
        ]);
        exit;
    }

    $operator = trim($data['Operator'] ?? ($_SESSION['username'] ?? ''));
    if ($operator === '') {
        echo json_encode(['status' => 'error', 'message' => 'Operator is required for reservation receive (CPK sync)']);
        exit;
    }

    $cpkPayload = [
        'RES_NO' => $reservationNo,
        'PUID' => $data['PUID'],
        'Operator' => $operator,
    ];

    $location = trim($data['Location'] ?? '');
    if ($location === '') {
        $location = cpk_build_location($data);
    }
    if ($location !== '') {
        $cpkPayload['Location'] = $location;
    }

    $cpkResult = cpk_post_authenticated('RES_PUIDRecv', $cpkPayload);
    $cpkMessage = (string) ($cpkResult['cpk_message'] ?? $cpkResult['error'] ?? '');
    if (is_array($cpkResult['data'])) {
        $cpkMessage = (string) ($cpkResult['data']['Message'] ?? $cpkMessage);
    }

    if (!$cpkResult['ok'] || !is_array($cpkResult['data']) || !cpk_is_success($cpkResult['data'])) {
        if (cpk_is_already_received_message($cpkMessage)) {
            $cpkAlreadyReceived = true;
            $cpkWarnings[] = 'CPK reports PUID already received — syncing local warehouse record.';
        } elseif (cpk_is_transport_failure($cpkResult) && !cpk_receive_required()) {
            $cpkWarnings[] = 'CPK ไม่ตอบ (timeout/เครือข่าย) — บันทึกเข้าคลังในระบบแล้ว แต่ยังไม่ได้ sync RES_PUIDRecv ไป CPK กรุณาลอง sync อีกครั้งเมื่อ CPK พร้อม';
        } else {
            $userMsg = $cpkMessage ?: 'CPK RES_PUIDRecv failed';
            if (stripos($userMsg, 'timed out') !== false || stripos($userMsg, 'timeout') !== false) {
                $userMsg = $cpkMessage
                    . ' — ไม่ได้บันทึกในระบบ'
                    . (cpk_receive_required()
                        ? ' (ตั้ง CPK_RECEIVE_REQUIRED=false ใน .env เพื่อรับเข้าคลังได้แม้ CPK ล่ม)'
                        : '');
            }
            echo json_encode([
                'status' => 'error',
                'message' => $userMsg,
                'cpk' => is_array($cpkResult['data']) ? $cpkResult['data'] : null,
            ]);
            exit;
        }
    } elseif (!empty($cpkResult['data']['Warnings']) && is_array($cpkResult['data']['Warnings'])) {
        $cpkWarnings = $cpkResult['data']['Warnings'];
    }
} elseif ($reservationNo !== '' && $skipCpk) {
    $cpkAlreadyReceived = true;
    $cpkWarnings[] = 'Skipped CPK receive (already received in CPK).';
}

if ($alreadyWithdrawn) {
    if ($reservationNo !== '') {
        try {
            res_info_fetch_with_local($condb, $reservationNo);
        } catch (Throwable $e) {
            // non-fatal
        }
    }
    echo json_encode([
        'status' => 'success',
        'message' => 'PUID already withdrawn — not saved again',
        'already_withdrawn' => true,
        'cpk_already_received' => $cpkAlreadyReceived,
        'cpk_warnings' => $cpkWarnings,
    ]);
    exit;
}

if ($alreadyInLocal) {
    if ($reservationNo !== '') {
        try {
            res_info_fetch_with_local($condb, $reservationNo);
        } catch (Throwable $e) {
            // non-fatal
        }
    }
    echo json_encode([
        'status' => 'success',
        'message' => 'PUID already in local warehouse',
        'already_received' => true,
        'cpk_already_received' => $cpkAlreadyReceived,
        'cpk_warnings' => $cpkWarnings,
    ]);
    exit;
}

$condb->begin_transaction();

try {
    $now = date('Y-m-d H:i:s');

    // 1. Insert into inventory_receive
    $sqlRec = "INSERT INTO inventory_receive (
        ReceiveDate, PUID, ReservationNo, IM, Customer, HanaPart, Description, MnfPartNo, 
        LotNo, DateCode, BinSize, Qty, QtyRemain, McID, MachineName, 
        StatusName, ExpirationDate, OldIM, Remark, Loc_Shelf, Loc_Level, Loc_Box, 
        ExpireDate_RoomTemp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
        QtyRemain = VALUES(QtyRemain),
        StatusName = VALUES(StatusName),
        updated_at = '$now'";

    $stmtRec = $condb->prepare($sqlRec);

    $receive_date = !empty($data['ReceiveDate']) ? $data['ReceiveDate'] : $now;
    $qty = intval($data['Qty'] ?? 0);
    $qty_remain = intval($data['QtyRemain'] ?? $qty);
    $mc_id = !empty($data['McID']) ? intval($data['McID']) : null;
    $status = $data['StatusName'] ?? 'Available';
    $exp_date = !empty($data['ExpirationDate']) ? $data['ExpirationDate'] : null;
    $room_exp_date = !empty($data['ExpireDate_RoomTemp']) ? $data['ExpireDate_RoomTemp'] : null;

    $stmtRec->bind_param(
        "ssssssssssiiissssssssss",
        $receive_date,
        $data['PUID'],
        $data['ReservationNo'],
        $data['IM'],
        $data['Customer'],
        $data['HanaPart'],
        $data['Description'],
        $data['MnfPartNo'],
        $data['LotNo'],
        $data['DateCode'],
        $data['BinSize'],
        $qty,
        $qty_remain,
        $mc_id,
        $data['MachineName'],
        $status,
        $exp_date,
        $data['OldIM'],
        $data['Remark'],
        $data['Loc_Shelf'],
        $data['Loc_Level'],
        $data['Loc_Box'],
        $room_exp_date
    );

    if (!$stmtRec->execute()) {
        throw new Exception("Insert inventory_receive failed");
    }
    $insertedNew = ((int) $stmtRec->affected_rows) === 1;

    if (!$insertedNew) {
        $condb->commit();
        if ($reservationNo !== '') {
            try {
                res_info_fetch_with_local($condb, $reservationNo);
            } catch (Throwable $e) {
                // non-fatal
            }
        }
        echo json_encode([
            'status' => 'success',
            'message' => 'PUID already in local warehouse',
            'already_received' => true,
            'cpk_already_received' => $cpkAlreadyReceived,
            'cpk_warnings' => $cpkWarnings,
        ]);
        exit;
    }

    // 2. Update products table (increment qty)
    $slot_id = intval($data['slot_id']);
    $hana_part = $data['HanaPart'];

    $chkP = $condb->prepare("SELECT id FROM products WHERE slot_id = ? AND name = ? LIMIT 1");
    $chkP->bind_param("is", $slot_id, $hana_part);
    $chkP->execute();
    $resP = $chkP->get_result()->fetch_assoc();

    $log_product_id = 0;
    if ($resP) {
        $log_product_id = $resP['id'];
        $updP = $condb->prepare("UPDATE products SET qty = qty + 1 WHERE id = ?");
        $updP->bind_param("i", $resP['id']);
        $updP->execute();
    } else {
        $insP = $condb->prepare("INSERT INTO products (slot_id, name, qty) VALUES (?, ?, 1)");
        $insP->bind_param("is", $slot_id, $hana_part);
        $insP->execute();
        $log_product_id = $condb->insert_id;
    }

    // 3. Log the action (RES receive — separate from add_stock direct receive)
    if ($log_product_id) {
        $safe_puid = str_replace('|', '-', $data['PUID']);
        $log_action = 'res_receive|' . $qty_remain . '|' . $safe_puid;
        $user_id = $_SESSION['user_id'] ?? 0;
        $log_remark = $reservationNo !== ''
            ? '[RES: ' . str_replace('|', '-', $reservationNo) . ']'
            : '';

        $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark)
                   VALUES (?, ?, ?, ?, ?, ?)';
        $logStmt = $condb->prepare($logSql);
        $logStmt->bind_param('iisiss', $log_product_id, $user_id, $log_action, $qty, $now, $log_remark);
        $logStmt->execute();
        $logStmt->close();
    }

    $condb->commit();

    if ($reservationNo !== '') {
        try {
            res_info_fetch_with_local($condb, $reservationNo);
        } catch (Throwable $e) {
            // non-fatal
        }
    }

    $response = ['status' => 'success'];
    if ($cpkAlreadyReceived) {
        $response['cpk_already_received'] = true;
    }
    if (!empty($cpkWarnings)) {
        $response['cpk_warnings'] = $cpkWarnings;
        foreach ($cpkWarnings as $w) {
            if (is_string($w) && (stripos($w, 'timeout') !== false || stripos($w, 'ไม่ตอบ') !== false)) {
                $response['cpk_sync_failed'] = true;
                break;
            }
        }
    }

    echo json_encode($response);
} catch (Exception $e) {
    $condb->rollback();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
