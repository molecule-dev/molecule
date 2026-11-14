---
'@molecule/app-i18n': patch
---

The simple i18n provider logs through whichever logger is bonded at the time of each call, so a logger bonded after its first log receives the later calls.
