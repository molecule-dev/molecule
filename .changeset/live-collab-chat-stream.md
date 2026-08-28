---
'@molecule/app-ai-chat': minor
'@molecule/app-react': minor
'@molecule/app-ide-react': minor
'@molecule/app-locales-ide': minor
---

Live collaborative chat streaming: pushed broadcast frames from a turn running elsewhere (a teammate's send, another tab) render in real time — text and thinking deltas, tool activity, verification, completion — via the new `useChat.applyRemoteEvent` ingestion path, with a `readOnly` watcher mode for viewers and a progress-preserving history reconcile. Agent-setting changes (model, effort, fast mode, max tool loops, processing region, auto-fix, auto-approve) surface as shared, attributed transcript cards through the new `setting` card kind.
