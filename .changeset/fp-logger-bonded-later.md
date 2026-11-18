---
'@molecule/app-logger': minor
---

Loggers from `getLogger` and `createLogger` log through the provider bonded when they log, so a module-level logger follows a provider bonded or swapped later.
