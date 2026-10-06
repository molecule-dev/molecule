---
'@molecule/api-resource-share': patch
---

Public share-link slugs are now always generated with `node:crypto` `randomBytes`, with no `Math.random` fallback.
