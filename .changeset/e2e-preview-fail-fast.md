---
'@molecule/app-e2e-preview': patch
---

`connect()` fails within 8 s when no preview page is attached, naming the cause and the `MOL_E2E_PROVIDER=playwright` alternative, and later connects in the same run fail at once instead of waiting again per test.
