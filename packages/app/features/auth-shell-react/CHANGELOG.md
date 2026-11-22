# @molecule/app-auth-shell-react

## 4.1.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.0.3

### Patch Changes

- The back link's arrow glyph is hidden from assistive technology, so the link is named by its label alone, and an empty or blank `label` falls back to the translated default.

## 4.0.2

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 4.0.1

### Patch Changes

- Feature components style through ClassMap tokens instead of raw class names, so a styling bond swap restyles them too; the Tailwind bond renders the same classes as before.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

## 1.0.4

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

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
