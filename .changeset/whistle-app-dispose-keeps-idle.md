---
'@molecule/app-ai-voice-whistle': patch
---

A voice provider that is disposed while a queued chunk is still transcribing now stays in the idle state instead of reporting a failure it can never clear.
