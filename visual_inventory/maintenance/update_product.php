<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard(true);
require_once __DIR__ . '/../config/condb.php';
$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id'] ?? 0);
$type = $data['type'] ?? '';

if(!$id || !in_array($type,['add','withdraw'])){
    echo json_encode(['success'=>false,'message'=>'ข้อมูลไม่ถูกต้อง']);
    exit;
}

// ดึงสินค้าปัจจุบัน
$stmt = $condb->prepare("SELECT qty, name FROM products WHERE id=?");
$stmt->bind_param("i",$id);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows === 0){
    echo json_encode(['success'=>false,'message'=>'ไม่พบสินค้า']);
    exit;
}
$product = $result->fetch_assoc();
$new_qty = $product['qty'] + ($type==='add'?1:-1);
if($new_qty<0) $new_qty = 0;

// update
$upd = $condb->prepare("UPDATE products SET qty=? WHERE id=?");
$upd->bind_param("ii",$new_qty,$id);
$upd->execute();
$upd->close();

echo json_encode([
    'success'=>true,
    'message'=>"สินค้า {$product['name']} จำนวนตอนนี้: {$new_qty}"
]);