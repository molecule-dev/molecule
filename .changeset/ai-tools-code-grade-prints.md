---
'@molecule/api-ai-tools': patch
---

A command that only prints source files returns it with the code-safe redaction, a TypeScript type literal is never masked, and a running `wait_for_task` asks not to edit the code under test.
