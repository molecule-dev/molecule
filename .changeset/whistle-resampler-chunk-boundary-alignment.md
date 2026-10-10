---
'@molecule/api-ai-speech-whistle': patch
---

The streaming resampler no longer shifts its timeline when a chunk boundary lands just before a block's advance, so audio pushed in chunks is resampled to the same samples and the same count as the same audio pushed at once.
