<?php
require_once __DIR__ . '/../includes/functions.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Method Not Allowed');
}

$data = json_decode($_POST['data'], true);
$sql = $_POST['sql'] ?? 'Query results';

if (empty($data)) {
    die('No data to export');
}

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();

// Header
$headers = array_keys($data[0]);
$col = 'A';
foreach ($headers as $header) {
    $sheet->setCellValue($col . '1', $header);
    // Style header
    $sheet->getStyle($col . '1')->getFont()->setBold(true);
    $col++;
}

// Data
$rowIdx = 2;
foreach ($data as $row) {
    $col = 'A';
    foreach ($row as $value) {
        $sheet->setCellValue($col . $rowIdx, $value);
        $col++;
    }
    $rowIdx++;
}

// Rename sheet
$sheet->setTitle('Search Results');

// Output to browser
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="AbdulAI_Export_' . date('Ymd_His') . '.xlsx"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
