---
'@molecule/eslint-config': minor
---

Report a `beforeEach` or `beforeAll` callback that returns a mock, which Vitest calls as the hook's teardown, in test files; the autofix moves the call into a block body.
