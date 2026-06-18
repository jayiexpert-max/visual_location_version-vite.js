from __future__ import annotations

import logging
import sys
from typing import Any

from flask import Flask, jsonify, request

from .config import Settings, load_settings
from .highlight_timer import HighlightTimer
from .modbus_io import ModbusIoError, apply_outputs

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or load_settings()
    app = Flask(__name__)
    app.config['SETTINGS'] = settings
    timer = HighlightTimer()
    last_active_outputs: list[dict[str, Any]] = []

    def _auth_ok() -> bool:
        if not settings.io_api_key:
            return True
        header_key = request.headers.get('X-IO-Key', '')
        return header_key == settings.io_api_key

    def _outputs_off(outputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        off: list[dict[str, Any]] = []
        for item in outputs:
            off.append({
                'pin': int(item.get('pin', 0)),
                'state': 0,
                'role': item.get('role', ''),
            })
        return off

    @app.get('/health')
    def health():
        return jsonify({
            'status': 'ok',
            'service': 'visual-inventory-io',
            'dry_run': settings.dry_run,
            'modbus_host': settings.modbus_host,
        })

    @app.post('/api/io/highlight')
    def io_highlight():
        if not _auth_ok():
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({'status': 'error', 'message': 'Invalid JSON body'}), 400

        action = str(payload.get('action', 'highlight')).lower()
        outputs = payload.get('outputs')
        if not isinstance(outputs, list) or not outputs:
            return jsonify({'status': 'error', 'message': 'Missing outputs[]'}), 400

        location = payload.get('location') or {}
        device_name = payload.get('device_name', '')
        duration_sec = int(payload.get('duration_sec') or 0)

        logger.info(
            'Request action=%s device=%s location=%s outputs=%s duration=%s',
            action,
            device_name,
            location,
            outputs,
            duration_sec,
        )

        try:
            if action == 'off':
                timer.cancel()
                apply_outputs(settings, outputs)
                last_active_outputs.clear()
            else:
                timer.cancel()
                if last_active_outputs:
                    apply_outputs(settings, _outputs_off(last_active_outputs))
                    last_active_outputs.clear()
                apply_outputs(settings, outputs)
                last_active_outputs = [dict(item) for item in outputs]
                if duration_sec > 0:
                    off_outputs = _outputs_off(outputs)

                    def auto_off() -> None:
                        logger.info(
                            'Auto-off after %ss box_id=%s',
                            duration_sec,
                            location.get('box_id'),
                        )
                        apply_outputs(settings, off_outputs)
                        last_active_outputs.clear()

                    timer.schedule(duration_sec, auto_off)
        except ModbusIoError as exc:
            logger.error('Modbus error: %s', exc)
            return jsonify({'status': 'error', 'message': str(exc)}), 502
        except Exception as exc:
            logger.exception('Unhandled IO error')
            return jsonify({
                'status': 'error',
                'message': f'{type(exc).__name__}: {exc}',
            }), 500

        return jsonify({'status': 'ok'})

    return app


def main() -> None:
    settings = load_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    )

    logger.info(
        'Starting IO gateway on %s:%s (Modbus %s:%s dry_run=%s)',
        settings.listen_host,
        settings.listen_port,
        settings.modbus_host,
        settings.modbus_port,
        settings.dry_run,
    )

    app = create_app(settings)
    app.run(
        host=settings.listen_host,
        port=settings.listen_port,
        threaded=True,
        use_reloader=False,
    )


if __name__ == '__main__':
    main()
