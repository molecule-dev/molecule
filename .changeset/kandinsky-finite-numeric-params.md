---
'@molecule/api-ai-video-generation-kandinsky': patch
---

Non-finite numeric parameters (`durationSeconds`, `fps`, `seed`, `steps`, `guidanceScale`, `width`, `height`) are refused with a 400 `KandinskyVideoError` before any request, instead of riding the multipart form as the literal strings `"NaN"`/`"Infinity"`.
