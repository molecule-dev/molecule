---
'@molecule/api-ai-speech-whistle': patch
'@molecule/app-ai-voice-whistle': patch
---

A failed engine or weights download now releases the error response before surfacing its typed error, instead of holding the connection until garbage collection.
