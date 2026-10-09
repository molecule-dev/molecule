---
'@molecule/api-code-sandbox-e2b': patch
---

`list()` keeps at most 16 sandbox connects in flight instead of one per running sandbox at once — a fleet sweep stays concurrent without spending a socket and file descriptor per sandbox on every poll.
