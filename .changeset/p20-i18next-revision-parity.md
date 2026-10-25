---
'@molecule/app-i18n-i18next': patch
---

Expose the optional `getRevision()` counter, announce text added to any locale `t()` reads (the active locale, its base language and the fallbacks) and announce once when initialization settles, so React consumers see translation and language changes made before their subscription.
