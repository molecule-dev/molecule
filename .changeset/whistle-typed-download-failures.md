---
'@molecule/api-ai-speech-whistle': patch
'@molecule/app-ai-voice-whistle': patch
---

Engine-file downloads that die mid-stream (and glue fetches that answer non-2xx or carry non-JavaScript bodies) now fail with the typed `WhistleEngineError` (`download-failed` / `load-failed`) instead of a raw network error, and the app voice bond's `speak()` no longer lets a replaced utterance's end event idle the replacement while it is still speaking.
