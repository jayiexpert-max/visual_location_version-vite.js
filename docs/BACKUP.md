# Backup Procedures

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/backup/backup.sh` | Daily full backup (database + files) |
| `scripts/backup/backup-database.sh` | MySQL dump only |
| `scripts/backup/backup-files.sh` | Config and Docker data archives |
| `scripts/backup/restore.sh` | Restore database from `.sql.gz` |

## Configuration

Environment variables:

- `BACKUP_ROOT` — output directory (default: `./backups`)
- `RETENTION_DAYS` — delete archives older than N days (default: 30)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

## Daily cron example

```cron
0 2 * * * BACKUP_ROOT=/var/backups/visual-location /opt/visual-location/scripts/backup/backup.sh >> /var/log/vl-backup.log 2>&1
```

## Verification

Each script verifies archive integrity (`gzip -t` or `tar -tzf`) before completing.

## Retention

Backups older than 30 days are automatically removed. Adjust `RETENTION_DAYS` for factory policy.
