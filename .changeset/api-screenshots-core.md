---
'@molecule/api-screenshots': minor
---

First release of the screenshot capture core: the `ScreenshotProvider` interface — `capture({url|html}, options)` returns PNG/JPEG bytes for a URL or an HTML string, with viewport, fullPage, format, quality, device-scale and settle-delay options — plus the `setProvider`/`capture` convenience surface for bonds.
