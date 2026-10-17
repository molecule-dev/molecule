---
'@molecule/api-ai-tools': patch
---

A composed re-run of a Playwright suite now names each failing test by a path Playwright can match, instead of the reporter's `../../fixtures/…` form, which matched no tests and printed "No tests found".
