---
'@molecule/app-e2e-preview': patch
---

`connect()` fails within 5 s when no preview page is attached, naming the cause and the `MOL_E2E_PROVIDER=playwright` alternative, and later connects in the same run fail at once (a marker beside the hub's token file) instead of waiting again per test.
