<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . "/../config/session_check.php";

// Mock Data matching the structure expected by show_api_data.php
$testData = [
    [
        'Res_No' => '0015882644',
        'created_at' => date('Y-m-d H:i:s'),
        'Detail' => [
            [
                'HanaPart' => '8011ISTP42108SN',
                'PUID' => '08636N',
                'Qty' => 540,
                'Batch' => 'BATCH-001',
                'Location' => 'Shelf-A',
                'IM' => 'IM001',
                'created_at' => date('Y-m-d H:i:s')
            ],
            [
                'HanaPart' => '8011ISTP42110SN',
                'PUID' => '08638N',
                'Qty' => 150,
                'Batch' => 'BATCH-002',
                'Location' => 'Shelf-B',
                'IM' => 'IM002',
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]
    ],
    [
        'Res_No' => '0015882645',
        'created_at' => date('Y-m-d H:i:s'),
        'Detail' => [
            [
                'HanaPart' => '8011ISTP42109SN',
                'PUID' => '08637N',
                'Qty' => 300,
                'Batch' => 'BATCH-003',
                'Location' => 'Shelf-C',
                'IM' => 'IM003',
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]
    ]
];

// Return all data so the frontend can filter by Res_No
echo json_encode([
    'status' => 'success',
    'data' => $testData
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
