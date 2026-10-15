---
'@molecule/api-ai-tools': patch
---

A command backgrounded only because it asked for more than the tool's time limit, and that finishes within `overCeilingGraceMs` (45 s), returns its output like a foreground run.
