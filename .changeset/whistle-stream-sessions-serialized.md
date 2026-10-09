---
'@molecule/api-ai-speech-whistle': patch
---

Concurrent `transcribeStream` calls are serialized: the engine keeps ONE live stream per process, so two transcriptions at once no longer interleave their audio into a single shared transcript. A session holds the engine from its first block to its stop; a concurrent call queues until it is free.
