---
'@molecule/api-ai-tools': patch
---

`edit_file` refuses a replacement whose only change is the line break at its boundary — `new_string` is `old_string` with its trailing newline added or removed — whenever the file has text on the same line there, since applying it would move that text across lines. The rest of the batch is applied, and the result carries `skippedNote` naming the replacement and how to make the change on purpose.
