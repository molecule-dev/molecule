---
'@molecule/api-ai-tools': minor
---

`exec_command` marks a stdout it had to shorten in the middle with `stdoutTruncated: true`, so a reader can tell a whole file from one whose text was clipped out of the output it received.
