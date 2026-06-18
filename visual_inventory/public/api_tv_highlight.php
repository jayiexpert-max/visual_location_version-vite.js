<?php
// api_tv_highlight.php - API for TV Display Highlight System
// Manages real-time search highlights between users and TV display
// TV kiosk: read-only "get" via TV_KIOSK_KEY; "set"/"clear" require login.

require_once __DIR__ . '/../config/auth_helpers.php';

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'get') {
    require_once __DIR__ . '/../config/tv_kiosk_auth.php';
    public_display_try_bypass();
    tv_kiosk_try_bypass();
}

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/warehouse_highlight_service.php';

$highlightFile = wh_tv_highlight_file();

// Ensure data directory exists
$dataDir = dirname($highlightFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

switch ($action) {
    case 'set':
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data && !empty($_POST)) {
            $data = $_POST;
        }

        if (empty($data['product_name']) && empty($data['box_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Missing required data']);
            exit;
        }

        if (!wh_push_tv_highlight($data)) {
            echo json_encode(['status' => 'error', 'message' => 'Failed to write highlight file']);
            exit;
        }

        $highlight = json_decode((string) file_get_contents($highlightFile), true);
        echo json_encode(['status' => 'success', 'message' => 'Highlight set', 'data' => $highlight]);
        break;

    case 'get':
        if (!file_exists($highlightFile)) {
            echo json_encode(['status' => 'success', 'data' => null]);
            exit;
        }

        $highlight = json_decode(file_get_contents($highlightFile), true);

        if (!$highlight || (isset($highlight['expires_at']) && time() > $highlight['expires_at'])) {
            echo json_encode(['status' => 'success', 'data' => null]);
            exit;
        }

        echo json_encode(['status' => 'success', 'data' => $highlight]);
        break;

    case 'clear':
        if (file_exists($highlightFile)) {
            unlink($highlightFile);
        }
        echo json_encode(['status' => 'success', 'message' => 'Highlight cleared']);
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action. Use: set, get, clear']);
        break;
}
