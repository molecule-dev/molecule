---
'@molecule/api-ai-tools': patch
---

A background task's own output can no longer be read as its exit code: the end probe's markers are parsed from fixed header lines, and a launch that backgrounds its work is no longer reported finished on the launch acknowledgement.
