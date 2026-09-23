---
'@molecule/app-fonts': minor
---

`setFont(font, { basePath })` loads local font faces from `<basePath>fonts/<file>`, so a site served under a sub-path (Vite `base: '/blog/'`) no longer 404s every face at `/fonts/…`. When the option is omitted the document's `<base href>`, then `import.meta.env.BASE_URL`, then `/` apply. `resolveFontBasePath()` is exported.
