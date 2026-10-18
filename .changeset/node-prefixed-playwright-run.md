---
'@molecule/api-ai-tools': patch
---

A Playwright run launched by file (`node …/node_modules/.bin/playwright test`) is read as the same run as `npx playwright test`, so it keeps its trace, suite-budget pin and background-launch rewrites.
