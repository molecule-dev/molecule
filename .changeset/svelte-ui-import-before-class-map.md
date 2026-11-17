---
'@molecule/app-ui-svelte': patch
---

Importing the package before `setClassMap()` no longer throws: the class constants read at load are empty until a class map is bonded, and the class records (`cardPaddingMap`, `toastPositionClasses`, …) read the current class map on each access.
