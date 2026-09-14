---
'@molecule/app-e2e-preview': patch
---

`page.setViewportSize()` waits up to 4 seconds for the preview host to resize the frame before reporting the size it got; the real IDE resizes well after the old 1.5-second budget, which failed every phone-width spec.
