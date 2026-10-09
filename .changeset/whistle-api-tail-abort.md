---
'@molecule/api-ai-speech-whistle': patch
---

A `transcribeStream` session that is aborted while it waits for the engine's stream no longer writes its final partial block into the engine (or emits transcripts for a cancelled dictation); the session queued behind it no longer inherits that audio.
