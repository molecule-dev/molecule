---
'@molecule/api-ai-video-generation': minor
'@molecule/api-ai-video-generation-kandinsky': minor
---

ai-video-generation: `VideoJobResult` gains `expiresAt`, set when the provider reports when `url` is evicted. kandinsky: when the server requires an API key, a completed job's MP4 is downloaded by the bond and returned inline as `result.data` (the content URL answers 401 without the key), the server's `expires_at` is surfaced as `result.expiresAt`, the MP4 is downloaded once per job (later polls reuse it), and a 2xx response with a non-JSON body fails as a `KandinskyVideoError` instead of a raw `SyntaxError`.
