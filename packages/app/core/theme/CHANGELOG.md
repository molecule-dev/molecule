# @molecule/app-theme

## 1.0.2

### Patch Changes

- 73962e5: `ThemeProvider.getServerTheme()` (optional): the theme a render without a browser produces, so a hydrating client can render the markup it was sent before switching to the live theme.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
