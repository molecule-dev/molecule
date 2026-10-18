---
'@molecule/api-ai-tools': patch
---

A file-writing tool's `diff` now counts the lines it actually changed, so a same-length rewrite reports its added and removed lines instead of `0/0`, and a content-identical write reports `type: "unchanged"`.
