# @molecule/app-footer-react

## 1.0.2

### Patch Changes

- 22c0931: The `appName` interpolated into legal HTML (content page, legal modals, footer modals) is now HTML-escaped before it reaches `dangerouslySetInnerHTML`, so a markup-carrying app name renders inert instead of executing inside the legal content.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
