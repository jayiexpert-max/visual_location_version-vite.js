<?php

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/EthernetIO.php';

/**
 * IO device service — PHP sender to Raspi WiFi gateway (production) or legacy Modbus/HTTP (dev only).
 */

function io_highlight_duration_sec(): int
{
    $sec = (int) (env('IO_HIGHLIGHT_DURATION_SEC', '60') ?? 60);
    return $sec > 0 ? $sec : 60;
}

function io_raspi_io_key(): string
{
    return trim(env('RASPI_IO_KEY', '') ?? '');
}

function io_legacy_direct_allowed(): bool
{
    return is_development();
}

/** true = highlight/off ใช้เฉพาะ Tower Light ที่ Rack (ไม่ยิง Output Pin ของ Box) */
function io_tower_only(): bool
{
    $v = strtolower(trim(env('IO_TOWER_ONLY', 'false') ?? 'false'));
    return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

function io_fetch_device(mysqli $condb, int $deviceId): ?array
{
    if ($deviceId <= 0) {
        return null;
    }

    $stmt = $condb->prepare('SELECT * FROM ethernet_ios WHERE id = ?');
    $stmt->bind_param('i', $deviceId);
    $stmt->execute();
    $device = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $device ?: null;
}

/**
 * @return array{location: array<string, mixed>, devices: array<int, array{device: array, outputs: array<int, array<string, mixed>>}>}|null
 */
function io_resolve_box_plan(mysqli $condb, int $boxId, string $action = 'highlight', ?int $slotNo = null): ?array
{
    if ($boxId <= 0) {
        return null;
    }

    $stmt = $condb->prepare("
        SELECT
            b.id AS box_id,
            b.box_code,
            b.io_device_id AS box_dev,
            b.io_output_pin AS box_pin,
            l.level_no,
            r.name AS rack_name,
            r.io_device_id AS rack_dev,
            r.io_green_pin
        FROM boxes b
        JOIN levels l ON b.level_id = l.id
        JOIN racks r ON l.rack_id = r.id
        WHERE b.id = ?
    ");
    $stmt->bind_param('i', $boxId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }

    $state = ($action === 'off') ? 0 : 1;
    $devices = [];

    $addOutput = static function (int $deviceId, int $pin, string $role) use (&$devices, $state): void {
        if ($deviceId <= 0 || $pin <= 0) {
            return;
        }
        if (!isset($devices[$deviceId])) {
            $devices[$deviceId] = ['device_id' => $deviceId, 'outputs' => []];
        }
        $devices[$deviceId]['outputs'][] = [
            'pin' => $pin,
            'state' => $state,
            'role' => $role,
        ];
    };

    if (!io_tower_only()) {
        $addOutput((int) ($row['box_dev'] ?? 0), (int) ($row['box_pin'] ?? 0), 'box');
    }
    if ($action === 'highlight') {
        $addOutput((int) ($row['rack_dev'] ?? 0), (int) ($row['io_green_pin'] ?? 0), 'green');
    } else {
        $addOutput((int) ($row['rack_dev'] ?? 0), (int) ($row['io_green_pin'] ?? 0), 'green');
    }

    if ($devices === []) {
        return null;
    }

    foreach ($devices as $deviceId => &$entry) {
        $entry['device'] = io_fetch_device($condb, $deviceId);
        if (!$entry['device']) {
            unset($devices[$deviceId]);
        }
    }
    unset($entry);

    if ($devices === []) {
        return null;
    }

    return [
        'location' => [
            'box_id' => (int) $row['box_id'],
            'box_code' => $row['box_code'],
            'slot_no' => $slotNo,
            'level_no' => (int) $row['level_no'],
            'rack_name' => $row['rack_name'],
        ],
        'devices' => $devices,
    ];
}

function io_build_raspi_url(array $device): string
{
    $urlFormat = $device['url_format'] ?: 'http://{IP}:{PORT}/api/io/highlight';
    return str_replace(
        ['{IP}', '{PORT}'],
        [$device['ip_address'], (string) ($device['port'] ?: 8080)],
        $urlFormat
    );
}

/**
 * @param array<string, mixed> $payload
 * @return array{status: string, message: string, http_code?: int, url?: string, response?: string}
 */
function io_send_raspi_payload(array $device, array $payload): array
{
    $url = io_build_raspi_url($device);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return ['status' => 'error', 'message' => 'Failed to encode JSON payload'];
    }

    $headers = ['Content-Type: application/json'];
    $key = io_raspi_io_key();
    if ($key !== '') {
        $headers[] = 'X-IO-Key: ' . $key;
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        error_log('io_device_service Raspi cURL error: ' . $error . ' url=' . $url);
        return [
            'status' => 'error',
            'message' => 'cURL Error: ' . $error,
            'url' => $url,
        ];
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        error_log('io_device_service Raspi HTTP ' . $httpCode . ' url=' . $url . ' body=' . substr((string) $response, 0, 500));
        $piMessage = '';
        $decoded = json_decode((string) $response, true);
        if (is_array($decoded) && !empty($decoded['message'])) {
            $piMessage = (string) $decoded['message'];
        }
        $message = 'Raspi returned HTTP ' . $httpCode;
        if ($piMessage !== '') {
            $message .= ': ' . $piMessage;
        }
        return [
            'status' => 'error',
            'message' => $message,
            'http_code' => $httpCode,
            'url' => $url,
            'response' => $response,
        ];
    }

    return [
        'status' => 'success',
        'message' => 'Command sent to Raspi gateway',
        'http_code' => $httpCode,
        'url' => $url,
        'response' => $response,
    ];
}

/**
 * @return array{status: string, message: string, http_code?: int, url?: string}
 */
function io_send_http_relay(array $device, int $pin, int $state): array
{
    $urlFormat = $device['url_format'] ?: 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}';
    $url = str_replace(
        ['{IP}', '{PORT}', '{PIN}', '{STATE}'],
        [$device['ip_address'], (string) $device['port'], (string) $pin, (string) $state],
        $urlFormat
    );

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 3,
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ['status' => 'error', 'message' => 'cURL Error: ' . $error, 'url' => $url];
    }

    return [
        'status' => 'success',
        'message' => 'HTTP relay command sent',
        'http_code' => $httpCode,
        'url' => $url,
        'response' => $response,
    ];
}

/**
 * @return array{status: string, message: string}
 */
function io_send_modbus_pin(array $device, int $pin, int $state): array
{
    $io = new EthernetIO($device['ip_address'], (int) ($device['port'] ?: 502));
    $modbusPin = $pin - 1;
    $success = ($state === 1) ? $io->turnOn($modbusPin) : $io->turnOff($modbusPin);

    if (!$success) {
        return [
            'status' => 'error',
            'message' => 'Failed Modbus communication at ' . $device['ip_address'] . ':' . $device['port'],
        ];
    }

    return [
        'status' => 'success',
        'message' => "Modbus command sent (pin $pin state $state)",
    ];
}

/**
 * Single pin — admin test / test_io.php
 *
 * @return array{status: string, message: string}
 */
function io_send_single_pin(array $device, int $pin, int $state): array
{
    $type = $device['controller_type'] ?? 'http';

    if ($type === 'raspi') {
        $payload = [
            'action' => $state === 1 ? 'highlight' : 'off',
            'duration_sec' => io_highlight_duration_sec(),
            'device_name' => $device['name'] ?? '',
            'location' => ['box_id' => 0],
            'outputs' => [
                ['pin' => $pin, 'state' => $state, 'role' => 'test'],
            ],
        ];
        return io_send_raspi_payload($device, $payload);
    }

    if (in_array($type, ['modbus', 'http'], true) && !io_legacy_direct_allowed()) {
        return [
            'status' => 'error',
            'message' => 'Direct Modbus/HTTP is disabled in production. Register device as Raspi gateway (WiFi IP).',
        ];
    }

    if ($type === 'modbus') {
        return io_send_modbus_pin($device, $pin, $state);
    }

    if ($type === 'http') {
        return io_send_http_relay($device, $pin, $state);
    }

    return ['status' => 'error', 'message' => 'Unsupported controller type: ' . $type];
}

/**
 * @param array<string, mixed> $plan
 * @return array{status: string, message?: string, results?: array<int, array>, warnings?: array<int, string>}
 */
function io_execute_plan(mysqli $condb, array $plan, string $action, int $durationSec): array
{
    $results = [];
    $errors = [];

    foreach ($plan['devices'] as $deviceId => $entry) {
        $device = $entry['device'];
        $outputs = $entry['outputs'];
        $type = $device['controller_type'] ?? 'http';

        if ($type === 'raspi') {
            $payload = [
                'action' => $action === 'off' ? 'off' : 'highlight',
                'duration_sec' => $durationSec,
                'device_name' => $device['name'] ?? '',
                'location' => $plan['location'],
                'outputs' => $outputs,
            ];
            $result = io_send_raspi_payload($device, $payload);
        } elseif (in_array($type, ['modbus', 'http'], true) && io_legacy_direct_allowed()) {
            $result = ['status' => 'success', 'message' => 'Legacy direct IO'];
            foreach ($outputs as $output) {
                $pinResult = ($type === 'modbus')
                    ? io_send_modbus_pin($device, (int) $output['pin'], (int) $output['state'])
                    : io_send_http_relay($device, (int) $output['pin'], (int) $output['state']);
                if ($pinResult['status'] !== 'success') {
                    $result = $pinResult;
                    break;
                }
            }
        } else {
            $result = [
                'status' => 'error',
                'message' => 'Device #' . $deviceId . ' must use Raspi gateway in production',
            ];
        }

        $results[$deviceId] = $result;
        if ($result['status'] !== 'success') {
            $errors[] = $device['name'] . ': ' . ($result['message'] ?? 'Unknown error');
        }
    }

    if ($errors !== []) {
        return [
            'status' => 'error',
            'message' => implode('; ', $errors),
            'results' => $results,
        ];
    }

    return [
        'status' => 'success',
        'message' => $action === 'off' ? 'IO turned off' : 'IO highlight sent',
        'results' => $results,
    ];
}

/**
 * Turn off previous box outputs (if any) then highlight the new box immediately.
 *
 * @return array{status: string, message: string, results?: array, warnings?: array<int, string>, previous_off?: array}
 */
function io_switch_highlight_box(
    mysqli $condb,
    int $boxId,
    ?int $slotNo = null,
    ?int $previousBoxId = null,
    ?int $previousSlotNo = null
): array {
    $previousOff = ['status' => 'skipped', 'message' => 'No previous box'];
    $previousBoxId = (int) ($previousBoxId ?? 0);

    if ($previousBoxId > 0 && $previousBoxId !== $boxId) {
        $previousOff = io_off_box($condb, $previousBoxId, $previousSlotNo);
    }

    $highlight = io_highlight_box($condb, $boxId, null, $slotNo);
    $highlight['previous_off'] = $previousOff;

    return $highlight;
}

/**
 * @return array{status: string, message: string, results?: array, warnings?: array<int, string>}
 */
function io_highlight_box(mysqli $condb, int $boxId, ?int $durationSec = null, ?int $slotNo = null): array
{
    $durationSec = $durationSec ?? io_highlight_duration_sec();
    $plan = io_resolve_box_plan($condb, $boxId, 'highlight', $slotNo);

    if (!$plan) {
        return [
            'status' => 'warning',
            'message' => 'No IO mapping configured for this box',
        ];
    }

    return io_execute_plan($condb, $plan, 'highlight', $durationSec);
}

/**
 * @return array{status: string, message: string, results?: array}
 */
function io_off_box(mysqli $condb, int $boxId, ?int $slotNo = null): array
{
    $plan = io_resolve_box_plan($condb, $boxId, 'off', $slotNo);

    if (!$plan) {
        return [
            'status' => 'warning',
            'message' => 'No IO mapping configured for this box',
        ];
    }

    return io_execute_plan($condb, $plan, 'off', 0);
}

/**
 * Flat list for legacy get_box_io_config consumers.
 *
 * @return array<int, array{device_id: int, pin: int, role: string}>
 */
function io_list_highlight_pins(mysqli $condb, int $boxId): array
{
    $plan = io_resolve_box_plan($condb, $boxId, 'highlight');
    if (!$plan) {
        return [];
    }

    $ios = [];
    foreach ($plan['devices'] as $entry) {
        foreach ($entry['outputs'] as $output) {
            $ios[] = [
                'device_id' => (int) $entry['device']['id'],
                'pin' => (int) $output['pin'],
                'role' => $output['role'],
            ];
        }
    }

    return $ios;
}

/**
 * Collect every mapped output pin from boxes and racks (deduplicated).
 *
 * @return array<int, array<int, array{pin: int, state: int, role: string}>>
 */
function io_collect_all_mapped_outputs(mysqli $condb): array
{
    $seen = [];
    $byDevice = [];

    $add = static function (int $deviceId, int $pin, string $role) use (&$seen, &$byDevice): void {
        if ($deviceId <= 0 || $pin <= 0) {
            return;
        }
        $key = $deviceId . ':' . $pin;
        if (isset($seen[$key])) {
            return;
        }
        $seen[$key] = true;
        if (!isset($byDevice[$deviceId])) {
            $byDevice[$deviceId] = [];
        }
        $byDevice[$deviceId][] = [
            'pin' => $pin,
            'state' => 0,
            'role' => $role,
        ];
    };

    $boxResult = $condb->query(
        'SELECT io_device_id, io_output_pin FROM boxes
         WHERE io_device_id IS NOT NULL AND io_output_pin IS NOT NULL AND io_output_pin > 0'
    );
    if ($boxResult) {
        while ($row = $boxResult->fetch_assoc()) {
            $add((int) $row['io_device_id'], (int) $row['io_output_pin'], 'box');
        }
    }

    $rackResult = $condb->query(
        'SELECT io_device_id, io_red_pin, io_yellow_pin, io_green_pin, io_buzzer_pin FROM racks
         WHERE io_device_id IS NOT NULL'
    );
    if ($rackResult) {
        while ($row = $rackResult->fetch_assoc()) {
            $devId = (int) $row['io_device_id'];
            $add($devId, (int) ($row['io_red_pin'] ?? 0), 'red');
            $add($devId, (int) ($row['io_yellow_pin'] ?? 0), 'yellow');
            $add($devId, (int) ($row['io_green_pin'] ?? 0), 'green');
            $add($devId, (int) ($row['io_buzzer_pin'] ?? 0), 'buzzer');
        }
    }

    return $byDevice;
}

/**
 * Turn off all configured IO outputs (all mapped box + rack pins).
 *
 * @return array{status: string, message: string, results?: array, pin_count?: int}
 */
function io_reset_all_lights(mysqli $condb): array
{
    $byDevice = io_collect_all_mapped_outputs($condb);
    if ($byDevice === []) {
        return [
            'status' => 'warning',
            'message' => 'No IO pins configured in boxes/racks',
        ];
    }

    $plan = [
        'location' => [
            'box_id' => 0,
            'box_code' => '',
            'rack_name' => '',
            'reset_all' => true,
        ],
        'devices' => [],
    ];

    $pinCount = 0;
    foreach ($byDevice as $deviceId => $outputs) {
        $device = io_fetch_device($condb, (int) $deviceId);
        if (!$device) {
            continue;
        }
        $plan['devices'][(int) $deviceId] = [
            'device' => $device,
            'outputs' => $outputs,
        ];
        $pinCount += count($outputs);
    }

    if ($plan['devices'] === []) {
        return [
            'status' => 'warning',
            'message' => 'No valid IO devices found for configured pins',
        ];
    }

    $result = io_execute_plan($condb, $plan, 'off', 0);
    $result['pin_count'] = $pinCount;

    if ($result['status'] === 'success') {
        $result['message'] = 'All lights reset (' . $pinCount . ' outputs off)';
    }

    return $result;
}
