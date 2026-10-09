---
'@molecule/api-ai-speech-whistle': patch
---

The WAV decoder treats its input as hostile: RIFF chunk size fields are read as unsigned 32-bit (a header declaring `0xFFFFFFF8` no longer traps the parser in an endless scan that hung `transcribe()`), and source sample rates outside 4000–384000 Hz are rejected as `unsupported-format` instead of scaling the 16 kHz resample into a crash or an out-of-memory allocation.
