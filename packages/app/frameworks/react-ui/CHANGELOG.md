# @molecule/app-ui-react

## 1.3.1

### Patch Changes

- 031daf7: `ResponsiveAppShell` closes its drawer on same-route navigations too — the fleet's `#top` safe-target pattern appends a hash when the current nav item is re-tapped, which changed neither pathname nor search, and the drawer previously stayed open over the page.

## 1.3.0

### Minor Changes

- NEW ConfirmButton: the two-step destructive-action pattern (click arms → "Confirm?" → second click commits, auto-disarm, Escape, aria-live, pending state) as one shared, theme-aware component — replaces the arm-confirm state machines ~30 apps hand-rolled.
- ResponsiveAppShell hardening from the first adoption wave: drawer wrapper z-index fix (backdrop painted above the panel on the first eight adopting apps), focus-trap + reference-counted scroll lock (coexists with stacked Modal), TopBar min-width guard so long brands never push actions off-screen, mobile-first root flexDirection. Docs: documented the cn() tailwind-merge ordering trap behind the styling package's cn().
- Switch: the track button now carries a 40×40 `after:` touch hit-area (visual sm/md/lg unchanged) — meets WCAG 2.5.8 by default instead of shipping 20–28px targets. ThemeToggle trigger grew from 30px to a 40×40 hit area (20px icon centered, visual unchanged).

### Patch Changes

- Icon: an unknown bonded-set name now warns and renders a neutral placeholder circle instead of throwing — a missing glyph must never white-screen an app.
- UserMenu trigger: default 40×40 touch-target floor (the icon-only size="sm" trigger measured 42×26px fleet-wide). Apps can still widen via className.

## 1.2.4

### Patch Changes

- 83e525d: UserMenu gains a `side` prop (`'left' | 'right'`, default `'right'`). Apps whose sidebar trigger sits on the left should pass `side="left"` so the panel opens adjacent to the trigger instead of always from the right viewport edge.

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
