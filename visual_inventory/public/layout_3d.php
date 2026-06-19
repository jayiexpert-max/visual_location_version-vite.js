<?php
// layout_3d.php - 3D Layout Visualization (public display — no login required)

require_once __DIR__ . '/../config/tv_kiosk_auth.php';
public_display_try_bypass();
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/ip_whitelist.php';
ip_whitelist_deny_if_blocked('LAYOUT_3D_ALLOWED_IPS');
require_once("../config/condb.php");

// Load language (default: Thai)
if (!isset($_SESSION)) session_start();
if (!isset($_SESSION['lang'])) $_SESSION['lang'] = 'th';
if (isset($_GET['lang'])) $_SESSION['lang'] = $_GET['lang'];
$lang = $_SESSION['lang'];

// Language translations
$texts = [
    'en' => [
        'title' => '3D Layout',
        'subtitle' => 'Click boxes to inspect contents',
        'monitoring' => 'Live Monitoring Active',
        'sound_enable' => 'Enable Sound',
        'sound_active' => 'Sound Active',
        'reset_view' => 'Reset View',
        'box_info' => 'Box Info',
        'loading' => 'Loading 3D World...',
        'analyzing' => 'Analyzing contents...',
        'found_product' => 'Found Product',
        'live_highlight' => 'Location highlight active',
        'live_highlight_hint' => 'See details in the right panel',
        'puid' => 'PUID',
        'rack' => 'Rack',
        'level' => 'Floor (Level)',
        'box_code' => 'Box Code',
        'slot_no' => 'Slot',
        'qty' => 'Quantity Available',
        'total_items' => 'Total Items',
        'stored' => 'Stored',
        'empty' => 'Empty'
    ],
    'th' => [
        'title' => 'ผัง 3 มิติ',
        'subtitle' => 'คลิกที่กล่องเพื่อดูรายละเอียด',
        'monitoring' => 'ระบบติดตามแบบเรียลไทม์',
        'sound_enable' => 'เปิดเสียง',
        'sound_active' => 'ระบบเสียงพร้อมใช้งาน',
        'reset_view' => 'รีเซ็ตมุมมอง',
        'box_info' => 'รายละเอียดกล่อง',
        'loading' => 'กำลังโหลดโลก 3 มิติ...',
        'analyzing' => 'กำลังวิเคราะห์ข้อมูล...',
        'found_product' => 'พบสินค้า',
        'live_highlight' => 'กำลังแสดงตำแหน่ง',
        'live_highlight_hint' => 'ดูรายละเอียดที่การ์ดด้านขวา',
        'puid' => 'PUID',
        'rack' => 'แร็ค',
        'level' => 'ชั้นที่',
        'box_code' => 'รหัสกล่อง',
        'slot_no' => 'Slot',
        'qty' => 'จำนวนคงเหลือ',
        'total_items' => 'จํานวนรายการ',
        'stored' => 'รายการ',
        'empty' => 'ว่าง'
    ]
];
$t = $texts[$lang] ?? $texts['th'];


// Fetch data safely
$racks_data = [];
$racks_result = $condb->query("SELECT * FROM racks ORDER BY id ASC");

if ($racks_result) {
    while ($rack = $racks_result->fetch_assoc()) {
        $rack_info = [
            'id' => (int)$rack['id'],
            'name' => $rack['name'],
            'levels' => []
        ];

        // Fetch Levels
        $levels_result = $condb->query("SELECT * FROM levels WHERE rack_id={$rack['id']} ORDER BY level_no ASC");
        if ($levels_result) {
            while ($level = $levels_result->fetch_assoc()) {
                $level_info = [
                    'id' => (int)$level['id'],
                    'level_no' => (int)$level['level_no'],
                    'boxes' => []
                ];

                $boxes_result = $condb->query("SELECT * FROM boxes WHERE level_id={$level['id']} ORDER BY id ASC");
                if ($boxes_result) {
                    while ($box = $boxes_result->fetch_assoc()) {
                        $level_info['boxes'][] = [
                            'id' => (int)$box['id'],
                            'box_code' => $box['box_code'],
                            'layout' => $box['layout'] ?? '1x1'
                        ];
                    }
                }
                $rack_info['levels'][] = $level_info;
            }
        }
        $racks_data[] = $rack_info;
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Shelf Layout | Visual Location Management</title>
    <!-- Babylon.js — lazy-loaded before 3D init -->
    <!-- Font Awesome -->
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <!-- Google Fonts -->
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link rel="icon" type="image/png" href="assets/favicon.png">


        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/layout-3d.css?v=20260607">
</head>

<body>

    <div id="loading-screen">
        <div class="loader"></div>
        <div id="loading-text"><?= $t['loading'] ?></div>
    </div>

    <canvas id="renderCanvas"></canvas>


    <div id="ui-overlay">
        <div class="title-card" id="mainCard">
            <h1><i class="fas fa-cubes"></i> <?= $t['title'] ?></h1>
            <p><?= $t['subtitle'] ?></p>
            <div id="search-status" style="margin-top: 10px; font-size: 0.8rem; color: #10b981; display: none;">
                <i class="fas fa-satellite-dish"></i> <?= $t['monitoring'] ?>
            </div>
            <div id="hlBanner" class="hl-banner" hidden>
                <div class="hl-banner-title"><i class="fas fa-satellite-dish"></i> <?= $t['live_highlight'] ?></div>
                <div id="hlStatus" class="hl-banner-status"><?= $t['live_highlight_hint'] ?></div>
            </div>
        </div>
        <div id="soundToggle" onclick="toggleAudio()" style="margin-left: 20px; pointer-events: auto; background: #ef4444; border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 12px 20px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; font-weight: 600; backdrop-filter: blur(12px); box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: all 0.3s;">
            <i class="fas fa-volume-mute" id="soundIcon"></i>
            <span id="soundText"><?= $t['sound_enable'] ?></span>
        </div>
        <button id="resetViewBtn" onclick="resetCamera()" style="margin-left: 10px; pointer-events: auto; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); color: white; padding: 12px 20px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; font-weight: 600; backdrop-filter: blur(12px); box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: all 0.2s;">
            <i class="fas fa-undo"></i> <?= $t['reset_view'] ?>
        </button>

        <!-- Language Switcher -->
        <div class="lang-switch">
            <a href="javascript:void(0)" onclick="switchLang('th')" class="<?= $lang == 'th' ? 'active' : '' ?>">TH</a>
            <a href="javascript:void(0)" onclick="switchLang('en')" class="<?= $lang == 'en' ? 'active' : '' ?>">EN</a>
        </div>
    </div>

    <div class="box-info-panel" id="infoPanel">
        <div class="panel-header">
            <span id="panelTitle"><?= $t['box_info'] ?></span>
            <i class="fas fa-times panel-close" onclick="resetFocus()"></i>
        </div>
        <div class="panel-content" id="panelContent">
            <!-- Will be populated by JS -->
            Loading...
        </div>
    </div>

    <div class="controls-info">
        <i class="fas fa-mouse"></i> Left: Rotate | Right: Pan | Scroll: Zoom | Click Box: Open
    </div>

    <!-- Error container -->
    <div id="js-error" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:red; z-index:9999; background: #000; padding:20px; max-width: 80%; overflow: auto;"></div>

    <script src="assets/tts-voice-picker.js?v=20260616"></script>
    <script src="assets/rack-slot-layout.js?v=20260607"></script>
    <script>
        window.onerror = function(message, source, lineno, colno, error) {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('js-error').style.display = 'block';
            document.getElementById('js-error').innerHTML += "JS Error: " + message + " at line " + lineno + "<br>";
            console.error(error);
        };

        function loadBabylonScripts() {
            const scripts = [
                'plugins/babylonjs/babylon.js',
                'plugins/babylonjs/babylonjs.loaders.min.js',
                'plugins/babylonjs/babylon.gui.min.js'
            ];
            return scripts.reduce((chain, src) => chain.then(() => new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load ' + src));
                document.head.appendChild(script);
            })), Promise.resolve());
        }

        window.addEventListener('DOMContentLoaded', function() {
            loadBabylonScripts()
                .then(function() { setTimeout(startApp, 100); })
                .catch(function(err) {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('js-error').style.display = 'block';
                    document.getElementById('js-error').innerText = err.message;
                });
        });

        const isEN = <?= json_encode($lang == 'en') ?>;
        // Global State
        let scene, engine, camera;

        let boxMeshes = {};
        let currentFocusBox = null;
        let originalBoxPosition = null;
        let originalCameraState = null;
        let activeBlocks = [];
        let activeBouncingSphere = null;
        let lastHighlightData = null;
        let isAudioUnlocked = false;

        function switchLang(l) {
            const url = new URL(window.location.href);
            url.searchParams.set('lang', l);
            if (isAudioUnlocked) url.searchParams.set('sound', '1');
            window.location.href = url.toString();
        }

        // Constants - ADJUSTED FOR VISUALIZATION
        const RACK_WIDTH = 3.0; // Increased from 2.0
        const RACK_DEPTH = 1.2; // Increased from 1.0
        const LEVEL_HEIGHT = 1.4; // Increased from 1.0
        const DEFAULT_BOX_SIZE = 0.8; // Increased from 0.55
        const RACK_SPACING = 4.5; // Increased from 3.5 to accommodate wider racks
        const SHELF_THICKNESS = 0.08; // Slightly thicker shelves

        // Inject PHP Data safely
        const warehouseData = <?php echo json_encode($racks_data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;

        // Global State - Add initial camera state
        let initialCameraState = null;

        function startApp() {
            if (typeof BABYLON === 'undefined') {
                document.getElementById('loading-text').innerHTML =
                    "<span class='error-message'>Error: Babylon.js not loaded.</span>";
                document.querySelector('.loader').style.display = 'none';
                return;
            }

            const canvas = document.getElementById("renderCanvas");
            try {
                engine = new BABYLON.Engine(canvas, true);
                scene = createScene();

                engine.runRenderLoop(function() {
                    if (scene) scene.render();
                });

                window.addEventListener("resize", function() {
                    engine.resize();
                });

                scene.executeWhenReady(() => {
                    document.getElementById("loading-screen").style.opacity = "0";
                    document.getElementById("search-status").style.display = "block";
                    setTimeout(() => {
                        document.getElementById("loading-screen").style.display = "none";
                    }, 500);

                    startMonitoring();
                    processUrlSearch();
                });

            } catch (e) {
                console.error(e);
                document.getElementById('js-error').style.display = 'block';
                document.getElementById('js-error').innerText = "Init Error: " + e.message;
            }
        }

        function createScene() {
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color4(220 / 255, 225 / 255, 235 / 255, 1);

            // Camera (Initially looking into the U-shape room)
            camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 3, 2), scene);
            camera.attachControl(document.getElementById("renderCanvas"), true);
            camera.lowerRadiusLimit = 2;
            camera.upperRadiusLimit = 80;
            camera.wheelPrecision = 50;

            // Store Initial State
            initialCameraState = {
                alpha: camera.alpha,
                beta: camera.beta,
                radius: camera.radius,
                target: camera.target.clone(),
                position: camera.position.clone()
            };

            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
            light.intensity = 0.8;

            // Materials
            const rackMat = new BABYLON.StandardMaterial("rackMat", scene);
            rackMat.diffuseColor = new BABYLON.Color3(0.3, 0.35, 0.4);

            const shelfMat = new BABYLON.StandardMaterial("shelfMat", scene);
            shelfMat.diffuseColor = new BABYLON.Color3(0.5, 0.55, 0.6);

            // Box Materials per Rack
            const boxColors = [
                new BABYLON.Color3.FromHexString("#ef4444"), // R1: Red
                new BABYLON.Color3.FromHexString("#22c55e"), // R2: Green
                new BABYLON.Color3.FromHexString("#eab308"), // R3: Yellow
                new BABYLON.Color3.FromHexString("#3b82f6"), // R4: Blue
                new BABYLON.Color3.FromHexString("#ec4899") // R5: Pink
            ];

            const rackBoxMats = boxColors.map((color, idx) => {
                const mat = new BABYLON.StandardMaterial("boxMatRack-" + idx, scene);
                mat.diffuseColor = color;
                mat.emissiveColor = color.scale(0.2);
                mat.transparencyMode = 2; // BABYLON.Material.MATERIAL_ALPHATESTANDBLEND
                mat.alpha = 1.0;
                return mat;
            });

            const defaultBoxMat = new BABYLON.StandardMaterial("boxMatDefault", scene);
            defaultBoxMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
            defaultBoxMat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
            defaultBoxMat.transparencyMode = 2;
            defaultBoxMat.alpha = 1.0;

            // Build Layout - U-Shaped Arrangement
            warehouseData.forEach((rack, rIndex) => {
                let xPos = 0,
                    zPos = 0,
                    yRot = 0;

                // Pattern: R1(Left), R2(TopL), R3(TopR), R4(RightT), R5(RightB)
                if (rIndex === 0) { // Rack 1 (Left side, face Right)
                    xPos = -4.5;
                    zPos = 0;
                    yRot = -Math.PI / 2;
                } else if (rIndex === 1) { // Rack 2 (Back-Left, face Down)
                    xPos = -1.6;
                    zPos = 4.5;
                    yRot = 0;
                } else if (rIndex === 2) { // Rack 3 (Back-Right, face Down)
                    xPos = 1.6;
                    zPos = 4.5;
                    yRot = 0;
                } else if (rIndex === 3) { // Rack 4 (Right-Top, face Left)
                    xPos = 4.5;
                    zPos = 1.6;
                    yRot = Math.PI / 2;
                } else if (rIndex === 4) { // Rack 5 (Right-Bottom, face Left)
                    xPos = 4.5;
                    zPos = -1.6;
                    yRot = Math.PI / 2;
                } else {
                    // Fallback for extra racks: simple line along Z far away
                    xPos = -10 + (rIndex * 4);
                    zPos = -10;
                    yRot = 0;
                }

                const rackRoot = new BABYLON.TransformNode("rackRoot-" + rack.id, scene);
                rackRoot.position = new BABYLON.Vector3(xPos, 0, zPos);
                rackRoot.rotation.y = yRot;

                const maxLevels = rack.levels.length;
                const rackHeight = maxLevels * LEVEL_HEIGHT;
                const poleHeight = rackHeight + 0.5;

                // Poles
                const poles = [-RACK_WIDTH / 2, RACK_WIDTH / 2];
                const poled = [-RACK_DEPTH / 2, RACK_DEPTH / 2];
                poles.forEach(px => {
                    poled.forEach(pz => {
                        const pole = BABYLON.MeshBuilder.CreateBox("pole", {
                            height: poleHeight,
                            width: 0.1,
                            depth: 0.1
                        }, scene);
                        if (pole) {
                            pole.parent = rackRoot;
                            pole.position = new BABYLON.Vector3(px, poleHeight / 2, pz);
                            pole.material = rackMat;
                            pole.isPickable = false;
                        }
                    });
                });

                // Top Cover (Roof)
                const topCover = BABYLON.MeshBuilder.CreateBox("topCover-" + rack.id, {
                    width: RACK_WIDTH,
                    height: SHELF_THICKNESS,
                    depth: RACK_DEPTH
                }, scene);
                if (topCover) {
                    topCover.parent = rackRoot;
                    topCover.position = new BABYLON.Vector3(0, rackHeight, 0);
                    topCover.material = shelfMat;
                    topCover.isPickable = false;
                }

                // Rack Label - 3D Floating/Rotating Style
                const labelRoot = new BABYLON.TransformNode("labelRoot-" + rack.id, scene);
                labelRoot.parent = rackRoot;
                labelRoot.position = new BABYLON.Vector3(0, poleHeight + 0.8, 0);

                const createLabelPlane = (name, rotationY) => {
                    const p = BABYLON.MeshBuilder.CreatePlane(name, {
                        width: 3,
                        height: 1.5
                    }, scene);
                    p.parent = labelRoot;
                    p.rotation.y = rotationY;
                    p.isPickable = false;

                    const adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(p, 512, 256);
                    const text = new BABYLON.GUI.TextBlock();
                    text.text = rack.name;
                    text.color = "#00f2fe"; // Cyan Glow
                    text.fontSize = 140;
                    text.fontWeight = "bold";
                    text.outlineWidth = 5;
                    text.outlineColor = "#3b82f6"; // Blue outline
                    adt.addControl(text);
                    return p;
                };

                // Create two planes in X-shape so it's visible from all sides
                createLabelPlane("p1", 0);
                createLabelPlane("p2", Math.PI / 2);

                // Add Rotation Animation
                const animRotation = new BABYLON.Animation("rackLabelRot", "rotation.y", 15, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                animRotation.setKeys([{
                        frame: 0,
                        value: 0
                    },
                    {
                        frame: 100,
                        value: Math.PI * 2
                    }
                ]);
                labelRoot.animations = [animRotation];
                // scene.beginAnimation(labelRoot, 0, 100, true);

                // Levels & Boxes
                rack.levels.forEach((level, lIndex) => {
                    const yPos = (maxLevels - (lIndex)) * LEVEL_HEIGHT - (LEVEL_HEIGHT / 2);

                    // Shelf
                    const shelf = BABYLON.MeshBuilder.CreateBox("shelf", {
                        width: RACK_WIDTH,
                        height: SHELF_THICKNESS,
                        depth: RACK_DEPTH
                    }, scene);
                    if (shelf) {
                        shelf.parent = rackRoot;
                        shelf.position = new BABYLON.Vector3(0, yPos - (LEVEL_HEIGHT / 2) + SHELF_THICKNESS / 2, 0);
                        shelf.material = shelfMat;
                        shelf.isPickable = false;
                    }

                    const boxCount = level.boxes.length;
                    if (boxCount > 0) {
                        const availableWidth = RACK_WIDTH - 0.2;
                        const widthPerBox = availableWidth / boxCount;
                        let boxScale = Math.min(DEFAULT_BOX_SIZE, widthPerBox * 0.90);

                        const startBoxX = -(RACK_WIDTH / 2) + 0.1;

                        level.boxes.forEach((box, bIndex) => {
                            const bX = startBoxX + (bIndex * widthPerBox) + (widthPerBox / 2);
                            const shelfY = yPos - (LEVEL_HEIGHT / 2) + SHELF_THICKNESS / 2;
                            const bY = shelfY + (SHELF_THICKNESS / 2) + (boxScale / 2);

                            const boxMesh = BABYLON.MeshBuilder.CreateBox("box-" + box.id, {
                                width: boxScale,
                                height: boxScale,
                                depth: boxScale
                            }, scene);

                            if (boxMesh) {
                                boxMesh.parent = rackRoot;
                                boxMesh.position = new BABYLON.Vector3(bX, bY, 0);
                                const baseMat = (rIndex < rackBoxMats.length) ? rackBoxMats[rIndex] : defaultBoxMat;
                                boxMesh.material = baseMat.clone("boxMat-" + box.id);

                                // Add text label to the front of the box (facing -Z)
                                const labelPlane = BABYLON.MeshBuilder.CreatePlane("boxLabel-" + box.id, {
                                    width: boxScale * 0.8,
                                    height: boxScale * 0.8
                                }, scene);
                                labelPlane.parent = boxMesh;
                                labelPlane.position = new BABYLON.Vector3(0, 0, -(boxScale / 2) - 0.01);
                                labelPlane.isPickable = false;

                                const adtBox = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane, 512, 512);
                                const textBlock = new BABYLON.GUI.TextBlock();
                                textBlock.text = box.box_code;
                                textBlock.color = "white";
                                textBlock.fontSize = 180;
                                textBlock.fontWeight = "bold";
                                textBlock.outlineWidth = 8;
                                textBlock.outlineColor = "black";
                                adtBox.addControl(textBlock);

                                boxMeshes[box.id] = boxMesh;

                                boxMesh.metadata = {
                                    type: 'box',
                                    id: box.id,
                                    code: box.box_code,
                                    rack: rack.name,
                                    level: level.level_no,
                                    layout: box.layout,
                                    size: boxScale,
                                    originalEmissive: baseMat.emissiveColor.clone()
                                };

                                boxMesh.actionManager = new BABYLON.ActionManager(scene);
                                boxMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, function(ev) {
                                    if (currentFocusBox !== boxMesh) {
                                        if (ev.meshSource && ev.meshSource.material) {
                                            ev.meshSource.material.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.6);
                                        }
                                        document.body.style.cursor = "pointer";
                                    }
                                }));
                                boxMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, function(ev) {
                                    if (currentFocusBox !== boxMesh) {
                                        if (ev.meshSource && ev.meshSource.material) {
                                            ev.meshSource.material.emissiveColor = ev.meshSource.metadata.originalEmissive || new BABYLON.Color3(0.05, 0.1, 0.2);
                                        }
                                        document.body.style.cursor = "default";
                                    }
                                }));
                                boxMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function(ev) {
                                    if (currentFocusBox === boxMesh) {
                                        resetFocus();
                                    } else {
                                        focusBox(boxMesh);
                                    }
                                }));
                            }
                        });
                    }
                });
            });

            return scene;
        }

        // --- Interaction Logic ---
        function resetCamera() {
            resetFocus(); // Ensure any focused box is de-focused first

            if (camera && initialCameraState) {
                const animSpeed = 120; // Increased from 60 to make it slower (120 frames at 30fps = 4s)

                BABYLON.Animation.CreateAndStartAnimation("camAlpha", camera, "alpha", 30, animSpeed, camera.alpha, initialCameraState.alpha, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                BABYLON.Animation.CreateAndStartAnimation("camBeta", camera, "beta", 30, animSpeed, camera.beta, initialCameraState.beta, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                BABYLON.Animation.CreateAndStartAnimation("camRadius", camera, "radius", 30, animSpeed, camera.radius, initialCameraState.radius, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                BABYLON.Animation.CreateAndStartAnimation("camTarget", camera, "target", 30, animSpeed, camera.target, initialCameraState.target, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            }
        }

        function resetFocus() {
            if (activeBlocks) {
                activeBlocks.forEach(m => {
                    if (m) m.dispose();
                });
                activeBlocks = [];
            }
            if (activeBouncingSphere) {
                activeBouncingSphere.dispose();
                activeBouncingSphere = null;
            }

            if (currentFocusBox && originalBoxPosition) {
                BABYLON.Animation.CreateAndStartAnimation("animBack", currentFocusBox, "position", 30, 60, currentFocusBox.position, originalBoxPosition, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                if (currentFocusBox.material) {
                    currentFocusBox.material.alpha = 1.0;
                    currentFocusBox.material.emissiveColor = currentFocusBox.metadata.originalEmissive || new BABYLON.Color3(0.05, 0.1, 0.2);
                }
                currentFocusBox = null;
                originalBoxPosition = null;
            }

            const infoPanel = document.getElementById('infoPanel');
            if (infoPanel) infoPanel.classList.remove('active');

            // Clear Highlight Data
            lastHighlightData = null;
        }

        /** Instant reset when switching to a new TV highlight (no animation delay). */
        function resetFocusInstant() {
            if (activeBlocks) {
                activeBlocks.forEach(m => {
                    if (m) m.dispose();
                });
                activeBlocks = [];
            }
            if (activeBouncingSphere) {
                activeBouncingSphere.dispose();
                activeBouncingSphere = null;
            }

            if (currentFocusBox && originalBoxPosition) {
                currentFocusBox.position = originalBoxPosition.clone();
                if (currentFocusBox.material) {
                    currentFocusBox.material.alpha = 1.0;
                    currentFocusBox.material.emissiveColor = currentFocusBox.metadata.originalEmissive || new BABYLON.Color3(0.05, 0.1, 0.2);
                }
                currentFocusBox = null;
                originalBoxPosition = null;
            }

            const infoPanel = document.getElementById('infoPanel');
            if (infoPanel) infoPanel.classList.remove('active');
        }

        function focusBox(mesh, highlightSlotId = null) {
            if (currentFocusBox && currentFocusBox !== mesh) {
                if (activeBlocks) {
                    activeBlocks.forEach(m => m.dispose());
                    activeBlocks = [];
                }
                if (currentFocusBox && originalBoxPosition) {
                    currentFocusBox.position = originalBoxPosition.clone();
                    currentFocusBox.material.alpha = 1.0;
                    currentFocusBox.material.emissiveColor = currentFocusBox.metadata.originalEmissive || new BABYLON.Color3(0.05, 0.1, 0.2);
                }
                currentFocusBox = null;
                originalBoxPosition = null;
            }

            if (!mesh) return;
            if (currentFocusBox === mesh && highlightSlotId) {
                showSlotsOnBox(mesh, highlightSlotId);
                return;
            }
            if (currentFocusBox === mesh) return;

            // SAVE CAMERA STATE
            if (!currentFocusBox) {
                originalCameraState = {
                    position: camera.position.clone(),
                    target: camera.target.clone(),
                    radius: camera.radius
                };
            }

            currentFocusBox = mesh;
            originalBoxPosition = mesh.position.clone();

            const targetPosLocal = originalBoxPosition.clone();
            targetPosLocal.z -= 1.6; // Pull out towards room center

            // 1. CALCULATE TARGET VALUES
            const worldBoxPos = mesh.absolutePosition;
            const rackRoot = mesh.parent;
            const rotY = rackRoot.rotation.y;

            // Final Camera Target (The Box)
            const worldTarget = mesh.absolutePosition.clone();

            // Final Camera Angles
            let targetAlpha = camera.alpha;
            let targetBeta = Math.PI / 3; // Slight top-down

            if (Math.abs(rotY) < 0.1) { // R2, R3 (Back)
                targetAlpha = -Math.PI / 2;
            } else if (rotY < -0.5) { // R1 (Left)
                targetAlpha = 0;
            } else { // R4, R5 (Right)
                targetAlpha = -Math.PI; // Face Right side (Shortest path from front)
            }

            // Shortest path logic for Alpha
            while (targetAlpha - camera.alpha > Math.PI) targetAlpha -= 2 * Math.PI;
            while (targetAlpha - camera.alpha < -Math.PI) targetAlpha += 2 * Math.PI;

            // Animation Config
            const animSpeed = 45; // Smooth transition speed

            // Create Animations
            const animTarget = new BABYLON.Animation("animTarget", "target", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animTarget.setKeys([{
                frame: 0,
                value: camera.target
            }, {
                frame: 100,
                value: worldTarget
            }]);

            const animAlpha = new BABYLON.Animation("animAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animAlpha.setKeys([{
                frame: 0,
                value: camera.alpha
            }, {
                frame: 100,
                value: targetAlpha
            }]);

            const animBeta = new BABYLON.Animation("animBeta", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animBeta.setKeys([{
                frame: 0,
                value: camera.beta
            }, {
                frame: 100,
                value: targetBeta
            }]);

            const animRadius = new BABYLON.Animation("animRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animRadius.setKeys([{
                frame: 0,
                value: camera.radius
            }, {
                frame: 100,
                value: 5.5
            }]);

            // Execute Camera Animation
            scene.beginDirectAnimation(camera, [animTarget, animAlpha, animBeta, animRadius], 0, 100, false, 1.0, () => {
                // 2. Animate Box Pull Out
                BABYLON.Animation.CreateAndStartAnimation("animOut", mesh, "position", 30, 60, mesh.position, targetPosLocal, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
                    showSlotsOnBox(mesh, highlightSlotId);
                });
            });

            if (mesh.material) {
                mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.6);
                mesh.material.alpha = 0.2;
            }

            const panel = document.getElementById('infoPanel');
            document.getElementById('panelTitle').innerHTML = `<i class="fas fa-box"></i> ${mesh.metadata.code}`;
            document.getElementById('panelContent').innerHTML = `<div style="text-align:center; padding:20px; color:#cbd5e1;"><i class="fas fa-circle-notch fa-spin"></i> Analyzing contents...</div>`;
            panel.classList.add('active');
        }

        function showSlotsOnBox(mesh, highlightSlotId) {
            if (!mesh || !mesh.metadata) return;
            const layout = mesh.metadata.layout;
            const boxId = mesh.metadata.id;
            const boxSize = mesh.metadata.size || DEFAULT_BOX_SIZE;

            if (activeBlocks) {
                activeBlocks.forEach(m => {
                    if (m) m.dispose();
                });
                activeBlocks = [];
            }
            if (activeBouncingSphere) {
                activeBouncingSphere.dispose();
                activeBouncingSphere = null;
            }

            fetch(`get_box_layout.php?box_id=${boxId}&highlight_slot_id=${highlightSlotId || 0}`)
                .then(res => res.json())
                .then(resData => {
                    const slotsData = resData.slots || [];
                    generateSlotMeshes(mesh, layout, slotsData, highlightSlotId, boxSize);

                    // Rich UI Update
                    let highlightInfoHtml = "";

                    const hasLiveHighlight = !!(highlightSlotId || (lastHighlightData && String(lastHighlightData.box_id) === String(mesh.metadata.id)));
                    if (hasLiveHighlight) {
                        const foundSlot = findHighlightedSlot(slotsData, highlightSlotId);
                        const partName = escapePanelText(highlightPartName(foundSlot));
                        const slotNo = foundSlot
                            ? foundSlot.slot_no
                            : (lastHighlightData && lastHighlightData.slot_no != null ? lastHighlightData.slot_no : '—');
                        const qtyVal = highlightQtyValue(foundSlot);
                        const hlPuid = (lastHighlightData && lastHighlightData.puid)
                            ? String(lastHighlightData.puid).trim()
                            : '';
                        const puidBlock = hlPuid
                            ? `<div class="puid-highlight">
                                <div class="highlight-title"><i class="fas fa-barcode"></i> <?= $t['puid'] ?></div>
                                <div class="puid-val">${escapePanelText(hlPuid)}</div>
                               </div>`
                            : '';
                        const rackName = (lastHighlightData && lastHighlightData.rack_name)
                            ? escapePanelText(lastHighlightData.rack_name)
                            : escapePanelText(mesh.metadata.rack);
                        const levelNo = (lastHighlightData && lastHighlightData.level_no != null && lastHighlightData.level_no !== '')
                            ? escapePanelText(lastHighlightData.level_no)
                            : escapePanelText(mesh.metadata.level);
                        const boxCode = (lastHighlightData && lastHighlightData.box_code)
                            ? escapePanelText(lastHighlightData.box_code)
                            : escapePanelText(mesh.metadata.code);
                        highlightInfoHtml = `
                            <div class="product-highlight">
                                <div class="highlight-title">🔍 <?= $t['found_product'] ?>:</div>
                                <div class="product-name">${partName}</div>
                            </div>
                            ${puidBlock}
                            <div class="location-path">
                                <div class="location-step"><span class="step-label"><?= $t['rack'] ?>:</span> <span class="step-val">${rackName}</span></div>
                                <div class="location-step"><span class="step-label"><?= $t['level'] ?>:</span> <span class="step-val">${levelNo}</span></div>
                                <div class="location-step"><span class="step-label"><?= $t['box_code'] ?>:</span> <span class="step-val">${boxCode}</span></div>
                                <div class="location-step"><span class="step-label"><?= $t['slot_no'] ?>:</span> <span class="step-val active">${escapePanelText(slotNo)}</span></div>
                            </div>
                            <div class="qty-box">
                                <span class="qty-label"><?= $t['qty'] ?></span>
                                <span class="qty-val ${qtyVal == 0 ? 'zero' : ''}">${escapePanelText(qtyVal)}</span>
                            </div>
                         `;
                    }

                    if (!highlightInfoHtml) {
                        // Default View
                        let itemsCount = slotsData.filter(s => s.name).length;
                        highlightInfoHtml = `
                            <div class="location-path">
                                <div class="location-step"><span class="step-label"><?= $t['rack'] ?>:</span> <span class="step-val">${mesh.metadata.rack}</span></div>
                                <div class="location-step"><span class="step-label"><?= $t['level'] ?>:</span> <span class="step-val">${mesh.metadata.level}</span></div>
                                <div class="location-step"><span class="step-label"><?= $t['box_code'] ?>:</span> <span class="step-val">${mesh.metadata.code}</span></div>
                            </div>
                           <div class="detail-row">
                               <span class="detail-label">Layout Config:</span>
                               <span class="detail-value">${layout}</span>
                           </div>
                           <div style="border-top:1px solid #334155; margin:15px 0;"></div>
                           <div class="detail-row">
                               <span class="detail-label"><?= $t['total_items'] ?>:</span>
                               <span class="detail-value" style="color:${itemsCount>0?'#10b981':'#ef4444'}">${itemsCount} <?= $t['stored'] ?></span>
                           </div>
                        `;
                    }

                    document.getElementById('panelContent').innerHTML = highlightInfoHtml;
                })
                .catch(err => {
                    console.error("Error fetching slots", err);
                    document.getElementById('panelContent').innerHTML = "<span style='color:red'>Error loading data</span>";
                });
        }

        function generateSlotMeshes(parentBox, layoutStr, slotsData, highlightSlotId, boxSize) {
            const innerSize = boxSize * 0.96;
            const cells = RackSlotLayout.gridCells(layoutStr, (slotsData || []).length);

            const emptyMat = new BABYLON.StandardMaterial("emptyMat", scene);
            emptyMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.1);
            emptyMat.alpha = 0.8;

            const filledMat = new BABYLON.StandardMaterial("filledMat", scene);
            filledMat.diffuseColor = new BABYLON.Color3(0.0, 0.9, 0.5);

            const hlMat = new BABYLON.StandardMaterial("hlMat", scene);
            hlMat.diffuseColor = new BABYLON.Color3(1, 0.7, 0);

            // Container Frame (box-local — rotates with box label face)
            const containerFrame = BABYLON.MeshBuilder.CreateBox("frame", {
                width: boxSize,
                height: boxSize,
                depth: boxSize
            }, scene);
            containerFrame.parent = parentBox;
            containerFrame.position = BABYLON.Vector3.Zero();
            containerFrame.material = new BABYLON.StandardMaterial("frameMat", scene);
            containerFrame.material.wireframe = true;
            containerFrame.material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            containerFrame.material.alpha = 0.1;
            activeBlocks.push(containerFrame);

            // Same grid as search_product showModal: slot 1 = bottom-left = front-left in 3D
            cells.forEach(function (cell) {
                const slotData = slotsData[cell.slotIndex];
                const pos = RackSlotLayout.position3D(cell.col, cell.visRow, cell.gridCols, cell.gridRows, innerSize);

                const slotMesh = BABYLON.MeshBuilder.CreateBox("s", {
                    width: pos.cellW * 0.9,
                    depth: pos.cellD * 0.9,
                    height: boxSize * 0.8
                }, scene);

                slotMesh.parent = parentBox;
                slotMesh.position = new BABYLON.Vector3(pos.x, 0, pos.z);

                if (slotData && slotData.name) {
                    slotMesh.material = filledMat;
                } else {
                    slotMesh.material = emptyMat;
                    slotMesh.scaling.y = 0.05;
                    slotMesh.position.y -= (boxSize * 0.38);
                }

                if (slotData && (slotData.highlight || (highlightSlotId && slotData.id == highlightSlotId))) {
                    slotMesh.material = hlMat;
                    createBouncingIndicator(slotMesh, slotData.slot_no);
                }

                slotMesh.actionManager = new BABYLON.ActionManager(scene);
                slotMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, function(ev) {
                    // Tooltip removed as we now have detail panel
                }));

                activeBlocks.push(slotMesh);
            });
        }

        function createBouncingIndicator(targetMesh, slotNo) {
            if (activeBouncingSphere) activeBouncingSphere.dispose();

            const sphere = BABYLON.MeshBuilder.CreateSphere("ind", {
                diameter: 0.2 // Slightly larger
            }, scene);
            if (sphere) {
                if (targetMesh.parent) sphere.parent = targetMesh.parent;
                sphere.position = targetMesh.position.clone();
                sphere.position.y += 0.35;

                const mat = new BABYLON.StandardMaterial("indMat", scene);
                mat.diffuseColor = new BABYLON.Color3(1, 0.4, 0);
                mat.emissiveColor = new BABYLON.Color3(1, 0.2, 0);
                sphere.material = mat;

                // Create Label on top of the Sphere
                const labelPlane = BABYLON.MeshBuilder.CreatePlane("ballLabel", {
                    size: 0.35
                }, scene);
                labelPlane.parent = sphere;
                labelPlane.position = new BABYLON.Vector3(0, 0.15, 0);
                labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                labelPlane.renderingGroupId = 1;

                const adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane);
                const txt = new BABYLON.GUI.TextBlock();
                txt.text = slotNo.toString();
                txt.color = "black";
                txt.fontSize = 240;
                txt.fontWeight = "bold";
                adt.addControl(txt);

                const keys = [];
                keys.push({
                    frame: 0,
                    value: sphere.position.y
                });
                keys.push({
                    frame: 20,
                    value: sphere.position.y + 0.25
                });
                keys.push({
                    frame: 40,
                    value: sphere.position.y
                });

                const anim = new BABYLON.Animation("float", "position.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                anim.setKeys(keys);
                sphere.animations.push(anim);
                scene.beginAnimation(sphere, 0, 40, true);

                activeBouncingSphere = sphere;
            }
        }

        function escapePanelText(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function findHighlightedSlot(slotsData, highlightSlotId) {
            if (!Array.isArray(slotsData) || slotsData.length === 0) {
                return null;
            }
            let found = highlightSlotId
                ? slotsData.find(function (s) { return String(s.id) === String(highlightSlotId); })
                : null;
            if (!found && lastHighlightData) {
                if (lastHighlightData.slot_id) {
                    found = slotsData.find(function (s) {
                        return String(s.id) === String(lastHighlightData.slot_id);
                    });
                }
                if (!found && lastHighlightData.slot_no != null && lastHighlightData.slot_no !== '') {
                    found = slotsData.find(function (s) {
                        return String(s.slot_no) === String(lastHighlightData.slot_no);
                    });
                }
            }
            return found || null;
        }

        function highlightPartName(foundSlot) {
            const h = lastHighlightData;
            if (h) {
                const fromHighlight = String(h.product_name || h.HanaPart || h.material_code || '').trim();
                if (fromHighlight) {
                    return fromHighlight;
                }
            }
            return foundSlot && foundSlot.name ? String(foundSlot.name) : '—';
        }

        function highlightQtyValue(foundSlot) {
            const h = lastHighlightData;
            if (h && h.qty !== undefined && h.qty !== null && h.qty !== '') {
                return h.qty;
            }
            return foundSlot ? foundSlot.qty : 0;
        }

        function highlightSig(h) {
            if (!h) return '';
            return String(h.highlight_seq || ((h.updated_at || h.expires_at || '') + '-' + h.box_id + '-' + h.slot_id));
        }

        function showHighlightBanner() {
            const banner = document.getElementById('hlBanner');
            if (!banner) {
                return;
            }
            banner.hidden = false;
        }

        function hideHighlightBanner() {
            const banner = document.getElementById('hlBanner');
            if (banner) {
                banner.hidden = true;
            }
        }

        function startMonitoring() {
            let lastSig = "";
            setInterval(() => {
                fetch('api_tv_highlight.php?action=get&_=' + Date.now(), { cache: 'no-store' })
                    .then(r => r.json())
                    .then(d => {
                        if (d.status === 'success' && d.data) {
                            const h = d.data;
                            const sig = highlightSig(h);
                            if (sig !== lastSig) {
                                console.log("[Monitor] New highlight detected:", h);
                                lastSig = sig;
                                lastHighlightData = h;
                                showHighlightBanner();
                                resetFocusInstant();
                                if (boxMeshes[h.box_id]) {
                                    focusBox(boxMeshes[h.box_id], h.slot_id);

                                    const card = document.getElementById('mainCard');
                                    card.classList.add('search-active');
                                    setTimeout(() => card.classList.remove('search-active'), 5000);

                                    const speakText = isEN ?
                                        `Rack ${formatForTTS(h.rack_name, false)}, Level ${formatForTTS(h.level_no, false)}, Box ${formatForTTS(h.box_code, false)}, Slot ${formatForTTS(h.slot_no, false)}` :
                                        `แร็ค ${formatForTTS(h.rack_name, true)}... ชั้น ${formatForTTS(h.level_no, true)}... กล่อง ${formatForTTS(h.box_code, true)}... ช่อง ${formatForTTS(h.slot_no, true)}`;

                                    speak(speakText);
                                }
                            }
                        } else {
                            if (lastSig !== "") {
                                lastSig = "";
                                lastHighlightData = null;
                                hideHighlightBanner();
                                window.location.reload();
                            }
                        }
                    }).catch(e => console.log("Monitor error", e));
            }, 500);
        }

        // --- TTS & Audio Logic ---
        function formatForTTS(str, isThaiLanguage = false) {
            if (!str) return '';
            let s = str.toString();

            if (isThaiLanguage) {
                s = s.replace(/-/g, ' ขีด ');
                // English letters phonetic in Thai context
                s = s.replace(/A/gi, ' เอ ');
                s = s.replace(/B/gi, ' บี ');
                s = s.replace(/C/gi, ' ซี ');
                s = s.replace(/D/gi, ' ดี ');
                s = s.replace(/E/gi, ' อี ');
                return s;
            } else {
                return s;
            }
        }

        let voices = [];
        let currentUtterance = null;
        // isAudioUnlocked is already declared at the top of the script
        const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT197h4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh=");


        function loadVoices() {
            voices = window.TtsVoicePicker ? TtsVoicePicker.loadVoices() : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
            return voices;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoices();
                const dbg = new URLSearchParams(location.search).get('tts_debug');
                if (window.TtsVoicePicker && dbg === '1') {
                    TtsVoicePicker.logVoices(voices, 'th');
                } else if (window.TtsVoicePicker && dbg === 'en') {
                    TtsVoicePicker.logVoices(voices, 'en');
                }
            };
            loadVoices();
        }

        function toggleAudio(force = null) {
            if (force !== null) isAudioUnlocked = !force; // will be toggled below

            if (isAudioUnlocked && force === null) {
                // Disable
                isAudioUnlocked = false;
                localStorage.setItem('layout_audio_enabled', 'false');
                updateAudioUI(false);
                window.speechSynthesis.cancel();
            } else {
                // Enable
                isAudioUnlocked = true;
                localStorage.setItem('layout_audio_enabled', 'true');
                updateAudioUI(true);

                if (voices.length === 0) loadVoices();
                console.log(`[Audio] Enabled. Lang: ${isEN ? 'EN' : 'TH'}. Initializing speech...`);
                const testMsg = isEN ? "3D Audio Online" : "ระบบเสียง 3D พร้อมใช้งาน";
                if (window.TtsVoicePicker) {
                    TtsVoicePicker.speak(testMsg, voices, !isEN, { rate: isEN ? 0.65 : (TtsVoicePicker.THAI_SPEECH_RATE || 0.42) });
                }
            }
        }

        function updateAudioUI(enabled) {
            const btn = document.getElementById('soundToggle');
            const icon = document.getElementById('soundIcon');
            const text = document.getElementById('soundText');

            if (enabled) {
                if (btn) {
                    btn.style.background = '#10b981';
                    btn.style.borderColor = 'rgba(255,255,255,0.4)';
                }
                if (icon) icon.className = 'fas fa-volume-up';
                if (text) text.innerText = <?= json_encode($t['sound_active']) ?>;
            } else {
                if (btn) {
                    btn.style.background = '#ef4444';
                    btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
                if (icon) icon.className = 'fas fa-volume-mute';
                if (text) text.innerText = <?= json_encode($t['sound_enable']) ?>;
            }
        }

        function processUrlSearch() {
            const params = new URLSearchParams(window.location.search);
            const searchName = params.get('search');
            if (searchName) {
                // Fetch location from API
                fetch('api_find_location.php?name=' + encodeURIComponent(searchName))
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            const p = data.data;
                            if (boxMeshes[p.box_id]) {
                                // Simulation highlight data structure for focusBox
                                lastHighlightData = {
                                    product_name: searchName,
                                    rack_name: p.rack_name,
                                    level_no: p.level_no,
                                    box_code: p.box_code,
                                    slot_no: p.slot_no,
                                    box_id: p.box_id,
                                    slot_id: p.slot_id,
                                    qty: p.qty
                                };
                                focusBox(boxMeshes[p.box_id], p.slot_id);

                                // Show Found Message
                                const card = document.getElementById('mainCard');
                                card.classList.add('search-active');
                                setTimeout(() => card.classList.remove('search-active'), 5000);

                                // TTS
                                setTimeout(() => {
                                    const speakText = isEN ?
                                        `Rack ${formatForTTS(p.rack_name, false)} Level ${formatForTTS(p.level_no, false)} Box ${formatForTTS(p.box_code, false)} Slot ${formatForTTS(p.slot_no, false)}` :
                                        `แร็ค ${formatForTTS(p.rack_name, true)}... ชั้น ${formatForTTS(p.level_no, true)}... กล่อง ${formatForTTS(p.box_code, true)}... ช่อง ${formatForTTS(p.slot_no, true)}`;
                                    speak(speakText);
                                }, 1000);
                            } else {
                                console.warn("Box mesh not found for ID:", p.box_id);
                            }
                        } else {
                            console.warn("Product location not found:", searchName);
                        }
                    })
                    .catch(err => console.error("Search error:", err));
            }
        }

        // Auto-unlock if was enabled or via URL
        window.addEventListener('load', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const wasEnabled = localStorage.getItem('layout_audio_enabled') === 'true' || urlParams.get('sound') === '1';

            if (wasEnabled) {
                isAudioUnlocked = true;
                updateAudioUI(true);
            }
        });

        function speak(text) {
            if (!isAudioUnlocked || !('speechSynthesis' in window)) {
                console.warn("3D Speech skipped: Unlocked=" + isAudioUnlocked);
                return;
            }

            if (voices.length === 0) {
                loadVoices();
                if (voices.length === 0) {
                    console.warn("No voices available yet, waiting...");
                    setTimeout(() => speak(text), 500);
                    return;
                }
            }

            const forThai = !isEN;
            if (window.TtsVoicePicker) {
                TtsVoicePicker.speak(text, voices, forThai, { rate: forThai ? (TtsVoicePicker.THAI_SPEECH_RATE || 0.42) : 0.65 });
            }
        }
    </script>
</body>

</html>