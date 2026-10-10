---
'@molecule/api-ai-speech-whistle': patch
---

The streaming resampler keeps the last buffered input sample across a flush, so audio pushed after a flush is interpolated continuously instead of starting with a sample computed against silence.
