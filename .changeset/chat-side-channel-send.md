---
'@molecule/app-ai-chat': minor
'@molecule/app-ai-chat-http': minor
'@molecule/app-react': minor
---

Adds a side-channel send for human-to-human chat messages (e.g. team notes): `ChatProvider.sendSideMessage` (optional, implemented by the HTTP bond on an independent request lifecycle) and a `sideChannel` option on `useChat`'s `sendMessage`. A side-channel message goes out immediately even while a turn is streaming — it never queues behind the active turn, never aborts the live stream, and never disrupts remote-turn tracking. Callers fall back to the normal send path on providers without side-channel support.
