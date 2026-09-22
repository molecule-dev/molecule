---
'@molecule/api-ai-tools': patch
---

When `edit_file`'s `old_string` does not match, the error says which kind of miss it was: none of its lines are in the file (already applied, or wrong file — do not retry the same string) versus present but not distinctive enough to locate. The old message advised re-reading and copying exact text in both cases, which is wrong advice for the first.
