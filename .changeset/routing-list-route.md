---
'@molecule/app-routing': minor
---

Add `resolveListRoute`, `listRouteRedirect`, `matchRoutePattern` and `createConsumedSearchParam`, the URL-backed list and one-time query parameter rules every framework binding shares, and `toHistoryStateRecord`/`fromHistoryStateRecord` for native routers that only store an object. The browser router keeps each entry's state and location key in `history.state`, so Back restores both.
