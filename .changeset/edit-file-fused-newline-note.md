---
'@molecule/api-ai-tools': patch
---

`edit_file` reports a replacement that dropped the newline after the replaced text and the parse error it caused as one message: it shows the line the two lines became and says to re-send that replacement with the newline restored.
