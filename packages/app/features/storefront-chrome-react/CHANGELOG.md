# @molecule/app-storefront-chrome-react

## 4.1.1

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.1.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.0.3

### Patch Changes

- The sign-out, avatar and account-menu labels fall back to translated defaults, so the nav reads in the visitor's language without the caller passing strings. The decorative avatar icon is hidden from screen readers so the button's label names the control.

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
  - @molecule/app-ui-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-ui-react@2.0.0

## 1.0.3

### Patch Changes

- 04d3f3b: Every labelled button renders through `cm.button()`; none is hand-styled. Visual parity with the design system, no API change.

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
