<?php

/**
 * Load rack / level / box hierarchy with three queries instead of N+1 nested loops.
 *
 * @param 'position_in_level'|'id' $boxOrder
 * @return array{racks: array<int, array>, levels_by_rack: array<int, array<int, array>>, boxes_by_level: array<int, array<int, array>>}
 */
function warehouse_hierarchy(mysqli $condb, string $boxOrder = 'position_in_level'): array
{
    $boxOrderSql = $boxOrder === 'id'
        ? 'id ASC'
        : 'position_in_level ASC, CAST(box_code AS UNSIGNED) ASC, id ASC';

    $racks = [];
    $res = $condb->query('SELECT * FROM racks ORDER BY id ASC');
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $racks[(int) $row['id']] = $row;
        }
    }

    $levelsByRack = [];
    $res = $condb->query('SELECT * FROM levels ORDER BY rack_id ASC, level_no ASC');
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $rackId = (int) $row['rack_id'];
            $levelId = (int) $row['id'];
            if (!isset($levelsByRack[$rackId])) {
                $levelsByRack[$rackId] = [];
            }
            $levelsByRack[$rackId][$levelId] = $row;
        }
    }

    $boxesByLevel = [];
    $res = $condb->query("SELECT * FROM boxes ORDER BY level_id ASC, {$boxOrderSql}");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $levelId = (int) $row['level_id'];
            if (!isset($boxesByLevel[$levelId])) {
                $boxesByLevel[$levelId] = [];
            }
            $boxesByLevel[$levelId][] = $row;
        }
    }

    return [
        'racks' => $racks,
        'levels_by_rack' => $levelsByRack,
        'boxes_by_level' => $boxesByLevel,
    ];
}
