from __future__ import annotations

import logging
from typing import Iterable

from pymodbus.client import ModbusTcpClient

from .config import Settings

logger = logging.getLogger(__name__)


class ModbusIoError(Exception):
    pass


def write_coil(settings: Settings, pin: int, state: int) -> None:
    """Write one output using Modbus FC05. pin is 1-based (Pin 1 -> coil 0)."""
    if pin <= 0:
        raise ModbusIoError(f'Invalid pin: {pin}')

    coil = pin - 1
    on = state == 1

    if settings.dry_run:
        logger.info(
            'DRY_RUN Modbus %s:%s unit=%s coil=%s state=%s',
            settings.modbus_host,
            settings.modbus_port,
            settings.modbus_unit_id,
            coil,
            on,
        )
        return

    client = ModbusTcpClient(
        settings.modbus_host,
        port=settings.modbus_port,
        timeout=settings.modbus_timeout_sec,
    )

    if not client.connect():
        raise ModbusIoError(
            f'Cannot connect to Modbus IO at {settings.modbus_host}:{settings.modbus_port}'
        )

    try:
        result = None
        last_type_error: TypeError | None = None
        attempts = (
            {'address': coil, 'value': on, 'device_id': settings.modbus_unit_id},
            {'address': coil, 'value': on, 'slave': settings.modbus_unit_id},
            {'device_id': settings.modbus_unit_id},
            {'slave': settings.modbus_unit_id},
        )
        for extra in attempts:
            try:
                kwargs = dict(extra)
                if 'address' not in kwargs:
                    result = client.write_coil(coil, on, **kwargs)
                else:
                    result = client.write_coil(**kwargs)
                break
            except TypeError as exc:
                last_type_error = exc

        if result is None:
            if last_type_error is not None:
                raise ModbusIoError(
                    f'pymodbus write_coil API mismatch: {last_type_error}'
                ) from last_type_error
            raise ModbusIoError(f'Modbus write_coil returned no result for pin {pin}')

        if hasattr(result, 'isError') and result.isError():
            raise ModbusIoError(f'Modbus write_coil failed for pin {pin}: {result}')
    finally:
        client.close()


def apply_outputs(settings: Settings, outputs: Iterable[dict]) -> None:
    errors: list[str] = []
    for item in outputs:
        pin = int(item.get('pin', 0))
        state = int(item.get('state', 0))
        role = item.get('role', '?')
        try:
            write_coil(settings, pin, state)
            logger.info('Output pin=%s state=%s role=%s OK', pin, state, role)
        except (ModbusIoError, ValueError, TypeError) as exc:
            logger.error('Output pin=%s failed: %s', pin, exc)
            errors.append(f'pin {pin}: {exc}')

    if errors:
        raise ModbusIoError('; '.join(errors))
