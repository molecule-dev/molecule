---
'@molecule/api-ai-video-generation-ltx': patch
---

`generate()` refuses a non-finite `durationSeconds` with a 400 instead of serializing it to `duration: null`, which the 2.5 tiers read as automatic duration.
