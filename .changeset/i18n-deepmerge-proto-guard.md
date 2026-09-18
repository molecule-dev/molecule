---
'@molecule/api-i18n': patch
---

Translation merges skip `__proto__`/`constructor`/`prototype` keys at every depth, so a translations source carrying a JSON-parsed own `__proto__` property can no longer write through to `Object.prototype`.
