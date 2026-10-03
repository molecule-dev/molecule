# @molecule/app-top-nav-layout-react

## 1.0.3

### Patch Changes

- 448916a: Give every nav link an `aria-label`: below the `md` breakpoint the visible label hides and the link collapses to an icon-only target whose icon is `aria-hidden`, so screen readers previously announced an unnamed link.

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
