---
'@molecule/api-ai-speech-whistle': patch
'@molecule/app-ai-voice-whistle': patch
---

An engine-file download that dies mid-transfer now releases its connection by cancelling the reader that holds the stream, so a failed download no longer leaves a connection open.
