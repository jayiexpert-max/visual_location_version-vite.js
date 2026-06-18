<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard(true);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

// ============================
// JSON ตัวอย่างสำหรับทดสอบ
// ============================
$testData = [
    'WorkOrder_Issuing_List' => '12016549-1',
    'created_at'      => date('Y-m-d H:i:s'),
    'IPN' => [  // เพิ่มรายละเอียดสินค้าเป็น array
        [
            'IPN'      =>  '1021ISTI4000039',
            'PUID_FIFO'     => '08636N',
            'Qty'      => 540,
            'Batch'    => '2025100300-1',
            'Location' => 'POS.0.0.0'
        ],
        [
            'IPN'      =>  '1021ISTI4000039',
            'PUID_FIFO'     => '08658V',
            'Qty'      => 340,
            'Batch'    => '2025100300-1',
            'Location' => 'POS.0.0.0'
        ],
        [
            'IPN'      =>  '1021ISTI4000039',
            'PUID_FIFO'     => '07691X',
            'Qty'      => 500,
            'Batch'    => '2025100300-1',
            'Location' => 'POS.0.0.0'
        ],
        [
            'HanaPart' => '8011ISTP42109SN',
            'PUID'     => '08637N',
            'Qty'      => 300,
            'Batch'    => '2025100300-2',
            'Location' => 'POS.0.0.1'
        ],
        [
            'HanaPart' => '8011ISTP42110SN',
            'PUID'     => '08638N',
            'Qty'      => 150,
            'Batch'    => '2025100300-3',
            'Location' => 'POS.0.0.2'
        ]
    ]
];

// ============================
// ส่ง JSON กลับ
// ============================
echo json_encode([
    'status' => 'success',
    'message' => 'API ทดสอบสำเร็จ',
    'data'   => $testData
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
