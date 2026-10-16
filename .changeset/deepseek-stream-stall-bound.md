---
'@molecule/api-ai-deepseek': patch
'@molecule/api-ai': patch
---

A stream that opens and then produces no content is now bounded: `chat()` waits at most 45 s for the first content event, asks once more with a fresh stream, and after the reply has started bounds the silence between chunks at 60 s instead of leaving both to the caller (`onStreamStall` reports each one).
