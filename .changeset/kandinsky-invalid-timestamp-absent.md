---
'@molecule/api-ai-video-generation-kandinsky': patch
---

A job status carrying a numeric timestamp the Date type cannot represent no longer crashes the poll with a raw `RangeError`; the unrepresentable field is treated as absent.
