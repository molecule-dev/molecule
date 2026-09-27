# @molecule/app-auth-shell-react

## 1.0.3

### Patch Changes

- e15c19a: Fleet audit fixes: stop emitting secondary `<header>` elements from shared shells — the auth brand header and legal ContentPageShell hero now render `<div>`/`<section>` (apps with their own top bar rendered two banners), the billing PricingPage heading/tier cards no longer use `<header>`, and AuthShellCardColumn gains `min-w-0` so wide auth forms no longer push pages past the mobile viewport.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-logger@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-ui@1.0.1
