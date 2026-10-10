---
'@molecule/app-ide-react': patch
---

The added/removed line count on an edit card is now computed in bounded time and memory, so an edit that replaces a whole large file no longer freezes the IDE.
