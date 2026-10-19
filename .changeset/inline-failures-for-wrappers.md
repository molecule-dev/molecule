---
'@molecule/api-ai-tools': patch
---

Every background command carries the inline Playwright failure switch, so a suite started through the executor's own wrapper script also reports each failure's error as it fails.
