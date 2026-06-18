<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';

$product_id = intval($_POST['product_id'] ?? 0);
$qty = intval($_POST['qty'] ?? 1);
$user_id = $_SESSION['user_id'] ?? 0;

$isEN = (__('logout') == 'Logout');
$response = ['status' => 'error', 'message' => $isEN ? 'Unable to perform transaction' : 'ไม่สามารถทำรายการได้'];

if ($product_id > 0 && $qty > 0) {
    // ตรวจสอบสินค้า
    $stmt = $condb->prepare("SELECT name, qty FROM products WHERE id=?");
    $stmt->bind_param("i", $product_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows == 0) {
        $response['message'] = $isEN ? 'Product not found' : 'ไม่พบสินค้า';
    } else {
        $p = $result->fetch_assoc();
        if ($p['qty'] < $qty) {
            $response['message'] = $isEN ? 'Insufficient stock' : 'จำนวนสินค้าไม่พอ';
        } else {
            $new_qty = $p['qty'] - $qty;
            $update = $condb->prepare("UPDATE products SET qty=? WHERE id=?");
            $update->bind_param("ii", $new_qty, $product_id);
            $update->execute();

            // log
            $log_stmt = $condb->prepare("INSERT INTO stock_logs(product_id,user_id,action,quantity) VALUES(?,?,'withdraw',?)");
            $log_stmt->bind_param("iii", $product_id, $user_id, $qty);
            $log_stmt->execute();

            $response = ['status' => 'success', 'name' => $p['name'], 'new_qty' => $new_qty];
        }
    }
}

header('Content-Type: application/json');
echo json_encode($response);
