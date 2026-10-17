---
'@molecule/app-auth': minor
---

`createBrowserStorageAdapter()` builds a `StorageAdapter` over the browser's Web Storage, which is what
keeps a signed-in session across a page reload when the API issues no httpOnly session cookie. Pass it as
`AuthClientConfig.storage`; `kind: 'session'` narrows it to the tab's lifetime. The client's own default
stays `'memory'`, and an httpOnly cookie session remains the stronger choice wherever the API sets one —
a token in Web Storage is readable by any script on the origin. `AuthClientConfig.storage`'s docs now say
which store to pick, how to swap it, and what each costs.
