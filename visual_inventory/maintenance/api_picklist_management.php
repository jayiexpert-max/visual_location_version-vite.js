<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard(true);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

// ============================
// JSON ตัวอย่างสำหรับทดสอบ
// ============================
$testData = [
    [
        'Picklist#'       => 'MPL25471547',
        'Req_Line_Name'   => 'OP1_F1_Line 1A',
        'created_at'      => date('Y-m-d H:i:s'),
        'items' => [  // เพิ่มรายละเอียดสินค้าเป็น array
            [
                'HanaPart' => '8011ISTP42108SN',
                'PUID'     => '08636N',
                'Qty'      => 540,
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
    ],
    [
        'Picklist#'       => 'MPL25471548',
        'Req_Line_Name'   => 'OP1_F1_Line 1A',
        'created_at'      => date('Y-m-d H:i:s'),
        'items' => [  // เพิ่มรายละเอียดสินค้าเป็น array
            [
                'HanaPart' => '8011ISTP42108SN',
                'PUID'     => '08636N',
                'Qty'      => 540,
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
    ],
];

// ============================
// ส่ง JSON กลับ
// ============================
echo json_encode([
    'status' => 'success',
    'message' => 'API ทดสอบสำเร็จ',
    'data'   => $testData
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
