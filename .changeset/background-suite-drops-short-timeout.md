---
'@molecule/api-ai-tools': patch
---

A test run the executor detached itself now drops an outer `timeout <N>` that is shorter than the whole walk (the tool's own ceiling written down, or less than the run the consumer measured), and the result says so instead of letting the bound kill the run mid-walk.
