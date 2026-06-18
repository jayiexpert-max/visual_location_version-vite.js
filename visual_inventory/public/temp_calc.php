<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/dev_guard.php';
dev_guard_or_exit();

require_once("../config/condb.php");

$model_code = '3003IST6000329A';
$production_qty = 1440;

echo "Calculating for Model: $model_code, Quantity: $production_qty\n";

// 1. Get model_id
$stmt = $condb->prepare("SELECT id FROM models WHERE model_code = ?");
$stmt->bind_param("s", $model_code);
$stmt->execute();
$model = $stmt->get_result()->fetch_assoc();

if (!$model) {
    die("Model not found: $model_code\n");
}
$selected_model_id = $model['id'];

// 2. Get the latest revision
$revStmt = $condb->prepare("
    SELECT id, revision, remark 
    FROM model_revisions 
    WHERE model_id = ? 
    ORDER BY revision DESC 
    LIMIT 1
");
$revStmt->bind_param("i", $selected_model_id);
$revStmt->execute();
$revision = $revStmt->get_result()->fetch_assoc();

if (!$revision) {
    die("No revision found for model $model_code\n");
}
echo "Latest Revision ID: " . $revision['id'] . " (Rev: " . $revision['revision'] . ")\n";

// 3. Get BOM items
$bomSql = "
    SELECT 
        m.material_code, 
        m.description, 
        b.qty as required_per_unit
    FROM bom_items b
    JOIN materials m ON b.material_id = m.id
    WHERE b.revision_id = ?
";
$bomStmt = $condb->prepare($bomSql);
$bomStmt->bind_param("i", $revision['id']);
$bomStmt->execute();
$bomItems = $bomStmt->get_result();

$shortage = false;
$results = [];

while ($item = $bomItems->fetch_assoc()) {
    $matCode = $item['material_code'];
    $reqPerUnit = floatval($item['required_per_unit']);
    $totalRequired = $reqPerUnit * $production_qty;

    // 4. Get Physical Stock
    $stockSql = "SELECT SUM(QtyRemain) as total_stock FROM inventory_receive WHERE HanaPart = ?";
    $stockStmt = $condb->prepare($stockSql);
    $stockStmt->bind_param("s", $matCode);
    $stockStmt->execute();
    $stockRes = $stockStmt->get_result()->fetch_assoc();
    $physicalStock = floatval($stockRes['total_stock'] ?? 0);

    // 5. Get Reserved Stock
    $reservedSql = "
        SELECT SUM(bi.qty * pr.production_qty) as reserved_qty
        FROM production_reservations pr
        JOIN bom_items bi ON pr.revision_id = bi.revision_id
        JOIN materials m ON bi.material_id = m.id
        WHERE pr.status = 'active'
        AND m.material_code = ?
    ";
    $resStmt = $condb->prepare($reservedSql);
    $resStmt->bind_param("s", $matCode);
    $resStmt->execute();
    $resResult = $resStmt->get_result()->fetch_assoc();
    $reservedStock = floatval($resResult['reserved_qty'] ?? 0);

    $effectiveStock = $physicalStock - $reservedStock;
    $balance = $effectiveStock - $totalRequired;

    if ($balance < 0) {
        $shortage = true;
    }

    $results[] = [
        'material' => $matCode,
        'required' => $totalRequired,
        'available' => $effectiveStock,
        'balance' => $balance,
        'status' => ($balance >= 0 ? 'Sufficient' : 'Shortage')
    ];
}

if (empty($results)) {
    echo "No BOM items found for this model.\n";
} else {
    foreach ($results as $res) {
        printf(
            "%-20s | Req: %10.2f | Avail: %10.2f | Bal: %10.2f | %s\n",
            $res['material'],
            $res['required'],
            $res['available'],
            $res['balance'],
            $res['status']
        );
    }

    if ($shortage) {
        echo "\nRESULT: NOT ENOUGH materials for $production_qty units.\n";
    } else {
        echo "\nRESULT: READY to produce $production_qty units.\n";
    }
}
