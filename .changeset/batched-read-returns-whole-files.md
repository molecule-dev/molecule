---
'@molecule/api-ai-tools': minor
---

A batched `read_file` returns whole files only: one result is capped at `MAX_READ_CALL_CHARS` (60,000 characters, the ceiling a host puts on one tool result) instead of `MAX_BATCH_READ_BYTES` (200 KB). Files are returned whole up to it and every path past that is named in `note` and listed in `files` as `not returned`, so no file is ever handed back in part and the caller can see which reads it still owes. `MAX_READ_RETURN_CHARS` is now that ceiling less its envelope, `MAX_BATCH_READ_BYTES` is removed, and `serializedChars` / `linesWithinSerialized` are new: a window is sized on the text as JSON counts it, so a large read no longer arrives one newline per line over the bound it was sized for.
