---
'@molecule/app-react': patch
---

useChat: a resumed chat stream now has the same stall watchdog as a send, and an open stream that falls silent while the push channel keeps delivering its turn is aborted and resumed instead of leaving the chat frozen.
