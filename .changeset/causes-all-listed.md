---
'@molecule/api-ai-tools': patch
---

A finished test run's cause list now carries every cause the result has room for (bounded by the platform's tool-output cap), each with its first failure's `Expected:`/`Received:` lines or locator, and names any cause it had to leave out with the one command that prints its body.
