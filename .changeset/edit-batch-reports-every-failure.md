---
'@molecule/api-ai-tools': patch
---

`edit_file` names every replacement of a batch that does not match the file. A batch is applied all-or-nothing, so the failure now reports each bad `old_string` — its position in the batch, and where it stops agreeing with the file — in one result, instead of one replacement per round trip. Nothing is written when any of them fails.
