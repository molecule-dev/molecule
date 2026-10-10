---
'@molecule/app-ide-react': patch
---

Tool-call cards no longer crash the whole IDE when model-authored input is malformed at the element level: an `edit_file` replacement entry that is null or a non-object is skipped instead of read, and the live activity label reads each declared-string tool-input field through the same string coercion the cards use.
