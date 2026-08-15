---
'@molecule/api-code-sandbox-e2b': minor
---

`get()` now returns `null` only for a sandbox that does not exist and throws on any other failure, a new `describe(id)` reads a sandbox's record without connecting (so a status check never resumes a paused sandbox, and a paused one reports `sleeping`), and sandboxes are created with `onTimeout: pause` instead of E2B's default `kill`. `list()` skips paused sandboxes rather than waking them.
