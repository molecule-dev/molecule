---
'@molecule/api-ai-tools': patch
---

A command the platform moves to the background no longer keeps the `timeout N` prefix that was written for the foreground ceiling, and a background run stopped by its own timeout is told to drop that prefix instead of being sent to the background again.
