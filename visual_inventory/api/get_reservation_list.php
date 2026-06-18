<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/reservation_list_service.php';

reservation_list_cleanup_stale($condb);

$cutoffDate = reservation_list_retain_cutoff_date();

$sql = "
    SELECT res_no, req_date, store, status, last_update
    FROM reservation_list
    WHERE req_date IS NOT NULL
      AND DATE(req_date) >= {$cutoffDate}
    UNION
    SELECT
        ReservationNo AS res_no,
        MIN(created_at) AS req_date,
        NULL AS store,
        'Pending' AS status,
        MAX(updated_at) AS last_update
    FROM inventory_receive
    WHERE ReservationNo IS NOT NULL
      AND ReservationNo <> ''
      AND DATE(created_at) >= {$cutoffDate}
      AND ReservationNo NOT IN (SELECT res_no FROM reservation_list)
    GROUP BY ReservationNo
    HAVING DATE(MIN(created_at)) >= {$cutoffDate}
    ORDER BY last_update DESC
    LIMIT 500
";
$res = $condb->query($sql);
$data = [];
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode(['status' => 'success', 'data' => $data]);
