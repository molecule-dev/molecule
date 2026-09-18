---
'@molecule/api-media-streaming-hls': minor
---

String inputs to `createStream()`/`transcode()` are now validated as local absolute file paths — URLs and any `scheme:`-prefixed value are rejected before ffmpeg runs, closing an SSRF/file-read primitive when apps forward user-supplied strings. The ffmpeg protocol whitelist is trimmed to local protocols (`file,crypto`); fetch remote media yourself and pass a `Buffer`.
