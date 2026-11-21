---
'@molecule/app-qr-code-react': patch
---

The `fgColor` and `bgColor` props are documented as literal QR data rather than theme colours: the black-on-white defaults stay fixed because scanners need that contrast.
