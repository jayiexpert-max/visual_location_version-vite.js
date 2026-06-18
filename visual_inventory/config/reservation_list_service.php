<?php

/** Calendar days to keep RES entries in the left-panel list on show_api_data. */
const RESERVATION_LIST_RETAIN_DAYS = 2;

/**
 * SQL expression for the oldest calendar date still kept in the list.
 */
function reservation_list_retain_cutoff_date(int $days = RESERVATION_LIST_RETAIN_DAYS): string
{
    $days = max(1, $days);

    return "DATE_SUB(CURDATE(), INTERVAL {$days} DAY)";
}

/**
 * Remove reservation_list rows whose req_date is older than the retain window.
 *
 * @return int deleted row count
 */
function reservation_list_cleanup_stale(mysqli $condb, int $days = RESERVATION_LIST_RETAIN_DAYS): int
{
    $days = max(1, $days);

    $stmt = $condb->prepare(
        'DELETE FROM reservation_list
         WHERE req_date IS NULL OR DATE(req_date) < DATE_SUB(CURDATE(), INTERVAL ? DAY)'
    );
    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param('i', $days);
    $stmt->execute();
    $deleted = $stmt->affected_rows;
    $stmt->close();

    return (int) $deleted;
}
