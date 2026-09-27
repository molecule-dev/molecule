---
'@molecule/app-ide-react': patch
---

Card actions in chat cards and the help card now go through the same URL-scheme allowlist as markdown links — an action whose `href` carries a scriptable scheme (`javascript:`, `data:`, …) renders as inert text instead of an anchor.
