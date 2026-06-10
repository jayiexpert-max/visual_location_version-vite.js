# Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database failure | Low | High | Daily backups, 30-day retention, restore procedure |
| MQTT broker down | Medium | High | Health monitoring, Mosquitto restart policy, alerts |
| Raspberry offline | Medium | Medium | Heartbeat monitoring, watchdog auto-restart |
| CPK unreachable | Medium | High | Health check, fail receive when CPK configured |
| Credential brute force | Low | High | Rate limiting, account lockout, audit logs |
| JWT secret leak | Low | Critical | Rotate secrets, short handheld token TTL |
| Network partition | Medium | Medium | Graceful error messages, degraded health status |

## Residual risk

Factory LAN assumed trusted. External exposure requires VPN and WAF.
