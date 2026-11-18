---
'@molecule/app-password-generator-react': minor
---

Copying the generated password now goes through `@molecule/app-clipboard`, which falls back to the legacy copy command when the Clipboard API is unavailable. The copy confirmation appears only when a copy actually happened, and the package adds `@molecule/app-clipboard` as a peer dependency.
