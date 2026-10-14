---
'@molecule/api-screenshots-puppeteer': minor
---

First release: the Puppeteer `ScreenshotProvider` bond — captures PNG/JPEG images of a URL or an HTML string with in-process headless Chrome. Viewport, scale, full-page-height and pixel-budget caps are enforced before Chrome does any work; note the process has no egress guard, so only capture URLs you control.
