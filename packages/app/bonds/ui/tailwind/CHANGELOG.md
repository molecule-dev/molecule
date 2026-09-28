# @molecule/app-ui-tailwind

## 1.2.3

### Patch Changes

- 55b76aa: Dialogs and bottom sheets render above other fixed layers (z-index 9999 / 9998).

## 1.2.2

### Patch Changes

- e15c19a: Fleet audit fixes: add `borderL` and `alertLeftAccent` class-map tokens, implement the previously-dropped Alert `variant="left-accent"` (status-colored 4px leading bar, React + Vue), and change the button icon/spinner spacing tokens from `mr-2`/`ml-2` to `shrink-0` (the button's own `gap` already provides spacing — the stacked margins made icons sit off-center).

## 1.2.1

### Patch Changes

- `Switch` has a 40×40 hit area centred on its track; the visual size is unchanged.

## 1.2.0

### Minor Changes

- 6fb7157: Add `hiddenBelow(breakpoint)` and `hiddenFrom(breakpoint)` to the ClassMap, for swapping desktop and phone surfaces in CSS.

## 1.1.2

### Patch Changes

- ae701e1: Dark theme: inline `code`, blockquote text, captions, and `kbd` hints inside `cm.prose` content now use theme tokens — they previously kept the typography plugin's light-theme ink and were nearly unreadable on dark backgrounds.

## 1.1.1

### Patch Changes

- 726053b: `appLayout` no longer pads the top by 55px (the shell's header renders in flow, so the pad cleared a header that never overlapped) and `headerBar` carries no background or shadow by default — apps that want a chrome bar pass their own header classes.

## 1.1.0

### Minor Changes

- 1f01d1f: Add `UIClassMap.touchTargetCompact` — a 36px coarse-pointer hit-area floor for inline CTAs in dense surfaces (banner/chat-card actions) where the full 44px `touchTarget` is visually heavy; chat notice-card actions with a semantic `color` now use it.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-styling@1.0.1
  - @molecule/app-ui@1.0.1
