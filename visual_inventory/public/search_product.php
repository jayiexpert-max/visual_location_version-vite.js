<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once __DIR__ . '/../config/warehouse_structure.php';
require_once __DIR__ . '/../config/io_device_service.php';
require_once __DIR__ . '/../config/warehouse_highlight_service.php';
require_once __DIR__ . '/../config/inventory_api_service.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function sp_normalize_search_term(string $term): string
{
    $term = trim($term);
    $term = preg_replace('/^(vl)/i', '', $term);

    return strtoupper($term);
}

function sp_fetch_box_layout(mysqli $condb, int $boxId): string
{
    if ($boxId <= 0) {
        return '1x1';
    }
    $stmt = $condb->prepare('SELECT layout FROM boxes WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $boxId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row['layout'] ?? '1x1';
}

/**
 * @return array<string, mixed>|null
 */
function sp_find_by_hanapart(mysqli $condb, string $hanaPart): ?array
{
    $stmt = $condb->prepare("
        SELECT p.id, p.qty, p.name AS hana_part, sl.id AS slot_id, sl.slot_no,
               x.id AS box_id, x.box_code, x.layout, l.level_no, r.name AS rack_name
        FROM products p
        JOIN slots sl ON p.slot_id = sl.id
        JOIN boxes x ON sl.box_id = x.id
        JOIN levels l ON x.level_id = l.id
        JOIN racks r ON l.rack_id = r.id
        WHERE p.name = ?
        ORDER BY p.qty DESC
        LIMIT 1
    ");
    $stmt->bind_param('s', $hanaPart);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }

    $row['search_term'] = $hanaPart;
    $row['search_mode'] = 'hanapart';
    $row['puid'] = '';

    return $row;
}

/**
 * @param array<string, mixed> $loc
 * @return array<string, mixed>|null
 */
function sp_product_from_location(mysqli $condb, array $loc, string $puid): ?array
{
    $boxId = (int) ($loc['box_id'] ?? 0);
    if ($boxId <= 0) {
        return null;
    }

    return [
        'id' => 0,
        'qty' => (int) ($loc['QtyRemain'] ?? $loc['qty'] ?? 0),
        'hana_part' => (string) ($loc['HanaPart'] ?? ''),
        'puid' => (string) ($loc['PUID'] ?? $puid),
        'search_term' => $puid,
        'search_mode' => 'puid',
        'slot_id' => (int) ($loc['slot_id'] ?? 0),
        'slot_no' => $loc['slot_no'] ?? '',
        'box_id' => $boxId,
        'box_code' => (string) ($loc['box_code'] ?? ''),
        'layout' => sp_fetch_box_layout($condb, $boxId),
        'level_no' => $loc['level_no'] ?? '',
        'rack_name' => (string) ($loc['rack_name'] ?? ''),
    ];
}

/**
 * @return array<string, mixed>|null
 */
function sp_find_by_puid(mysqli $condb, string $puid): ?array
{
    $puid = sp_normalize_search_term($puid);
    if ($puid === '') {
        return null;
    }

    $loc = wh_resolve_location_by_puid($condb, $puid);
    if ($loc) {
        $product = sp_product_from_location($condb, $loc, $puid);
        if ($product) {
            return $product;
        }
    }

    $api = inventory_fetch_by_puid($condb, $puid);
    if (($api['status'] ?? '') === 'success' && !empty($api['data']['box_id'])) {
        $data = $api['data'];
        return [
            'id' => 0,
            'qty' => (int) ($data['QtyRemain'] ?? $data['Qty'] ?? 0),
            'hana_part' => (string) ($data['HanaPart'] ?? ''),
            'puid' => (string) ($data['PUID'] ?? $puid),
            'search_term' => $puid,
            'search_mode' => 'puid',
            'slot_id' => (int) ($data['slot_id'] ?? 0),
            'slot_no' => $data['Loc_Slot'] ?? '',
            'box_id' => (int) $data['box_id'],
            'box_code' => (string) ($data['Loc_Box'] ?? ''),
            'layout' => sp_fetch_box_layout($condb, (int) $data['box_id']),
            'level_no' => $data['Loc_Level'] ?? '',
            'rack_name' => (string) ($data['Loc_Shelf'] ?? ''),
        ];
    }

    $candidates = inventory_puid_lookup_candidates($puid);
    $row = null;
    if ($candidates !== []) {
        $upper = array_map('strtoupper', $candidates);
        $placeholders = implode(',', array_fill(0, count($upper), '?'));
        $stmt = $condb->prepare("
            SELECT HanaPart FROM inventory_receive
            WHERE UPPER(PUID) IN ({$placeholders})
              AND QtyRemain > 0
              AND StatusName NOT IN ('Withdrawn', 'Empty')
            LIMIT 1
        ");
        if ($stmt) {
            $types = str_repeat('s', count($upper));
            $stmt->bind_param($types, ...$upper);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        }
    }

    if ($row && !empty($row['HanaPart'])) {
        $byPart = sp_find_by_hanapart($condb, $row['HanaPart']);
        if ($byPart) {
            $byPart['puid'] = $puid;
            $byPart['search_term'] = $puid;
            $byPart['search_mode'] = 'puid';
        }
        return $byPart;
    }

    return null;
}

/**
 * @return array<string, mixed>|null
 */
function sp_resolve_search(mysqli $condb, string $query): ?array
{
    $query = sp_normalize_search_term($query);
    if ($query === '') {
        return null;
    }

    $product = sp_find_by_hanapart($condb, $query);
    if ($product) {
        return $product;
    }

    return sp_find_by_puid($condb, $query);
}

$message = "";
$message_type = "";
$product = null;
$io_skip_auto_trigger = false;

// POST ค้นหาสินค้า (HanaPart หรือ PUID)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $search_query = sp_normalize_search_term($_POST['product_name'] ?? '');

    if ($search_query === '') {
        $message = '⚠️ ' . (__('logout') == 'Logout' ? 'Please enter HanaPart or PUID' : 'กรุณาระบุ HanaPart หรือ PUID');
        $message_type = 'warning';
    } else {
        $product = sp_resolve_search($condb, $search_query);

        if (!$product) {
            $message = '❌ ' . (__('logout') == 'Logout' ? 'Not found: ' : 'ไม่พบ ') . '<b>“' . htmlspecialchars($search_query) . '”</b> '
                . (__('logout') == 'Logout' ? '(HanaPart or PUID in system)' : '(HanaPart หรือ PUID ในระบบ)');
            $message_type = 'warning';
        } else {
            $isEN = __('logout') == 'Logout';
            $displayPart = htmlspecialchars($product['hana_part'] ?: $search_query);
            $locationLine = '📦 Rack: <b>' . htmlspecialchars($product['rack_name']) . '</b> → '
                . 'Level: <b>' . htmlspecialchars((string) $product['level_no']) . '</b> → '
                . 'Box: <b>' . htmlspecialchars($product['box_code']) . '</b> → '
                . 'Slot: <b>' . htmlspecialchars((string) $product['slot_no']) . '</b>';

            if (($product['search_mode'] ?? '') === 'puid') {
                $message = '🔍 ' . ($isEN ? 'PUID found: ' : 'พบ PUID: ') . '<b>“' . htmlspecialchars($product['puid']) . '”</b><br>'
                    . ($isEN ? 'HanaPart: ' : 'HanaPart: ') . '<b>' . $displayPart . '</b><br>'
                    . $locationLine . '<br>'
                    . ($isEN ? 'Quantity Remain: ' : 'จำนวนคงเหลือ: ') . '<b>' . (int) $product['qty'] . '</b>';
            } else {
                $message = '🔍 ' . ($isEN ? 'Product found: ' : 'พบสินค้า ') . '<b>“' . $displayPart . '”</b><br>'
                    . $locationLine . '<br>'
                    . ($isEN ? 'Quantity Remain: ' : 'จำนวนคงเหลือ: ') . '<b>' . (int) $product['qty'] . '</b>';
            }
            $message_type = 'success';

            $trigger_box_id = $product['box_id'];

            wh_highlight_location($condb, [
                'product_name' => $product['hana_part'] ?: $search_query,
                'box_id' => $product['box_id'],
                'slot_id' => $product['slot_id'],
                'slot_no' => $product['slot_no'],
                'box_code' => $product['box_code'],
                'level_no' => $product['level_no'],
                'rack_name' => $product['rack_name'],
                'qty' => $product['qty'],
                'action_type' => 'search',
                'puid' => $product['puid'] ?? '',
            ], true);
            $io_skip_auto_trigger = true;
        }
    }
}

// โหลด layout (batch — avoids N+1 per rack/level)
$warehouse = warehouse_hierarchy($condb, 'id');

$isEN = __('logout') == 'Logout';
$page_title = __('search_title');
$page_icon = 'fa-search';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
    <link href="assets/rack-layout.css?v=20260607" rel="stylesheet">
</head>

<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="fx-scan-page">

        <?php if ($message): ?>
            <div class="message <?= $message_type ?>"><?= $message ?></div>
        <?php endif; ?>

        <div class="fx-scan-toolbar">
            <a href="search_product" class="fx-btn fx-btn-secondary"><i class="fas fa-eraser"></i>
                <?= $isEN ? 'Clear' : 'ล้างการค้นหา' ?></a>
            <button type="button" class="fx-btn fx-btn-danger" onclick="resetAllLights()">
                <i class="fas fa-lightbulb"></i> <?= $isEN ? 'Reset all lights' : 'ดับไฟทั้งหมด' ?>
            </button>
        </div>

        <form method="POST" id="searchForm" class="fade-in" onsubmit="sanitizeSearch()">
            <div class="fx-form-panel fx-search-panel">
                <label for="searchInput" class="fx-search-panel__title">
                    <?= $isEN ? 'Enter HanaPart or PUID to search' : 'สแกนหรือพิมพ์ HanaPart / PUID' ?>
                </label>
                <div class="fx-scan-row">
                    <div class="fx-search-field">
                        <input type="text" name="product_name" id="searchInput" class="fx-scan-input"
                            placeholder="<?= __('search_placeholder') ?>"
                            value="<?= htmlspecialchars($_POST['product_name'] ?? '') ?>" required autofocus
                            oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                        <div id="inputLoader" class="fx-search-loader" aria-hidden="true">
                            <i class="fas fa-circle-notch fa-spin"></i>
                        </div>
                    </div>
                    <button type="submit" class="fx-btn fx-btn-accent" id="btnSearch">
                        <i class="fas fa-search"></i> <?= __('search_btn') ?>
                    </button>
                </div>
            </div>
        </form>

        <script>
            function sanitizeSearch() {
                const input = document.getElementById('searchInput');
                let val = input.value.trim();
                val = val.replace(/^(vl)/i, '');
                input.value = val;
            }
        </script>

        <section class="fx-rack-section">
            <h3 class="fx-section-title"><?= __('rack_overview') ?></h3>

            <div class="fx-rack-layout">
                <?php
                $delay = 0;
                foreach ($warehouse['racks'] as $rack):
                    $delay += 0.1;
                ?>
                    <div class="fx-rack fx-rack-stagger" style="animation-delay: <?= $delay ?>s">
                        <h3>Rack: <?= htmlspecialchars($rack['name']) ?></h3>

                        <?php
                        foreach ($warehouse['levels_by_rack'][(int) $rack['id']] ?? [] as $level):
                        ?>
                            <div class="fx-rack-level">
                                <h4>Level <?= $level['level_no'] ?></h4>
                                <div class="fx-rack-level__boxes">
                                    <?php foreach ($warehouse['boxes_by_level'][(int) $level['id']] ?? [] as $box):
                                        $box_class = 'fx-rack-box';
                                        if ($product && $product['box_id'] == $box['id']) {
                                            $box_class .= ' is-highlighted';
                                        }
                                    ?>
                                        <div class="<?= $box_class ?>"
                                            onclick="showModal(<?= $box['id'] ?>, <?= (int) ($product['slot_id'] ?? 0) ?>, '<?= htmlspecialchars($box['layout'], ENT_QUOTES) ?>')">
                                            <?= htmlspecialchars($box['box_code']) ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>

                    </div>
                <?php endforeach; ?>
            </div>
        </section>
    </div>

    <div class="fx-rack-modal" id="boxModal">
        <div class="fx-rack-modal__panel">
            <h3 class="fx-rack-modal__title"><?= __('box_details') ?></h3>
            <div id="modalSlots" class="fx-rack-modal__slots">
                <?= $isEN ? 'Loading...' : 'กำลังโหลด...' ?></div>
            <button type="button" class="fx-btn fx-btn-secondary fx-btn-block" onclick="closeModal()">
                <i class="fas fa-times"></i> <?= __('close') ?>
            </button>
        </div>
    </div>

    <script>
        window.onload = function() {
            document.getElementById('searchInput').focus();
        };

        function showModal(box_id, highlight_slot_id, layout) {
            const modal = document.getElementById('boxModal');
            const modalSlots = document.getElementById('modalSlots');
            const isEN = <?= json_encode(__('logout') == 'Logout') ?>;

            // Show Skeleton Loader
            let gridCols = layout.includes('x') ? parseInt(layout.split('x')[0]) : 1;
            modalSlots.style.display = 'grid';
            modalSlots.style.gridTemplateColumns = 'repeat(' + gridCols + ', 1fr)';
            modalSlots.style.gap = '8px';

            let skeletonHtml = '';
            for (let i = 0; i < 6; i++) {
                skeletonHtml += '<div class="fx-rack-skeleton"></div>';
            }
            modalSlots.innerHTML = skeletonHtml;
            modal.classList.add('is-open');

            fetch('get_box_layout?box_id=' + box_id + '&highlight_slot_id=' + highlight_slot_id)
                .then(res => res.json())
                .then(data => {
                    modalSlots.innerHTML = '';

                    let gridCols = layout.includes('x') ? parseInt(layout.split('x')[0]) : 1;
                    let totalSlots = data.slots.length;

                    // Grid Styling matching add_stock
                    modalSlots.style.display = 'grid';
                    modalSlots.style.gridTemplateColumns = 'repeat(' + gridCols + ', 1fr)';
                    modalSlots.style.gap = '8px';

                    // Logic to arrange slots bottom-to-top (Depth style) similar to add_stock logic
                    let gridRows = Math.ceil(totalSlots / gridCols);
                    let arrangedSlots = [];

                    for (let r = 0; r < gridRows; r++) {
                        for (let c = 0; c < gridCols; c++) {
                            // Calculate index mapping
                            let slotIndex = (c * gridRows) + (gridRows - 1 - r);
                            if (data.slots[slotIndex]) {
                                arrangedSlots.push(data.slots[slotIndex]);
                            } else {
                                arrangedSlots.push({
                                    empty: true
                                });
                            }
                        }
                    }

                    arrangedSlots.forEach((s, idx) => {
                        let div = document.createElement('div');
                        div.className = 'fx-rack-slot fade-in';
                        div.style.animationDelay = (idx * 0.05) + 's';

                        if (s.empty) {
                            div.style.visibility = 'hidden';
                            div.style.border = 'none';
                            div.style.background = 'transparent';
                        } else {
                            if (s.highlight) div.classList.add('is-highlighted');

                            let puidsHtml = '';
                            if (s.puids && s.puids.length > 0) {
                                puidsHtml = `<div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:3px; justify-content:center;">
                                    ${s.puids.map(p => `<span class="fx-puid-tag">${p}</span>`).join('')}
                                </div>`;
                            }

                            let productInfo = s.name
                                ? `<div style="font-size:0.75rem; margin-top:4px; color:var(--fx-text-muted);">${s.name}<br><strong style="color:var(--fx-accent);">${s.qty}</strong>${puidsHtml}</div>`
                                : `<div style="font-size:0.75rem; margin-top:4px; color:var(--fx-danger);">${isEN ? 'Empty' : 'ว่าง'}</div>`;

                            div.innerHTML = `<div style="font-weight:bold; color:var(--fx-text);">${s.slot_no}</div>${productInfo}`;
                        }
                        modalSlots.appendChild(div);
                    });
                })
                .catch(err => {
                    const isEN = <?= json_encode(__('logout') == 'Logout') ?>;
                    modalSlots.innerHTML = `<div class="message warning">${isEN ? 'Error loading data' : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}</div>`;
                    console.error(err);
                });
        }

        function closeModal() {
            document.getElementById('boxModal').classList.remove('is-open');
        }

        // Close modal on click outside
        window.onclick = function(event) {
            const modal = document.getElementById('boxModal');
            if (event.target == modal) {
                closeModal();
            }
        }

        // Auto Refresh Logic is now handled by io_auto_trigger_script.php
        <?php if ($product): ?>
            /* setTimeout(() => {
                fetch('api_tv_highlight.php?action=clear')
                    .then(() => {
                        window.location.href = 'search_product.php';
                    })
                    .catch(err => {
                        console.error("Error clearing highlight", err);
                        window.location.href = 'search_product.php';
                    });
            }, 60000); */
        <?php endif; ?>
    </script>

    <?php include("io_auto_trigger_script.php"); ?>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>