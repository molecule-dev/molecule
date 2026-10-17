---
'@molecule/api-ai-tools': patch
---

A file tool called while a newly claimed sandbox is still attaching now waits for its command channel (four attempts over about 2.6 s) and reports "the sandbox is still starting" instead of refusing the path as if the sandbox were gone.
