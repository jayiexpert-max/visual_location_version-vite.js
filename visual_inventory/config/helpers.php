<?php

/**
 * Read environment variable with optional default.
 */
function env(string $key, ?string $default = null): ?string
{
    if (isset($_ENV[$key]) && $_ENV[$key] !== false && $_ENV[$key] !== '') {
        return (string) $_ENV[$key];
    }

    if (isset($_SERVER[$key]) && is_string($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }

    $value = getenv($key, true);
    if ($value !== false && $value !== '') {
        return $value;
    }

    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }

    return $default;
}

function app_env(): string
{
    $env = env('APP_ENV', 'production') ?? 'production';
    return trim(preg_replace('/\s+#.*$/', '', $env));
}

function is_development(): bool
{
    return app_env() === 'development';
}

function app_base_url(): string
{
    return rtrim(env('APP_BASE_URL', 'http://localhost/visual_inventory') ?? 'http://localhost/visual_inventory', '/');
}

/** Strip leading RES prefix from scanned reservation number (e.g. RES0017442892 → 0017442892). */
function normalize_res_no_input(?string $value): string
{
    $v = trim((string) ($value ?? ''));

    return (string) preg_replace('/^RES/i', '', $v);
}

function pdservice_puid_url(string $puid): string
{
    $base = rtrim(
        env('PDSERVICE_BASE_URL', 'http://194.10.10.89/PDService/Service1.svc/rest') ?? '',
        '/'
    );

    return $base . '/PUIDCheck/' . rawurlencode($puid);
}

function pdservice_test_url(): string
{
    return pdservice_puid_url('test');
}

function pdservice_curl_timeout(): int
{
    return max(3, (int) (env('PDSERVICE_CURL_TIMEOUT', '15') ?? 15));
}

function pdservice_curl_connect_timeout(): int
{
    return max(2, (int) (env('PDSERVICE_CURL_CONNECT_TIMEOUT', '5') ?? 5));
}

/**
 * GET PDService PUIDCheck JSON for one PUID.
 *
 * @return array<string, mixed>|null
 */
function pdservice_fetch_puid(string $puid): ?array
{
    $puid = trim($puid);
    if ($puid === '') {
        return null;
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, pdservice_puid_url($puid));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, pdservice_curl_timeout());
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, pdservice_curl_connect_timeout());
    $jsonContent = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($jsonContent === false || $httpCode !== 200) {
        return null;
    }

    $decoded = json_decode($jsonContent, true);

    return is_array($decoded) ? $decoded : null;
}

/**
 * Parsed JSON request body (cached). Gateway sets $GLOBALS['API_JSON_BODY'] before including APIs.
 */
function api_json_body(): array
{
    if (isset($GLOBALS['API_JSON_BODY']) && is_array($GLOBALS['API_JSON_BODY'])) {
        return $GLOBALS['API_JSON_BODY'];
    }

    static $parsed = null;
    if ($parsed !== null) {
        return $parsed;
    }

    $raw = file_get_contents('php://input');
    $decoded = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
    $parsed = is_array($decoded) ? $decoded : [];
    $GLOBALS['API_JSON_BODY'] = $parsed;

    return $parsed;
}

/**
 * Normalize API/form datetime for MySQL DATETIME columns (empty string → NULL).
 */
function nullable_sql_datetime(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    $value = trim((string) $value);
    if ($value === '' || $value === '0000-00-00' || str_starts_with($value, '0000-00-00')) {
        return null;
    }

    return $value;
}

/**
 * Compact pagination page list — e.g. [1, 0, 8, 9, 10, 0, 50] where 0 = ellipsis.
 *
 * @return int[]
 */
function pagination_page_numbers(int $current, int $total, int $radius = 2): array
{
    if ($total <= 1) {
        return [];
    }

    $current = max(1, min($current, $total));
    $windowStart = max(1, $current - $radius);
    $windowEnd = min($total, $current + $radius);
    $pages = [];

    if ($windowStart > 1) {
        $pages[] = 1;
        if ($windowStart > 2) {
            $pages[] = 0;
        }
    }

    for ($p = $windowStart; $p <= $windowEnd; $p++) {
        $pages[] = $p;
    }

    if ($windowEnd < $total) {
        if ($windowEnd < $total - 1) {
            $pages[] = 0;
        }
        $pages[] = $total;
    }

    return $pages;
}

/**
 * Build pagination link prefix from current query string — e.g. "?search=a&page="
 */
function pagination_href_prefix(array $query, string $pageKey = 'page'): string
{
    unset($query[$pageKey], $query['synced']);
    $qs = http_build_query($query);

    return '?' . ($qs !== '' ? $qs . '&' : '') . $pageKey . '=';
}

/**
 * Compact pagination HTML — current ±radius, first/last, ellipsis, prev/next.
 *
 * @param array{meta?:string,radius?:int,class?:string,href_suffix?:string} $opts
 */
function render_pagination_html(int $current, int $total, string $hrefPrefix, array $opts = []): string
{
    if ($total <= 1) {
        return '';
    }

    $current = max(1, min($current, $total));
    $radius = (int) ($opts['radius'] ?? 2);
    $class = (string) ($opts['class'] ?? 'pagination');
    $meta = (string) ($opts['meta'] ?? '');
    $suffix = (string) ($opts['href_suffix'] ?? '');
    $pageNumbers = pagination_page_numbers($current, $total, $radius);

    $html = '<div class="fx-pagination-wrap">';
    $html .= '<div class="' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8') . '">';

    $prev = max(1, $current - 1);
    $prevDisabled = $current <= 1 ? ' is-disabled' : '';
    $html .= '<a href="' . htmlspecialchars($hrefPrefix . $prev . $suffix, ENT_QUOTES, 'UTF-8') . '"'
        . ' class="page-link' . $prevDisabled . '"'
        . ($current <= 1 ? ' aria-disabled="true" tabindex="-1"' : '')
        . '><i class="fas fa-chevron-left" aria-hidden="true"></i></a>';

    foreach ($pageNumbers as $p) {
        if ($p === 0) {
            $html .= '<span class="page-ellipsis" aria-hidden="true">…</span>';
            continue;
        }
        $active = $p === $current ? ' active' : '';
        $html .= '<a href="' . htmlspecialchars($hrefPrefix . $p . $suffix, ENT_QUOTES, 'UTF-8') . '"'
            . ' class="page-link' . $active . '">' . $p . '</a>';
    }

    $next = min($total, $current + 1);
    $nextDisabled = $current >= $total ? ' is-disabled' : '';
    $html .= '<a href="' . htmlspecialchars($hrefPrefix . $next . $suffix, ENT_QUOTES, 'UTF-8') . '"'
        . ' class="page-link' . $nextDisabled . '"'
        . ($current >= $total ? ' aria-disabled="true" tabindex="-1"' : '')
        . '><i class="fas fa-chevron-right" aria-hidden="true"></i></a>';

    $html .= '</div></div>';

    if ($meta !== '') {
        $html .= '<p class="fx-pagination-meta">' . $meta . '</p>';
    }

    return $html;
}
