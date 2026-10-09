# @molecule/api-ai-video-generation-kandinsky

## 1.2.0

### Minor Changes

- bd61b6b: ai-video-generation: `VideoJobResult` gains `expiresAt`, set when the provider reports when `url` is evicted. kandinsky: when the server requires an API key, a completed job's MP4 is downloaded by the bond and returned inline as `result.data` (the content URL answers 401 without the key), the server's `expires_at` is surfaced as `result.expiresAt`, the MP4 is downloaded once per job (later polls reuse it), and a 2xx response with a non-JSON body fails as a `KandinskyVideoError` instead of a raw `SyntaxError`.

### Patch Changes

- d20265f: An error response whose body dies mid-stream still fails as a `KandinskyVideoError` carrying the status, and an MP4 download that dies mid-transfer fails as a typed error with status 0 instead of a raw `TypeError`.
- 1350e9c: Non-finite numeric parameters (`durationSeconds`, `fps`, `seed`, `steps`, `guidanceScale`, `width`, `height`) are refused with a 400 `KandinskyVideoError` before any request, instead of riding the multipart form as the literal strings `"NaN"`/`"Infinity"`.
- 5c16ad4: A job status carrying a numeric timestamp the Date type cannot represent no longer crashes the poll with a raw `RangeError`; the unrepresentable field is treated as absent.

## 1.1.0

### Minor Changes

- 501132c: Adds @molecule/api-ai-video-generation-kandinsky, a self-hosted Kandinsky 6.0 (MIT weights) video-with-audio provider for @molecule/api-ai-video-generation over a vLLM-Omni server's /v1/videos API (REST via fetch, zero dependencies).
