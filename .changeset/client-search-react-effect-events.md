---
'@molecule/app-client-search-react': minor
---

`useSearchSession`, `useLazyDocs` and `useClientSearchIndex` read their latest callbacks and options through the hooks of `@molecule/app-react/render`, so a render React discards no longer leaks into the committed search; the package now peers on `@molecule/app-react` 4.8 or later.
