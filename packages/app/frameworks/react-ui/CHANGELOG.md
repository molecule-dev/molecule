# @molecule/app-ui-react

## 1.2.3

### Patch Changes

- 4cd0ba5: ResponsiveAppShell.Sidebar footer now renders as a horizontal `justify-between` row (UserMenu left, ThemeToggle right) instead of stacking them vertically. Apps that pass `<UserMenu />` and `<ThemeToggle />` into the footer slot get a properly spaced bottom bar without a wrapper div.

## 1.2.2

### Patch Changes

- 55b76aa: The UserMenu trigger has a border that matches the LanguagePicker.

## 1.2.1

### Patch Changes

- e15c19a: Fleet audit fixes: add `borderL` and `alertLeftAccent` class-map tokens, implement the previously-dropped Alert `variant="left-accent"` (status-colored 4px leading bar, React + Vue), and change the button icon/spinner spacing tokens from `mr-2`/`ml-2` to `shrink-0` (the button's own `gap` already provides spacing — the stacked margins made icons sit off-center).

## 1.2.0

### Minor Changes

- Adds ResponsiveAppShell, LoadErrorBanner, ConfirmDialog and PromptDialog.

## 1.1.0

### Minor Changes

- Add `ConfirmButton` (two-step confirm for destructive actions); `Icon` renders a placeholder instead of throwing for an unknown name; theme toggle and user menu triggers meet a 40px touch target.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-icons@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
