# @molecule/app-settings-panel-react

## 3.0.2

### Patch Changes

- AccountSection saves the name of accounts without an email, validates a non-empty email inline, and never sends a blank email.

## 3.0.1

### Patch Changes

- Use the shared profile lifecycle for account edits.

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-auth@3.0.0
  - @molecule/app-react@2.0.0
  - @molecule/app-ui-react@2.0.0

## 1.0.7

### Patch Changes

- Accept `@molecule/app-auth` 2.x alongside 1.x. The auth types this package reads are
  unchanged across both majors.

## 1.0.5

### Patch Changes

- Push-notification Switch carries aria-label — the visible text was a sibling span, so the control was announced as a bare "switch".

## 1.0.4

### Patch Changes

- Confirmations and toggles now use the shared `ConfirmDialog`, `ConfirmButton` and `Switch` from `@molecule/app-ui-react` instead of `window.confirm` and hand-built controls.

## 1.0.3

### Patch Changes

- The push-notifications switch has an accessible name.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
