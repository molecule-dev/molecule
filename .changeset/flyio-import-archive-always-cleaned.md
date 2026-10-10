---
'@molecule/api-code-sandbox-flyio': patch
---

A failed `importFiles` extract now removes the staged archive instead of leaving it behind — on the workspace volume for the chunked fallback, in the sandbox's `/tmp` for the object-store path — while still failing with tar's real exit code.
