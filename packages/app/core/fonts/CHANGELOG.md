# @molecule/app-fonts

## 1.1.0

### Minor Changes

- 5dd8c98: `setFont(font, { basePath })` loads local font faces from `<basePath>fonts/<file>`, so a site served under a sub-path (Vite `base: '/blog/'`) no longer 404s every face at `/fonts/…`. When the option is omitted the document's `<base href>`, then `import.meta.env.BASE_URL`, then `/` apply. `resolveFontBasePath()` is exported.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
