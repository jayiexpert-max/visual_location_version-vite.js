from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == '':
        return default
    return int(raw)


@dataclass(frozen=True)
class Settings:
    listen_host: str
    listen_port: int
    io_api_key: str
    modbus_host: str
    modbus_port: int
    modbus_unit_id: int
    modbus_timeout_sec: float
    dry_run: bool
    log_level: str


def load_settings(env_file: str | None = None) -> Settings:
    if env_file is None:
        env_file = os.environ.get(
            'VISUAL_INVENTORY_IO_ENV',
            '/etc/visual-inventory-io/env',
        )

    path = Path(env_file)
    if path.is_file():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            if value and value[0] in '"\'':
                quote = value[0]
                if value.endswith(quote) and len(value) > 1:
                    value = value[1:-1]
            os.environ.setdefault(key, value)

    return Settings(
        listen_host=os.environ.get('LISTEN_HOST', '0.0.0.0'),
        listen_port=_env_int('LISTEN_PORT', 8080),
        io_api_key=os.environ.get('IO_API_KEY', '').strip(),
        modbus_host=os.environ.get('MODBUS_HOST', '192.168.0.244'),
        modbus_port=_env_int('MODBUS_PORT', 502),
        modbus_unit_id=_env_int('MODBUS_UNIT_ID', 1),
        modbus_timeout_sec=float(os.environ.get('MODBUS_TIMEOUT_SEC', '2')),
        dry_run=_env_bool('DRY_RUN', False),
        log_level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
    )
