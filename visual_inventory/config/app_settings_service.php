<?php

const APP_SETTING_FIFO_ISSUE_MODE = 'fifo_issue_mode';
const APP_SETTING_FIFO_DUMMY_IM = 'fifo_dummy_im';

const FIFO_ISSUE_MODE_EXPIRATION = 'expiration_date';
const FIFO_ISSUE_MODE_IM_BATCH = 'im_batch';

/**
 * Ensure app_settings tables exist (idempotent).
 */
function app_settings_ensure_schema(mysqli $condb): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $condb->query("
        CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL DEFAULT '',
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by INT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    ");

    $condb->query("
        CREATE TABLE IF NOT EXISTS app_settings_log (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(64) NOT NULL,
            old_value VARCHAR(255) NOT NULL DEFAULT '',
            new_value VARCHAR(255) NOT NULL DEFAULT '',
            changed_by INT NULL,
            changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_setting_key (setting_key),
            KEY idx_changed_at (changed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    ");

    $defaults = [
        APP_SETTING_FIFO_ISSUE_MODE => FIFO_ISSUE_MODE_EXPIRATION,
        APP_SETTING_FIFO_DUMMY_IM => 'DUMMYBATCH',
    ];

    $stmt = $condb->prepare(
        'INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)'
    );
    foreach ($defaults as $key => $value) {
        $stmt->bind_param('ss', $key, $value);
        $stmt->execute();
    }
    $stmt->close();

    $done = true;
}

function app_setting_get(mysqli $condb, string $key, string $default = ''): string
{
    app_settings_ensure_schema($condb);

    $stmt = $condb->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1');
    $stmt->bind_param('s', $key);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return $default;
    }

    $value = trim((string) ($row['setting_value'] ?? ''));

    return $value !== '' ? $value : $default;
}

/**
 * @return array{ok: bool, message: string}
 */
function app_setting_set(mysqli $condb, string $key, string $value, int $userId = 0): array
{
    app_settings_ensure_schema($condb);

    $old = app_setting_get($condb, $key, '');
    if ($old === $value) {
        return ['ok' => true, 'message' => 'unchanged'];
    }

    $stmt = $condb->prepare(
        'INSERT INTO app_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)'
    );
    $stmt->bind_param('ssi', $key, $value, $userId);
    $ok = $stmt->execute();
    $stmt->close();

    if (!$ok) {
        return ['ok' => false, 'message' => 'Failed to save setting'];
    }

    $log = $condb->prepare(
        'INSERT INTO app_settings_log (setting_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)'
    );
    $log->bind_param('sssi', $key, $old, $value, $userId);
    $log->execute();
    $log->close();

    return ['ok' => true, 'message' => 'saved'];
}

/**
 * Verify password for the logged-in user (admin re-auth).
 *
 * @return array{ok: bool, message: string}
 */
function app_settings_verify_user_password(mysqli $condb, int $userId, string $password): array
{
    if ($userId <= 0) {
        return ['ok' => false, 'message' => 'Invalid user session'];
    }

    $password = (string) $password;
    if ($password === '') {
        return ['ok' => false, 'message' => 'Password is required'];
    }

    $stmt = $condb->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($password, (string) $row['password'])) {
        return ['ok' => false, 'message' => 'Incorrect password'];
    }

    return ['ok' => true, 'message' => 'ok'];
}

function fifo_issue_mode_label(string $mode, bool $isEN): string
{
    if ($mode === FIFO_ISSUE_MODE_IM_BATCH) {
        return $isEN ? 'Batch IM (FIFO)' : 'Batch IM (FIFO)';
    }

    return $isEN ? 'Expiration Date (FIFO)' : 'วันหมดอายุ (FIFO)';
}

function fifo_issue_mode_is_valid(string $mode): bool
{
    return in_array($mode, [FIFO_ISSUE_MODE_EXPIRATION, FIFO_ISSUE_MODE_IM_BATCH], true);
}
