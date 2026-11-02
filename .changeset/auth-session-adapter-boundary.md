---
'@molecule/app-auth': patch
---

Clarify that sharing a token key does not turn a separate context or provider with copied session state into an adapter. View and debug adapters should read the bonded client instead of maintaining a second session store.
