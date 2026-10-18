---
'@molecule/api-ai-tools': patch
---

The suite-overlap rule has no per-run-uid exemption: two suite runs against the same app and database are serialized, because a suite's cleanup can delete public rows the other suite reads.
