---
'@molecule/app-ai-voice-whistle': patch
---

A start superseded by stop-then-start while the microphone was still opening now releases the microphone it opened: the abandoned setup used to build a second capture graph under the live session's fields and leave its stream running.
