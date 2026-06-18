<?php
// scripts/notify_expiry.php

// 1. ความปลอดภัย: อนุญาตให้รันผ่าน Command Line เท่านั้น
if (php_sapi_name() !== 'cli') {
    header('HTTP/1.0 403 Forbidden');
    echo "This script can only be run from the command line.";
    exit;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/expiry_group_service.php';
$mail_config = require __DIR__ . '/../config/mail_config.php';

// ฟังก์ชันสำหรับบันทึก Log
function writeLog($msg)
{
    $logFile = __DIR__ . '/notify_expiry.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $msg" . PHP_EOL, FILE_APPEND);
}

/**
 * @return array{days:int|null,days_text:string,status:string,row_bg:string,date_color:string,badge_bg:string,badge_color:string,label:string}
 */
function notify_expiry_date_meta(?string $dateStr, DateTime $today): array
{
    $unknown = [
        'days' => null,
        'days_text' => '-',
        'status' => 'unknown',
        'row_bg' => '#ffffff',
        'date_color' => '#64748b',
        'badge_bg' => '#f1f5f9',
        'badge_color' => '#64748b',
        'label' => '-',
    ];

    if ($dateStr === null || trim($dateStr) === '') {
        return $unknown;
    }

    $exp = new DateTime($dateStr);
    $exp->setTime(0, 0, 0);
    $base = clone $today;
    $base->setTime(0, 0, 0);
    $diff = (int) round(($exp->getTimestamp() - $base->getTimestamp()) / 86400);

    if ($diff < 0) {
        $days = abs($diff);

        return [
            'days' => $days,
            'days_text' => $days . ' day' . ($days === 1 ? '' : 's') . ' ago',
            'status' => 'expired',
            'row_bg' => '#fef2f2',
            'date_color' => '#991b1b',
            'badge_bg' => '#fee2e2',
            'badge_color' => '#991b1b',
            'label' => 'Expired',
        ];
    }

    if ($diff <= 7) {
        return [
            'days' => $diff,
            'days_text' => $diff . ' day' . ($diff === 1 ? '' : 's') . ' left',
            'status' => 'soon',
            'row_bg' => '#fff7ed',
            'date_color' => '#c2410c',
            'badge_bg' => '#ffedd5',
            'badge_color' => '#9a3412',
            'label' => 'Expiring Soon',
        ];
    }

    return [
        'days' => $diff,
        'days_text' => $diff . ' days left',
        'status' => 'normal',
        'row_bg' => '#f0fdf4',
        'date_color' => '#15803d',
        'badge_bg' => '#dcfce7',
        'badge_color' => '#166534',
        'label' => 'Normal',
    ];
}

function notify_expiry_h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

// 2. ค้นหาผู้ใช้ทุกคนที่มีการลงทะเบียน Email ไว้
$user_emails = [];
$res_users = $condb->query("SELECT email, username FROM users WHERE email IS NOT NULL AND email != ''");
while ($user = $res_users->fetch_assoc()) {
    $user_emails[] = $user['email'];
}

if (empty($user_emails)) {
    writeLog("Error: No registered emails found in users table.");
    die("No registered emails found.\n");
}

// 3. ค้นหาสินค้าที่หมดอายุแล้ว หรือกำลังจะหมดอายุในอีก 7 วัน
$sql = "SELECT PUID, IM, HanaPart, LotNo, QtyRemain, ExpirationDate, ExpireDate_RoomTemp 
        FROM inventory_receive 
        WHERE QtyRemain > 0 
        AND (
            (ExpirationDate IS NOT NULL AND ExpirationDate <= DATE_ADD(NOW(), INTERVAL 7 DAY))
            OR 
            (ExpireDate_RoomTemp IS NOT NULL AND ExpireDate_RoomTemp <= DATE_ADD(NOW(), INTERVAL 7 DAY))
        )
        ORDER BY ExpirationDate ASC, ExpireDate_RoomTemp ASC";

$result = $condb->query($sql);

if ($result->num_rows == 0) {
    writeLog("System Check: No items expired or expiring soon. Email not sent.");
    exit;
}

$rawRows = [];
while ($row = $result->fetch_assoc()) {
    $rawRows[] = $row;
}

$groupedRows = expiry_group_rows($rawRows);
$puidTotal = count($rawRows);
$groupTotal = count($groupedRows);

// 4. เตรียมเนื้อหา Email (Formal Style)
$app_url = app_base_url() . '/public/check_expiration';
$current_date = date('d/m/Y');

$html = "
<!DOCTYPE html>
<html>
<head>
<style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { width: 95%; max-width: 900px; margin: 20px auto; border: 1px solid #ddd; }
    .header { background-color: #1a237e; color: #ffffff; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .info-text { margin-bottom: 20px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background-color: #f5f5f5; border: 1px solid #dddddd; padding: 10px; text-align: center; color: #333; font-weight: bold; }
    td { border: 1px solid #dddddd; padding: 8px; text-align: center; vertical-align: middle; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .days-pill { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-top: 4px; }
    .status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 18px; font-size: 12px; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
    .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #777; border-top: 1px solid #ddd; }
    .btn-link { display: inline-block; padding: 10px 20px; background-color: #1a237e !important; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px; }
</style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2 style='margin:0;'>Inventory Expiration Report</h2>
            <p style='margin:5px 0 0; font-size: 14px;'>Visual Location Management</p>
        </div>
        <div class='content'>
            <div class='info-text'>
                <strong>Date:</strong> $current_date<br>
                <strong>Subject:</strong> Notification of Expired and Near-Expiry Items (within 7 days)<br>
                <strong>Summary:</strong> $groupTotal material group(s) (HanaPart + IM), covering $puidTotal PUID reel(s)<br><br>
                Items are grouped by <strong>HanaPart</strong> and <strong>IM</strong> (one row per material). Open the system for per-PUID detail.
            </div>

            <div class='legend'>
                <span class='legend-item'><span class='legend-dot' style='background:#fecaca;'></span> Expired</span>
                <span class='legend-item'><span class='legend-dot' style='background:#fed7aa;'></span> Expiring within 7 days</span>
                <span class='legend-item'><span class='legend-dot' style='background:#bbf7d0;'></span> More than 7 days left</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width='4%'>No.</th>
                        <th width='18%'>Product Name (HanaPart)</th>
                        <th width='12%'>Material Code (IM)</th>
                        <th width='8%'>PUID Count</th>
                        <th width='12%'>Lot Number(s)</th>
                        <th width='8%'>Total Qty</th>
                        <th width='14%'>Expiration Date</th>
                        <th width='10%'>Days</th>
                        <th width='8%'>Status</th>
                    </tr>
                </thead>
                <tbody>";

$idx = 1;
$today = new DateTime('today');
foreach ($groupedRows as $group) {
    $expirationDate = expiry_earliest_date($group['expiration_dates'] ?? []);

    $rowMeta = notify_expiry_date_meta($expirationDate, $today);
    $expMeta = $rowMeta;

    $expDateStr = $expirationDate ? date('d/m/Y', strtotime($expirationDate)) : '-';
    $lotsText = expiry_format_lots($group['lots'] ?? []);

    $rowBg = notify_expiry_h($rowMeta['row_bg']);
    $daysText = notify_expiry_h($expMeta['days_text']);
    $daysColor = notify_expiry_h($expMeta['date_color']);
    $daysBg = notify_expiry_h($expMeta['badge_bg']);
    $expColor = notify_expiry_h($expMeta['date_color']);
    $badgeBg = notify_expiry_h($rowMeta['badge_bg']);
    $badgeColor = notify_expiry_h($rowMeta['badge_color']);
    $badgeLabel = notify_expiry_h($rowMeta['label']);

    $html .= "
                    <tr style='background-color: {$rowBg};'>
                        <td class='text-center'>$idx</td>
                        <td class='text-left'>" . notify_expiry_h($group['HanaPart']) . "</td>
                        <td class='text-left'>" . notify_expiry_h($group['IM']) . "</td>
                        <td class='text-center'>" . number_format((int) $group['puid_count']) . "</td>
                        <td class='text-left'>" . notify_expiry_h($lotsText) . "</td>
                        <td class='text-center'>" . number_format((int) $group['total_qty']) . "</td>
                        <td class='text-center'>
                            <span style='font-weight:700; color:{$expColor}; display:block;'>$expDateStr</span>
                        </td>
                        <td class='text-center'>
                            <span class='days-pill' style='color:{$daysColor}; background:{$daysBg};'>{$daysText}</span>
                        </td>
                        <td class='text-center'>
                            <span class='status-pill' style='color:{$badgeColor}; background:{$badgeBg};'>{$badgeLabel}</span>
                        </td>
                    </tr>";
    $idx++;
}

$html .= "
                </tbody>
            </table>

            <div style='text-align: center;'>
                <p style='font-size: 14px;'>For detailed information and inventory management, please access the system via the link below:</p>
                <a href='$app_url' class='btn-link'>Access Inventory System</a>
            </div>
        </div>
        <div class='footer'>
            This is an automated message from the Visual Location Management. Please do not reply directly to this email.<br>
            &copy; " . date('Y') . " Hana Project - Visual Location Management
        </div>
    </div>
</body>
</html>";

// 5. ส่ง Email
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = $mail_config['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $mail_config['username'];
    $mail->Password   = $mail_config['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $mail_config['port'];
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($mail_config['from_email'], $mail_config['from_name']);
    foreach ($user_emails as $user_email) {
        $mail->addAddress($user_email);
    }

    $mail->isHTML(true);
    $mail->Subject = 'Visual Location Management: Inventory Expiration Report - ' . $current_date;
    $mail->Body    = $html;

    $mail->send();
    writeLog("Success: Notification sent to " . count($user_emails) . " recipients ($groupTotal groups, $puidTotal PUIDs).");
    echo "Formal notification emails sent successfully.\n";
} catch (Exception $e) {
    writeLog("Error: Mailer Error: {$mail->ErrorInfo}");
    echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}\n";
}
