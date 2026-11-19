# @molecule/app-rating-display-react

## 4.0.1

### Patch Changes

- Accessible labels are translated through `useTranslation()` and follow a locale switch: the rating label and, in interactive mode, each star's "Rate N of M" button label. The stars now sit in a labelled group, so the rate buttons keep their pressed state for assistive technology instead of being hidden under an image role.
- Each star keeps the gradient id it was given when it mounted instead of drawing a new one on every render.

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
