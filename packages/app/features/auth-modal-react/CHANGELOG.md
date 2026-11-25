# @molecule/app-auth-modal-react

## 5.0.0

### Minor Changes

- Renders with the renderer-neutral elements, on the web and React Native; the web output is unchanged. Requires `@molecule/app-ui` 1.9.0.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-auth-shell-react@5.0.0

## 4.0.5

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.0.4

### Patch Changes

- A login or signup link clicked right after the mount moves to a new parent now opens the modal.

## 4.0.3

### Patch Changes

- The touch-first viewport check reads `matchMedia` through `useSyncExternalStore` instead of copying it into state from an effect.

## 4.0.2

### Patch Changes

- Every clickable surface is reachable and operable from the keyboard and named for screen readers, using native buttons and radios where they fit.

## 4.0.1

### Patch Changes

- Components read translations through `useTranslation()`, so their text changes language the moment the locale switches instead of on their next unrelated re-render.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-auth-shell-react@4.0.0
  - @molecule/app-oauth-buttons-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-auth-shell-react@3.0.0
  - @molecule/app-oauth-buttons-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-auth-shell-react@2.0.0
- @molecule/app-oauth-buttons-react@2.0.0
- @molecule/app-ui-react@2.0.0

## 1.1.0

### Minor Changes

- New `captchaSlot` / `captchaSolved` props render a human-verification challenge in the signup form and gate its submit, so an API that requires a verification token can be used from the in-app modal.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth-shell-react@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-oauth-buttons-react@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
