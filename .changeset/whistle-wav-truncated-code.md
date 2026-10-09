---
'@molecule/api-ai-speech-whistle': patch
---

A WAV file that names the RIFF/WAVE container but ends inside it now fails as `WhistleWavError` code `truncated` (missing chunks), as the error's documented contract promises — the old 44-byte acceptance floor classified every cut-off file as `not-wav`, leaving no input that could reach the `truncated` code. Files too short to name a container at all are still `not-wav`.
