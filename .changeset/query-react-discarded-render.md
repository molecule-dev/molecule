---
'@molecule/app-query-react': minor
---

`useQuery` keeps the options and previous document of the committed render, so a discarded transition render no longer resubscribes the key on screen; it now peers on `@molecule/app-react` 4.8 or later.
