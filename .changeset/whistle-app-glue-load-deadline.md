---
'@molecule/app-ai-voice-whistle': patch
---

The engine download now fails with a typed error when the glue script never loads (120 s deadline) instead of leaving recognition stuck in "preparing" forever.
