---
'@molecule/app-ai-chat': minor
'@molecule/app-react': minor
'@molecule/app-ide-react': minor
---

Work that outlives the tool call that started it is now visible: a `background_task` stream event carries each detached command or subagent, `useChat` exposes them as `backgroundTasks`, and the chat panel shows what is running, for how long, and how each one ended.
