<?php
require_once __DIR__ . '/../vendor/autoload.php';

if (!isset($_ENV['DB_HOST'])) {
    require_once dirname(__DIR__, 3) . '/config/env_loader.php';
}

function getDB()
{
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $charset = $_ENV['DB_CHARSET'];

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
        throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
}

function logQuery($userId, $query, $sql, $status)
{
    $logFile = __DIR__ . '/../logs/query_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] User: $userId | Quest: $query | SQL: $sql | Status: $status" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

function validateSQL($sql, $allowedTables)
{
    // Basic validation: must start with SELECT
    $trimmedSql = trim(strtoupper($sql));
    if (strpos($trimmedSql, 'SELECT') !== 0) {
        return false;
    }

    // Check for destructive keywords
    $destructive = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'RENAME', 'GRANT', 'REVOKE'];
    foreach ($destructive as $word) {
        if (preg_match("/\b$word\b/i", $sql)) {
            return false;
        }
    }

    // Table validation (simple check)
    // In a real scenario, use a SQL parser, but here we can check if table names are in the allowed list
    // This is a bit complex without a parser, so we'll ensure the DB user is READ ONLY as requested.

    return true;
}

function cleanSQLOutput($raw)
{
    // Remove markdown code blocks
    $raw = str_ireplace(['```sql', '```mysql', '```'], '', $raw);
    $raw = trim($raw);

    // If it contains multiple lines, extract only lines that look like SQL
    $lines = explode("\n", $raw);
    $sqlLines = [];
    $foundSelect = false;

    foreach ($lines as $line) {
        $trimmed = trim($line);

        // Skip empty lines before SELECT
        if (!$foundSelect && empty($trimmed)) continue;

        // Check if the line starts with SQL keywords
        if (!$foundSelect && preg_match('/^SELECT\b/i', $trimmed)) {
            $foundSelect = true;
        }

        if ($foundSelect) {
            // Stop if we hit a line that looks like explanation text (not SQL)
            if (preg_match('/^(This|Note|The |Here|--\s*\w|\/\*|Explanation|Result|Output|Above|I\')/i', $trimmed)) {
                break;
            }
            $sqlLines[] = $trimmed;

            // If this line ends with a semicolon, we're done
            if (preg_match('/;\s*$/', $trimmed)) {
                break;
            }
        }
    }

    $sql = implode(' ', $sqlLines);
    $sql = trim($sql);

    // Remove trailing semicolon for PDO prepare compatibility
    $sql = rtrim($sql, ';');

    return $sql;
}

function callGemini($prompt)
{
    $provider = $_ENV['AI_PROVIDER'] ?? 'gemini';

    if ($provider === 'ollama') {
        return callOllama($prompt);
    }

    try {
        $apiKey = $_ENV['GEMINI_API_KEY'];
        $model = $_ENV['GEMINI_MODEL'] ?? 'gemini-1.5-flash';
        $url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey";

        $client = new \GuzzleHttp\Client(['verify' => false]);
        $response = $client->post($url, [
            'json' => [
                'contents' => [['parts' => [['text' => $prompt]]]]
            ]
        ]);

        $data = json_decode($response->getBody(), true);
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        $text = str_ireplace(['```sql', '```'], '', $text);
        return trim($text);
    } catch (\Exception $e) {
        throw new \Exception("Gemini API Error: " . $e->getMessage());
    }
}

function callOllama($prompt)
{
    try {
        $host = $_ENV['OLLAMA_HOST'] ?? 'http://localhost:11434';
        $model = $_ENV['OLLAMA_MODEL'] ?? 'mistral:latest';
        $url = "$host/api/generate";

        $client = new \GuzzleHttp\Client([
            'timeout' => 120,
        ]);
        $response = $client->post($url, [
            'json' => [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => 0,
                    'num_predict' => 1024,
                    'top_p' => 0.1,
                ]
            ]
        ]);

        $data = json_decode($response->getBody(), true);
        $text = $data['response'] ?? '';

        $text = str_ireplace(['```sql', '```'], '', $text);
        return trim($text);
    } catch (\Exception $e) {
        throw new \Exception("Ollama Error: " . $e->getMessage());
    }
}

/**
 * 🧠 Smart Schema Router
 * เลือกเฉพาะตารางที่เกี่ยวข้องกับคำถาม เพื่อลดขนาด Prompt และเพิ่มความเร็ว
 * ใช้เทคนิค Schema Pruning (Hard Mapping) ร่วมกับ Dynamic Column Fetching
 */

/**
 * เลือกเฉพาะตารางที่เกี่ยวข้องกับคำถาม เพื่อลดขนาด Prompt และเพิ่มความเร็ว
 * ใช้เทคนิค Schema Pruning (Hard Mapping)
 */
function getSmartSchemaForQuestion($question)
{
    $question = mb_strtolower($question, 'UTF-8');

    // ตารางพื้นฐานที่ต้องมีเกือบทุกครั้ง (Metadata หรือชื่อพาร์ท)
    $tables = ['products', 'materials'];

    $mapping = [
        'inventory_receive' => ['หมดอายุ', 'expiration', 'รับเข้า', 'มาใหม่', 'stock', 'qty remain', 'puid', 'คงเหลือ', 'เหลือ', 'ใกล้หมด', 'inventory_receive', 'รายงาน'],
        'v_inventory_location' => ['ตำแหน่ง', 'อยู่ไหน', 'ที่ไหน', 'box', 'rack', 'level', 'shelf', 'เก็บ', 'วาง', 'ช่อง', 'block', 'หาของ', 'v_inventory_location', 'พร้อมเบิก', 'เบิกได้'],
        'v_stock_history'   => ['ประวัติ', 'ใคร', 'หยิบ', 'เบิก', 'เพิ่ม', 'log', 'history', 'move', 'ทำอะไร', 'v_stock_history'],
        'bom_group'         => ['bom', 'รุ่น', 'model', 'revision', 'ผลิต', 'order', 'reservation', 'withdraw_by_bom', 'เบิกตาม bom', 'production_calculator', 'คำนวณ', 'จอง'],
        'users'             => ['user', 'พนักงาน', 'สมาชิก', 'คน', 'บัญชี'],
    ];

    $matched = false;
    foreach ($mapping as $group => $keywords) {
        foreach ($keywords as $kw) {
            if (strpos($question, $kw) !== false) {
                $matched = true;
                if ($group === 'inventory_receive') $tables = array_merge($tables, ['inventory_receive', 'v_inventory_location']);
                if ($group === 'v_inventory_location') $tables[] = 'v_inventory_location';
                if ($group === 'v_stock_history')   $tables[] = 'v_stock_history';
                if ($group === 'users')             $tables[] = 'users';
                if ($group === 'bom_group')         $tables = array_merge($tables, ['models', 'model_revisions', 'bom_items', 'production_orders', 'production_order_items', 'production_reservations']);
                break;
            }
        }
    }

    // ถ้าไม่เจอคำสำคัญเลย ให้ส่ง Schema ชุดมาตรฐาน
    if (!$matched) {
        $tables = ['inventory_receive', 'products', 'materials', 'slots', 'boxes', 'levels', 'racks', 'stock_logs'];
    }

    $tables = array_unique($tables);
    $pdo = getDB();
    $schema = "";

    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SHOW FULL COLUMNS FROM `$table`");
            $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $colParts = [];
            foreach ($cols as $col) {
                // ใช้ Comment ภาษาไทยที่เคยเพิ่มไว้มาใส่ใน Prompt เพื่อความแม่นยำ
                $comment = $col['Comment'] ? "(" . $col['Comment'] . ")" : "";
                $colParts[] = $col['Field'] . $comment;
            }
            $schema .= "- $table: [" . implode(', ', $colParts) . "]\n";
        } catch (PDOException $e) {
            continue;
        }
    }

    return $schema;
}

function getSchemaFromDB()
{
    // Keeping this for backward compatibility if needed, but getSmartSchemaForQuestion is better
    return getSmartSchemaForQuestion("");
}

/**
 * 🇹🇭 Pre-process Thai Question
 * Normalize dates and common synonyms to improve AI understanding.
 */
function preprocessThaiQuestion($q)
{
    // 1. Normalize Dates (DD-MM-YYYY or DD/MM/YYYY -> YYYY-MM-DD)
    $q = preg_replace_callback('/(\d{1,2})[-|\/](\d{1,2})[-|\/](\d{4})/', function ($m) {
        return $m[3] . '-' . str_pad($m[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($m[1], 2, '0', STR_PAD_LEFT);
    }, $q);

    // 2. Synonyms Mapping (Include common typos and warehouse terms)
    $synonyms = [
        'ขอดู' => 'select',
        'เช็ค' => 'check',
        'ดู' => 'view',
        'หา' => 'search',
        'พาร์ท' => 'part',
        'รหัส' => 'code',
        'สอนค้า' => 'สินค้า',
        'ราการ' => 'รายการ',
        'วัตถุดิบ' => 'สินค้า',
        'material' => 'สินค้า',
        'view_inventory_receive' => 'inventory_receive',
        'รายงานรายการสินค้า' => 'รายการทั้งหมดใน inventory_receive', // บอกว่าเป็นรายการทั้งหมด
        'รายการสินค้า' => 'inventory_receive',
        'รายการ' => 'list',
        'เติมของ' => 'เพิ่มสินค้า',
        'เอาออก' => 'เบิกสินค้า',
        'lavel' => 'level',
        'shelf' => 'rack',
    ];

    foreach ($synonyms as $key => $val) {
        $q = str_replace($key, $val, $q);
    }

    return $q;
}
