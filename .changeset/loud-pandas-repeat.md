---
'@molecule/app-react': patch
---

`useChat` now recovers a chat stream interrupted by a screen lock or a backgrounded page, resuming from the server instead of staying silent until the stall watchdog fires.
