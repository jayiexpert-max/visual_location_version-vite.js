<?php
// scripts/test_mail.php

if (php_sapi_name() !== 'cli') {
    header('HTTP/1.0 403 Forbidden');
    echo 'This script can only be run from the command line.';
    exit;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';
$mail_config = require __DIR__ . '/../config/mail_config.php';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->SMTPDebug  = 2; // เปิดโหมด Debug (0 = off, 1 = client, 2 = client & server)
    $mail->Host       = $mail_config['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $mail_config['username'];
    $mail->Password   = $mail_config['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $mail_config['port'];
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($mail_config['from_email'], $mail_config['from_name']);
    $mail->addAddress($mail_config['username']); // ส่งหาตัวเองเพื่อทดสอบ

    $mail->isHTML(true);
    $mail->Subject = 'ทดสอบการส่ง Email - Visual Location Management';
    $mail->Body    = 'หากคุณได้รับข้อความนี้ แสดงว่าการตั้งค่า Outlook SMTP ถูกต้องแล้ว';

    $mail->send();
    echo "Test email sent successfully to {$mail_config['username']}\n";
} catch (Exception $e) {
    echo "Test failed. Mailer Error: {$mail->ErrorInfo}\n";
}
