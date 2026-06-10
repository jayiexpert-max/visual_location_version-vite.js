# BT-A500 Handheld Scanner Setup

## Login

- URL: `https://<frontend-host>/login`
- Use handheld operator credentials (role: `user` or `material_prep`)
- Device type: **handheld** (30-minute access token, 7-day refresh)

## Scanner configuration

- Enable **keyboard wedge** mode (scan sends Enter after barcode)
- Barcode fields: PUID, HanaPart, reservation number
- Test on Search and Receive screens

## Browser

- Use Chrome or factory-approved WebView
- Allow cookies / local storage for refresh token
- Disable pop-up blockers for report downloads

## Network

- Handheld VLAN must reach:
  - Frontend HTTPS (port 443 or 80)
  - API HTTPS (port 3000 or reverse proxy)
- MQTT and Raspberry are server-side only

## Language

Users can set language in profile (TH / EN). Admin default in **System Admin → Language**.

## Support

If login fails repeatedly, account locks after 5 attempts for 15 minutes (configurable via `SECURITY_*` env vars).
