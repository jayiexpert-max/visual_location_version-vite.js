<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once __DIR__ . '/../config/io_device_service.php';
require_once __DIR__ . '/../config/warehouse_highlight_service.php';
require_once __DIR__ . '/../config/cpk_service.php';
require_once __DIR__ . '/../config/inventory_api_service.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ถ้ามีการส่ง product_name มาจาก URL ให้ใส่ลงในตัวแปร
$default_product_name = $_GET['product_name'] ?? "";

$message = "";
$message_type = "";
$success_highlight_data = null;
$io_skip_auto_trigger = false;

// One-time flash after POST-Redirect-GET (F5 = clean form, no resubmit)
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && !empty($_SESSION['add_stock_flash'])) {
    $flash = $_SESSION['add_stock_flash'];
    unset($_SESSION['add_stock_flash']);
    $message = $flash['message'] ?? '';
    $message_type = $flash['type'] ?? '';
    $success_highlight_data = $flash['highlight'] ?? null;
    if (!empty($flash['io_skip_auto_trigger'])) {
        $io_skip_auto_trigger = true;
    }
}

// ตรวจสอบว่ามี session user หรือไม่
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

if (!role_can_receive_inbound()) {
    $msg = "Access Denied / ไม่มีสิทธิเข้าถึงหน้านี้";
    echo "<script>alert('$msg'); window.location.href='index';</script>";
    exit;
}

// ฟังก์ชันแปลงวันที่ D/M/Y เป็น Y-m-d สำหรับ MySQL
function mysql_date($dateStr)
{
    if (empty($dateStr))
        return NULL;
    $dateStr = str_replace('T', ' ', $dateStr);

    // ถ้ามาเป็น Y-m-d อยู่แล้ว (จาก HTML5 input)
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $dateStr)) {
        return $dateStr;
    }

    // ลองแปลงรูปแบบอื่นๆ (เช่น 31/12/2024 หรือ 31/12/2024 10:30)
    $cleanDate = preg_replace('/[^\d\/: \-]/', '', $dateStr);
    $parts = preg_split('/[\/ \-:]/', $cleanDate);

    if (count($parts) >= 3) {
        $day = str_pad($parts[0], 2, "0", STR_PAD_LEFT);
        $month = str_pad($parts[1], 2, "0", STR_PAD_LEFT);
        $year = $parts[2];
        if (strlen($year) == 2)
            $year = "20" . $year;

        $formatted = "$year-$month-$day";

        // ถ้ามีเวลา (H:i)
        if (isset($parts[3]) && isset($parts[4])) {
            $formatted .= " " . str_pad($parts[3], 2, "0", STR_PAD_LEFT) . ":" . str_pad($parts[4], 2, "0", STR_PAD_LEFT) . ":00";
        }
        return $formatted;
    }
    return $dateStr;
}

// POST เพิ่มสินค้า
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $isEN = (__('logout') == 'Logout');

    // 1. Collect and sanitize primary POST data
    $PUID = trim($_POST['PUID'] ?? '');
    $IM = trim($_POST['IM'] ?? '');
    $HanaPart = trim($_POST['HanaPart'] ?? '');
    $qtyRemainRaw = trim(str_replace([',', ' '], '', (string) ($_POST['QtyRemain'] ?? '')));
    $qtyRemainParsed = cpk_parse_positive_qty($qtyRemainRaw);
    $QtyRemain_input = $qtyRemainParsed !== null ? (int) round($qtyRemainParsed) : 0;
    $slot_id = !empty($_POST['slot_id']) ? (int) $_POST['slot_id'] : null;

    if (empty($IM) || empty($PUID)) {
        $message = "⚠️ กรุณากรอกรหัส IM และ PUID";
        $message_type = "warning";
    } elseif ($QtyRemain_input <= 0) {
        $message = $isEN
            ? '⚠️ Qty Remain must be greater than 0 (required for CPK UpdatePUIDStatus).'
            : '⚠️ จำนวนคงเหลือต้องมากกว่า 0 (ใช้ส่ง CPK UpdatePUIDStatus)';
        $message_type = "warning";
    } elseif (empty($HanaPart) || empty($slot_id)) {
        $message = "⚠️ ไม่พบรายชื่อสินค้าหรือตำแหน่งจัดเก็บในระบบ (กรุณากด 'ดึงข้อมูล' และตรวจสอบว่าระบบมีข้อมูลสินค้านี้)";
        $message_type = "warning";
    } else {
        // --- 1.5 Check if product exists in 'products' table (Master Check) ---
        $checkMaster = $condb->prepare("SELECT id FROM products WHERE name = ? LIMIT 1");
        $checkMaster->bind_param("s", $HanaPart);
        $checkMaster->execute();
        $masterRes = $checkMaster->get_result()->fetch_assoc();

        if (!$masterRes) {
            $message = "⚠️ ไม่พบพาร์ทสินค้า <b>“{$HanaPart}”</b> ในฐานข้อมูลระบบ (กรุณาให้ Admin เพิ่มข้อมูลในระบบก่อนรับเข้า)";
            $message_type = "warning";
        } elseif (empty($slot_id)) {
            $message = "⚠️ ไม่พบข้อมูลตำแหน่งจัดเก็บ (Slot ID) สำหรับพาร์ทนี้";
            $message_type = "warning";
        } else {
            // Collect additional metadata from hidden fields (populated via fetchAPIData)
            $ReceiveDate = $_POST['ReceiveDate'] ?: date('Y-m-d H:i:s');
            $Customer = trim($_POST['Customer'] ?? '');
            $Description = trim($_POST['Description'] ?? '');
            $MnfPartNo = trim($_POST['MnfPartNo'] ?? '');
            $LotNo = trim($_POST['LotNo'] ?? '');
            $DateCode = trim($_POST['DateCode'] ?? '');
            $BinSize = trim($_POST['BinSize'] ?? '');
            $Qty = (int) ($_POST['Qty'] ?? 0);
            $McID = !empty($_POST['McID']) ? (int) $_POST['McID'] : NULL;
            $MachineName = trim($_POST['MachineName'] ?? '');
            $StatusName = trim($_POST['StatusName'] ?? 'Available');
            $ExpirationDate = !empty($_POST['ExpirationDate']) ? $_POST['ExpirationDate'] : NULL;
            $OldIM = trim($_POST['OldIM'] ?? '');
            $Remark = trim($_POST['Remark'] ?? '');
            $ReservationNo = trim($_POST['ReservationNo'] ?? '');
            $Loc_Shelf = trim($_POST['Loc_Shelf'] ?? '');
            $Loc_Level = trim($_POST['Loc_Level'] ?? '');
            $Loc_Box = trim($_POST['Loc_Box'] ?? '');
            $ExpireDate_RoomTemp = !empty($_POST['ExpireDate_RoomTemp']) ? $_POST['ExpireDate_RoomTemp'] : NULL;

            // Clean up date formats for MySQL
            $ReceiveDate = mysql_date($ReceiveDate ?: date('Y-m-d H:i:s'));
            $ExpirationDate = mysql_date($ExpirationDate);
            $ExpireDate_RoomTemp = mysql_date($ExpireDate_RoomTemp);

            // --- 1.6 Existing PUID (kitting return may update qty/location) ---
            $checkPUID = $condb->prepare("SELECT StatusName FROM inventory_receive WHERE PUID = ? LIMIT 1");
            $checkPUID->bind_param("s", $PUID);
            $checkPUID->execute();
            $puidRecord = $checkPUID->get_result()->fetch_assoc();
            $isNewReel = !$puidRecord || in_array($puidRecord['StatusName'] ?? '', ['Withdrawn', 'Empty'], true);

            $cpkWarnings = [];
            $cpkSynced = false;
            $cpkMessage = '';
            $cpkResult = ['puid_info' => null, 'warnings' => []];
            $canSaveLocal = true;

            if (cpk_mcid() === null) {
                $cpkWarnings[] = $isEN
                    ? 'CPK McID not configured — saved to local warehouse only.'
                    : 'ไม่ได้ตั้ง CPK_MC_ID — บันทึกเฉพาะคลังในระบบ';
            } else {
                $operator = trim($_SESSION['username'] ?? '');
                if ($operator === '') {
                    $message = $isEN ? '⚠️ Operator (login user) is required for CPK.' : '⚠️ ต้องมีชื่อผู้ใช้ระบบสำหรับส่ง CPK';
                    $message_type = 'warning';
                    $canSaveLocal = false;
                } else {
                    $cpkResult = cpk_update_puid_status_call($PUID, $operator, $qtyRemainRaw, [
                        'Loc_Shelf' => $Loc_Shelf,
                        'Loc_Level' => $Loc_Level,
                        'Loc_Box' => $Loc_Box,
                        'Loc_Slot' => trim($_POST['Loc_Slot'] ?? ''),
                    ]);

                    $cpkMessage = $cpkResult['message'];
                    $cpkWarnings = $cpkResult['warnings'];

                    if ($cpkResult['ok']) {
                        $qtyBreakdown = $cpkResult['qty_breakdown'] ?? cpk_puid_info_breakdown($cpkResult['puid_info']);
                        $cpkEffectiveQty = $qtyBreakdown['effective_remain'] ?? null;

                        if ($cpkEffectiveQty !== null && !cpk_qty_matches_target($cpkEffectiveQty, $QtyRemain_input)) {
                            $detail = $isEN
                                ? "CPK effective remain is {$cpkEffectiveQty}, but you entered {$QtyRemain_input}."
                                : "CPK คงเหลือจริง {$cpkEffectiveQty} ไม่ตรงกับที่กรอก {$QtyRemain_input}";
                            if ($qtyBreakdown['correction'] !== null) {
                                $detail .= $isEN
                                    ? " (CPK Correction={$qtyBreakdown['correction']}; central report may show Correction in QtyRemain column.)"
                                    : " (CPK Correction={$qtyBreakdown['correction']}; รายงานระบบกลางอาจแสดง Correction ในคอลัมน์ QtyRemain)";
                            }
                            $message = '❌ ' . $detail;
                            $message_type = 'warning';
                            $canSaveLocal = false;
                        } else {
                            $cpkSynced = true;
                            if (!empty($cpkResult['puid_info']['PartNumber']) && $HanaPart === '') {
                                $HanaPart = (string) $cpkResult['puid_info']['PartNumber'];
                            }
                            if ($cpkEffectiveQty !== null) {
                                $QtyRemain_input = $cpkEffectiveQty;
                            }
                            if (cpk_verify_central_after_save()) {
                                $centralVerify = inventory_verify_central_qty_after_cpk(
                                    $PUID,
                                    $QtyRemain_input,
                                    $HanaPart
                                );
                                if (!empty($centralVerify['message'])) {
                                    $cpkWarnings[] = $centralVerify['message'];
                                }
                                if (empty($centralVerify['central_report_aligned'])) {
                                    $pdsVal = $centralVerify['pdservice_qty_remain'] ?? '—';
                                    $cpkWarnings[] = $isEN
                                        ? "Central report QtyRemain (PDService) still shows {$pdsVal}, not {$QtyRemain_input}. Ask IT/CPK to sync PDService — CPK NewQty is already {$QtyRemain_input}."
                                        : "รายงานกลาง (PDService) ยังแสดง QtyRemain = {$pdsVal} ไม่ใช่ {$QtyRemain_input} — แจ้งทีม CPK/IT ให้ sync PDService (ที่ CPK ตั้ง NewQty = {$QtyRemain_input} แล้ว)";
                                }
                            }
                        }
                    } elseif ($cpkResult['transport_failure'] && !cpk_update_puid_required()) {
                        $cpkWarnings[] = $isEN
                            ? 'CPK unreachable (timeout/network) — local save only; sync UpdatePUIDStatus when CPK is back.'
                            : 'เชื่อมต่อ CPK ไม่ได้ — บันทึกคลังในระบบแล้ว แต่ยังไม่ได้ sync UpdatePUIDStatus';
                    } else {
                        $message = '❌ CPK: ' . htmlspecialchars($cpkMessage);
                        $message_type = 'warning';
                        if (cpk_update_puid_required()) {
                            $canSaveLocal = false;
                        }
                    }
                }
            }

            if ($canSaveLocal) {
                $condb->begin_transaction();

                try {
                    // STEP 1: Insert or Update Inventory Receive record
                    $now = date('Y-m-d H:i:s');
                    $sqlRec = "INSERT INTO inventory_receive (
                    ReceiveDate, PUID, ReservationNo, IM, Customer, HanaPart, Description, MnfPartNo, 
                    LotNo, DateCode, BinSize, Qty, QtyRemain, McID, MachineName, 
                    StatusName, ExpirationDate, OldIM, Remark, Loc_Shelf, Loc_Level, Loc_Box, 
                    ExpireDate_RoomTemp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    ReceiveDate = VALUES(ReceiveDate),
                    QtyRemain = VALUES(QtyRemain),
                    StatusName = VALUES(StatusName),
                    IM = VALUES(IM),
                    HanaPart = VALUES(HanaPart),
                    Loc_Shelf = VALUES(Loc_Shelf),
                    Loc_Level = VALUES(Loc_Level),
                    Loc_Box = VALUES(Loc_Box),
                    updated_at = '$now'";

                    $stmtRec = $condb->prepare($sqlRec);
                    if (!$stmtRec)
                        throw new Exception("Prepare Receive failed: " . $condb->error);

                    $stmtRec->bind_param(
                        "ssssssssssiiissssssssss",
                        $ReceiveDate,
                        $PUID,
                        $ReservationNo,
                        $IM,
                        $Customer,
                        $HanaPart,
                        $Description,
                        $MnfPartNo,
                        $LotNo,
                        $DateCode,
                        $BinSize,
                        $Qty,
                        $QtyRemain_input,
                        $McID,
                        $MachineName,
                        $StatusName,
                        $ExpirationDate,
                        $OldIM,
                        $Remark,
                        $Loc_Shelf,
                        $Loc_Level,
                        $Loc_Box,
                        $ExpireDate_RoomTemp
                    );

                    if (!$stmtRec->execute())
                        throw new Exception("Execute Receive failed: " . $stmtRec->error);

                    // STEP 2: Update Layout Products (+1 reel only for new receive, not qty update)
                    if ($isNewReel && $slot_id && $HanaPart) {
                        $log_product_id = 0;

                        // Check if product exists in this specific slot
                        $chkP = $condb->prepare("SELECT id FROM products WHERE slot_id = ? AND name = ? LIMIT 1");
                        $chkP->bind_param("is", $slot_id, $HanaPart);
                        $chkP->execute();
                        $resP = $chkP->get_result()->fetch_assoc();

                        if ($resP) {
                            // Exists -> Increment Qty
                            $log_product_id = $resP['id'];
                            $updP = $condb->prepare("UPDATE products SET qty = qty + 1 WHERE id = ?");
                            $updP->bind_param("i", $resP['id']);
                            $updP->execute();
                        } else {
                            // New -> Insert with Qty 1
                            $insP = $condb->prepare("INSERT INTO products (slot_id, name, qty) VALUES (?, ?, 1)");
                            $insP->bind_param("is", $slot_id, $HanaPart);
                            $insP->execute();
                            $log_product_id = $condb->insert_id;
                        }

                        // STEP 3: Insert Stock Log (For Report)
                        if ($log_product_id) {
                            $safe_puid = str_replace('|', '-', $PUID);
                            $log_qty = 1;
                            $user_id = $_SESSION['user_id'];
                            $log_now = date('Y-m-d H:i:s');
                            $log_remark = '';

                            if ($ReservationNo !== '') {
                                $log_action = 'res_receive|' . $QtyRemain_input . '|' . $safe_puid;
                                $log_remark = '[RES: ' . str_replace('|', '-', $ReservationNo) . ']';
                                $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark)
                                           VALUES (?, ?, ?, ?, ?, ?)';
                                $logStmt = $condb->prepare($logSql);
                                $logStmt->bind_param('iisiss', $log_product_id, $user_id, $log_action, $log_qty, $log_now, $log_remark);
                            } else {
                                $log_action = 'add|' . $QtyRemain_input . '|' . $safe_puid;
                                $logSql = 'INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at)
                                           VALUES (?, ?, ?, ?, ?)';
                                $logStmt = $condb->prepare($logSql);
                                $logStmt->bind_param('iisis', $log_product_id, $user_id, $log_action, $log_qty, $log_now);
                            }
                            $logStmt->execute();
                            $logStmt->close();
                        }
                    }

                    $condb->commit();
                    $message = $isEN
                        ? "✅ Saved to warehouse"
                        : "✅ บันทึกรับเข้าคลังสำเร็จ";
                        if ($cpkSynced) {
                        $message .= $isEN
                            ? " — CPK UpdatePUIDStatus OK"
                            : " — sync CPK UpdatePUIDStatus สำเร็จ";
                        $message .= $isEN
                            ? " (actual remain NewQty: {$QtyRemain_input})"
                            : " (คงเหลือจริง NewQty: {$QtyRemain_input})";
                        if (!empty($cpkResult['qty_breakdown']['correction'])) {
                            $corr = $cpkResult['qty_breakdown']['correction'];
                            $message .= $isEN
                                ? " [Correction: {$corr} — central QtyRemain column may still show this negative value]"
                                : " [Correction: {$corr} — คอลัมน์ QtyRemain รายงานกลางอาจยังแสดงค่านี้]";
                        }
                    }
                    if ($isNewReel) {
                        $message .= $isEN ? ' (+1 reel on layout)' : ' (+1 ม้วนในแผนผัง)';
                    } elseif ($puidRecord) {
                        $message .= $isEN ? ' (updated existing PUID)' : ' (อัปเดต PUID เดิม)';
                    }
                    $message .= cpk_format_warnings_html($cpkWarnings);
                    $message_type = "success";

                    // Prepare data for highlighting after success
                    $boxQuery = $condb->prepare("
                        SELECT x.id as box_id, x.box_code, x.layout, sl.id as slot_id, sl.slot_no,
                               l.level_no, r.name as rack_name
                        FROM slots sl 
                        JOIN boxes x ON sl.box_id = x.id 
                        JOIN levels l ON x.level_id = l.id
                        JOIN racks r ON l.rack_id = r.id
                        WHERE sl.id = ? 
                        LIMIT 1
                    ");
                    $boxQuery->bind_param("i", $slot_id);
                    $boxQuery->execute();
                    $bData = $boxQuery->get_result()->fetch_assoc();
                    if ($bData) {
                        $success_highlight_data = $bData;

                        wh_highlight_from_proxy_data($condb, array_merge($bData, [
                            'HanaPart' => $HanaPart,
                            'PUID' => $PUID,
                            'QtyRemain' => $QtyRemain_input,
                            'action_type' => 'add',
                        ]), 'add');
                    }
                    $io_skip_auto_trigger = true;

                    if (!defined('HANDHELD_POST') || !HANDHELD_POST) {
                        $_SESSION['add_stock_flash'] = [
                            'message' => $message,
                            'type' => $message_type,
                            'highlight' => array_merge($success_highlight_data ?? [], [
                                'PUID' => $PUID,
                                'HanaPart' => $HanaPart,
                            ]),
                            'io_skip_auto_trigger' => $io_skip_auto_trigger,
                        ];
                        header('Location: add_stock');
                        exit;
                    }
                } catch (Exception $e) {
                    $condb->rollback();
                    $message = "❌ เกิดข้อผิดพลาด: " . $e->getMessage();
                    $message_type = "warning";
                }
            }

        }
    }
}

if (defined('HANDHELD_POST') && HANDHELD_POST) {
    return;
}

$isEN = __('logout') == 'Logout';
$highlightDurationSec = io_highlight_duration_sec();
$page_title = $isEN ? 'Add Stock' : 'รับสินค้าเข้าคลัง';
$page_icon = 'fa-plus-circle';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
</head>

<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main">
    <div class="fx-scan-page">

        <?php if ($message): ?>
            <div class="message <?= $message_type ?>" id="messageBox"><?= $message ?></div>
            <?php if ($message_type === 'success'): ?>
                <div class="fx-countdown-hint">
                    <?= $isEN
                        ? 'Location shown on TV & 3D. Auto-refresh in'
                        : 'แสดงตำแหน่งบน TV / 3D แล้ว, รีเฟรชอัตโนมัติใน' ?>
                    <span id="countdown" class="fx-countdown"><?= (int) $highlightDurationSec ?></span>
                    <?= $isEN ? 'sec' : 'วินาที' ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>

        <div id="dynamicMessage" class="fx-page-message" style="display:none;"></div>

        <div class="fx-scan-toolbar">
            <a href="add_stock" class="fx-btn fx-btn-secondary"><i class="fas fa-sync-alt"></i> <?= $isEN ? 'Refresh' : 'รีเฟรชหน้า' ?></a>
        </div>

        <form method="POST" id="addInventoryForm" autocomplete="off">
            <div class="fx-form-panel">
                <div class="row">
                <div class="col-md-6">
                    <label for="puid_input">PUID (Unique ID)</label>
                    <div class="fx-scan-row">
                        <input type="text" name="PUID" id="puid_input" class="fx-scan-input" placeholder="<?= $isEN ? 'Scan PUID here...' : 'สแกน PUID ที่นี่...' ?>"
                            required autofocus autocomplete="off"
                            oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                        <button type="button" class="fx-btn fx-btn-accent" id="btnFetchData"
                            onclick="fetchAPIData()"><i class="fas fa-search"></i> <?= $isEN ? 'Fetch data' : 'ดึงข้อมูล' ?></button>
                    </div>
                </div>
                <div class="col-md-6">
                    <label for="receive_date_input"><?= $isEN ? 'Receive date' : 'วันที่รับเข้า' ?></label>
                    <input type="datetime-local" name="ReceiveDate" id="receive_date_input" value="<?= date('Y-m-d\TH:i') ?>">
                </div>
                <div class="col-md-6">
                    <label for="hanapart_input">Hana Part Name</label>
                    <input type="text" name="HanaPart" id="hanapart_input" placeholder="<?= $isEN ? 'Part name' : 'ชื่อพาร์ทสินค้า' ?>" required readonly>
                </div>

                <div class="col-md-6">
                    <label for="im_display">Internal Material (IM)</label>
                    <input type="text" name="IM" id="im_display" readonly>
                </div>

                <div class="col-md-6">
                    <label for="qty_display"><?= $isEN ? 'Qty (full reel)' : 'Qty (บรรจุเต็มม้วน)' ?></label>
                    <input type="number" name="Qty" id="qty_display" readonly>
                </div>
                <div class="col-md-6">
                    <label for="qty_remain_input"><?= $isEN ? 'Qty Remain (actual)' : 'Qty Remain (คงเหลือจริง)' ?></label>
                    <input type="number" name="QtyRemain" id="qty_remain_input" placeholder="<?= $isEN ? 'Counted quantity' : 'จำนวนที่นับได้จริง' ?>"
                        required min="1">
                </div>

                <!-- Hidden Fields -->
                <input type="hidden" name="Customer" id="customer_input">
                <input type="hidden" name="Description" id="description_input">
                <input type="hidden" name="MnfPartNo" id="mnf_part_no_input">
                <input type="hidden" name="LotNo" id="lot_no_input">
                <input type="hidden" name="DateCode" id="date_code_input">
                <input type="hidden" name="BinSize" id="bin_size_input">
                <input type="hidden" name="StatusName" id="status_name_input" value="Available">
                <input type="hidden" name="McID" id="mc_id_input">
                <input type="hidden" name="MachineName" id="machine_name_input">
                <input type="hidden" name="ExpirationDate" id="expiration_date_input">
                <input type="hidden" name="OldIM" id="old_im_input">
                <input type="hidden" name="Remark" id="remark_input">
                <input type="hidden" name="ExpireDate_RoomTemp" id="expire_date_room_temp_input">
                <input type="hidden" name="slot_id" id="slot_id_input">
                <input type="hidden" name="ReservationNo" id="reservation_no_input">

                <!-- Location Hidden Fields (For Product Qty Update) -->
                <input type="hidden" name="Loc_Shelf" id="loc_shelf_input">
                <input type="hidden" name="Loc_Level" id="loc_level_input">
                <input type="hidden" name="Loc_Box" id="loc_box_input">
                <input type="hidden" name="Loc_Slot" id="loc_slot_input">

                <div class="col-md-12 fx-form-actions">
                    <button type="submit" class="fx-btn fx-btn-primary fx-btn-lg" id="btnSubmitSave"
                        style="min-width: 300px;">
                        <i class="fas fa-save"></i> <?= $isEN ? 'Save to warehouse' : 'บันทึกรับเข้าคลังสินค้า' ?>
                    </button>
                </div>
                </div>
            </div>
        </form>
    </div>
</main>

    <script>
        window._isFetchingAPI = false;
        window._isSubmitting = false;

        const ADD_STOCK_BTN_LABELS = {
            fetch: '<i class="fas fa-search"></i> <?= $isEN ? 'Fetch data' : 'ดึงข้อมูล' ?>',
            fetchBusy: '<i class="fas fa-spinner fa-spin"></i> <?= $isEN ? 'Fetching...' : 'กำลังดึงข้อมูล...' ?>',
            save: '<i class="fas fa-save"></i> <?= $isEN ? 'Save to warehouse' : 'บันทึกรับเข้าคลังสินค้า' ?>',
            saveBusy: '<i class="fas fa-spinner fa-spin"></i> <?= $isEN ? 'Saving...' : 'กำลังบันทึก...' ?>',
        };

        function setAddStockBusy(busy, mode) {
            const fetchBtn = document.getElementById('btnFetchData');
            const submitBtn = document.getElementById('btnSubmitSave');
            const puidInput = document.getElementById('puid_input');
            const lockFetch = busy && mode === 'fetch';
            const lockButtons = busy && (mode === 'fetch' || mode === 'submit');

            if (fetchBtn) {
                fetchBtn.disabled = lockButtons;
                fetchBtn.innerHTML = (busy && mode === 'fetch')
                    ? ADD_STOCK_BTN_LABELS.fetchBusy
                    : ADD_STOCK_BTN_LABELS.fetch;
            }
            if (submitBtn) {
                submitBtn.disabled = lockButtons;
                submitBtn.innerHTML = (busy && mode === 'submit')
                    ? ADD_STOCK_BTN_LABELS.saveBusy
                    : ADD_STOCK_BTN_LABELS.save;
            }
            // disabled inputs are omitted from POST — only lock PUID while fetching, not on save
            if (puidInput) {
                puidInput.disabled = lockFetch;
            }
        }

        function fetchAPIData() {
            let puid = document.getElementById('puid_input').value.trim().toUpperCase();
            // Remove 'VL' prefix if exists
            puid = puid.replace(/^VL/, '');
            document.getElementById('puid_input').value = puid; // Update input field

            const hanapart = document.getElementById('hanapart_input').value;
            if (!puid) return;

            let url = 'get_inventory_proxy.php?puid=' + encodeURIComponent(puid) + '&source=api';
            if (hanapart) url += '&hanapart=' + encodeURIComponent(hanapart);

            if (window._isFetchingAPI || window._isSubmitting) return;
            window._isFetchingAPI = true;
            setAddStockBusy(true, 'fetch');

            const msgDiv = document.getElementById('dynamicMessage');
            msgDiv.style.display = 'block';
            msgDiv.className = 'message warning';
            msgDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดึงข้อมูล...';

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById('im_display').value = data.data.IM || '';
                        document.getElementById('hanapart_input').value = data.data.HanaPart || '';
                        document.getElementById('qty_display').value = data.data.Qty || 0;
                        const qtyRemain = data.data.QtyRemain ?? data.data.Qty ?? 0;
                        document.getElementById('qty_remain_input').value = qtyRemain;
                        document.getElementById('qty_remain_input').focus();

                        // Populate Hidden Location Fields
                        document.getElementById('loc_shelf_input').value = data.data.Loc_Shelf || '';
                        document.getElementById('loc_level_input').value = data.data.Loc_Level || '';
                        document.getElementById('loc_box_input').value = data.data.Loc_Box || '';
                        document.getElementById('loc_slot_input').value = data.data.Loc_Slot || '';
                        document.getElementById('slot_id_input').value = data.data.slot_id || '';

                        // Sync Meta Data
                        document.getElementById('customer_input').value = data.data.Customer || '';
                        document.getElementById('description_input').value = data.data.Description || '';
                        document.getElementById('mnf_part_no_input').value = data.data.MnfPartNo || '';
                        document.getElementById('lot_no_input').value = data.data.LotNo || '';
                        document.getElementById('date_code_input').value = data.data.DateCode || '';
                        document.getElementById('bin_size_input').value = data.data.BinSize || '';
                        document.getElementById('status_name_input').value = data.data.StatusName || 'Available';
                        document.getElementById('mc_id_input').value = data.data.McID || '';
                        document.getElementById('machine_name_input').value = data.data.MachineName || '';
                        document.getElementById('expiration_date_input').value = data.data.ExpirationDate || '';
                        document.getElementById('old_im_input').value = data.data.OldIM || '';
                        document.getElementById('remark_input').value = data.data.Remark || '';
                        document.getElementById('expire_date_room_temp_input').value = data.data.ExpireDate_RoomTemp || '';

                        // --- Display Location Message ---
                        const msgDiv = document.getElementById('dynamicMessage');
                        msgDiv.style.display = 'block';
                        msgDiv.className = 'message success';
                        let qtySourceNote = '<br><small>📡 <?= $isEN ? 'Material data from PDService GET API' : 'ข้อมูลวัตถุดิบจาก PDService GET API' ?></small>';
                        if (data.data.QtyRemain_source === 'cpk') {
                            qtySourceNote += '<br><small>📡 <?= $isEN ? 'Qty Remain from CPK (effective remain, not Correction)' : 'คงเหลือจาก CPK (คงเหลือจริง ไม่ใช่ค่า Correction)' ?></small>';
                        } else if (data.data.QtyRemain_source === 'local') {
                            qtySourceNote += '<br><small>💾 <?= $isEN ? 'Qty Remain from local warehouse' : 'จำนวนคงเหลือจากคลังในระบบ' ?></small>';
                        } else if (data.data.QtyRemain_source === 'pdservice') {
                            qtySourceNote += '<br><small>✅ <?= $isEN ? 'Qty Remain from PDService' : 'คงเหลือจาก PDService' ?></small>';
                        }
                        if (data.data.QtyRemain_pdservice != null && data.data.QtyRemain_pdservice < 0) {
                            qtySourceNote += '<br><small style="color:#b45309;">⚠️ <?= $isEN
                                ? 'Central/PDService QtyRemain column shows '
                                : 'คอลัมน์ QtyRemain ระบบกลางแสดง ' ?>' + data.data.QtyRemain_pdservice +
                                '<?= $isEN
                                ? ' (Correction, not actual remain). Save with '
                                : ' (เป็น Correction ไม่ใช่คงเหลือจริง) บันทึกด้วย ' ?>' +
                                qtyRemain + '.</small>';
                        } else if (data.data.QtyRemain_pdservice != null && data.data.QtyRemain_pdservice > 0 && data.data.QtyRemain_pdservice !== qtyRemain) {
                            qtySourceNote += '<br><small>ℹ️ <?= $isEN ? 'PDService QtyRemain differs from value shown' : 'PDService มีจำนวนอื่น — ตรวจก่อนบันทึก' ?></small>';
                        }
                        if (data.data.QtyRemain_cpk_effective != null && data.data.QtyRemain_cpk_effective !== qtyRemain) {
                            qtySourceNote += '<br><small style="color:#b45309;">⚠️ CPK <?= $isEN ? 'effective remain' : 'คงเหลือจริง' ?>: <b>' +
                                data.data.QtyRemain_cpk_effective + '</b> ≠ ' + qtyRemain +
                                ' — <?= $isEN ? 'verify before save' : 'ตรวจสอบก่อนบันทึก' ?>.</small>';
                        }
                        msgDiv.innerHTML = `🔍 พบข้อมูลสินค้า <b>“${data.data.HanaPart}”</b><br>
                                            📦 Rack: <b>${data.data.Loc_Shelf || 'N/A'}</b> → 
                                            Level: <b>${data.data.Loc_Level || 'N/A'}</b> → 
                                            Box: <b>${data.data.Loc_Box || 'N/A'}</b> → 
                                            Slot: <b>${data.data.Loc_Slot || 'N/A'}</b>
                                            <br>✅ <?= $isEN ? 'Qty Remain' : 'คงเหลือ' ?>: <b>${qtyRemain}</b>${qtySourceNote}
                                            <br><small>📺 <?= $isEN
                                                ? 'TV, 3D and lights will highlight after you save to warehouse.'
                                                : 'TV / 3D / ไฟจะแสดงตำแหน่งหลังกดบันทึกรับเข้าคลังสินค้า' ?></small>`;
                    } else {
                        document.getElementById('im_display').value = '';
                        document.getElementById('qty_display').value = '';
                        document.getElementById('qty_remain_input').value = '';

                        const msgDiv = document.getElementById('dynamicMessage');
                        msgDiv.style.display = 'block';
                        msgDiv.className = 'message warning';
                        msgDiv.innerHTML = '❌ ' + data.message;
                    }
                })
                .catch(err => {
                    console.error('Error fetching API data:', err);
                    const msgDiv = document.getElementById('dynamicMessage');
                    msgDiv.style.display = 'block';
                    msgDiv.className = 'message warning';
                    
                    let errorDetail = err.message;
                    if (err.message.includes('Failed to fetch')) {
                        errorDetail = 'ไม่สามารถเชื่อมต่อกับ Web Server ได้ (อาจติด Proxy หรือ Firewall ที่เครื่องนี้)';
                    }
                    
                    msgDiv.innerHTML = `❌ <b>Network Error:</b> ${errorDetail}<br><small style="font-size:0.7rem;">โปรดตรวจสอบว่าไม่ได้เปิด Proxy หรือ VPN ทิ้งไว้</small>`;
                    
                    // Show alert with more detail for debugging
                    alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล API\n' + err.message);
                })
                .finally(() => {
                    window._isFetchingAPI = false;
                    if (!window._isSubmitting) {
                        setAddStockBusy(false, 'fetch');
                        document.getElementById('puid_input').focus();
                    }
                });
        }

        document.getElementById('addInventoryForm').addEventListener('submit', function (e) {
            if (window._isSubmitting) {
                e.preventDefault();
                return;
            }
            if (window._isFetchingAPI) {
                e.preventDefault();
                return;
            }
            if (!this.checkValidity()) {
                return;
            }
            window._isSubmitting = true;
            setAddStockBusy(true, 'submit');
        });

        document.getElementById('puid_input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchAPIData();
            }
        });

        window.onload = function() {
            const hData = <?= json_encode($success_highlight_data) ?>;
            if (hData && hData.box_id) {
                const msgDiv = document.getElementById('dynamicMessage');
                msgDiv.style.display = 'block';
                msgDiv.className = 'message success';
                const savedPuid = (hData.PUID || document.getElementById('puid_input').value || '').trim();
                const puidLine = savedPuid
                    ? `<br>PUID: <b style="font-family:monospace;">${savedPuid}</b>`
                    : '';
                msgDiv.innerHTML = `📍 <?= $isEN ? 'Stored at' : 'จัดเก็บที่' ?>: <b>${hData.rack_name}</b> → 
                                    <b>Level ${hData.level_no}</b> → 
                                    <b>${hData.box_code}</b> → 
                                    <b>Slot ${hData.slot_no}</b>${puidLine}
                                    <br><small>📺 <?= $isEN ? 'Shown on TV & 3D display.' : 'แสดงบน TV และ 3D แล้ว' ?></small>`;
            }

            const countdownEl = document.getElementById('countdown');
            if (countdownEl) {
                let timeLeft = <?= (int) $highlightDurationSec ?>;
                const refreshTimer = setInterval(function () {
                    timeLeft--;
                    countdownEl.textContent = timeLeft;
                    if (timeLeft <= 0) {
                        clearInterval(refreshTimer);
                        window.location.href = 'add_stock';
                    }
                }, 1000);
            }

            document.getElementById('puid_input').focus();
        };
    </script>
    <script src="assets/form-busy.js"></script>
    <script src="assets/factory.js"></script>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>