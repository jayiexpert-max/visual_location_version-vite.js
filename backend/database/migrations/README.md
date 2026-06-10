# Database Migrations

## Baseline (existing PHP data)

Import the full schema and seed data from the legacy project:

```bash
mysql -u root -p visual_inventory_db < \
  /Applications/XAMPP/xamppfiles/htdocs/visual_inventory/visual_inventory_db.sql
```

## Phase 1 additive migrations

Apply after baseline:

```bash
mysql -u root -p visual_inventory_db < database/migrations/001_additive_phase1.sql
```

## Order

| File | Purpose |
|------|---------|
| `visual_inventory_db.sql` (PHP repo) | Baseline tables, views, seed data |
| `001_additive_phase1.sql` | JWT, language preference, TV highlights, audit |

## Rollback

Phase 1 additive changes are non-destructive. To rollback:

```sql
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS tv_highlights;
DROP TABLE IF EXISTS io_command_logs;
ALTER TABLE users DROP COLUMN lang;
```
