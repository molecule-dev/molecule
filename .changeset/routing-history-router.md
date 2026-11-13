---
'@molecule/app-routing': minor
---

Add `createHistoryRouter`, which builds a full `Router` on any native router's history. The browser and memory routers are built on it, so they now run navigation guards, honor `preserveQuery` and `preserveHash`, and notify each subscriber once per navigation.
