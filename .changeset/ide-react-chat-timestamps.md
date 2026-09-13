---
'@molecule/app-ide-react': minor
---

`ChatPanel` timestamps: off by default (your own messages and critical events still show one), shown on every message and event with `/timestamps on` or `setChatTimestampsVisible`; labels are minute-precise ("5 minutes ago", then "9:25 AM", then "Sep 12, 9:25 AM") and advance each minute, a run of identical labels shows once, and custom cards can set `critical: true`.
