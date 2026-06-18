<?php
session_set_cookie_params(['path' => '/']);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ทำลาย session ทั้งหมด
session_unset();
session_destroy();

// เปลี่ยนเส้นทางกลับไปหน้า login
echo "<script>alert('ออกจากระบบเรียบร้อยแล้ว'); window.location='login';</script>";
exit;
