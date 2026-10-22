---
'@molecule/api-ai-tools': patch
---

Keep a shell word whole when it contains a command substitution, so a runner behind `UID_VAL=h$(date +%s) ./run-tests.sh` is still read in command position.
