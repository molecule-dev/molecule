---
'@molecule/api-ai-tools': patch
---

`edit_file` reports a dropped line break only when the file proves the lines joined, so an edit that removed a blank line is no longer described as fusing two lines.
