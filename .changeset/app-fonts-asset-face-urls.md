---
'@molecule/app-fonts': minor
---

A local face's `file` may now be a final URL — a root-absolute asset path (`/assets/…`), an `http(s):` URL or a `data:` URL — and `setFont()` uses it as-is instead of resolving it under `<basePath>fonts/`, so a bundler's `?url` import can serve a font without copying files.
