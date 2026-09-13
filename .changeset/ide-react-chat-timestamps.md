---
'@molecule/app-ide-react': minor
---

`ChatPanel` timestamps: off by default (your own messages and critical events still show one), shown on every message and event with `/timestamps on` or `setChatTimestampsVisible`; a run of identical labels shows once, labels advance each minute, and custom cards can set `critical: true`.
