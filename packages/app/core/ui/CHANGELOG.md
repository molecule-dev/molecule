# @molecule/app-ui

## 1.3.1

### Patch Changes

- Fixes the spinner mark's atom glints: the warm pulse now animates a peach
  stop's opacity over the light base instead of animating stop-color, which
  could not interpolate CSS `var()` colors and left the gradient flat.

## 1.3.0

### Minor Changes

- Adds `moleculeSpinnerMarkSvg` — the animated molecule spinner mark as a framework-agnostic SVG string (3-phase atom swap, swap-synced atom glints, seamless blue flow, `currentColor` mono mode), the single source every molecule.dev surface renders.

## 1.2.1

### Patch Changes

- e15c19a: Fleet audit fixes: add `borderL` and `alertLeftAccent` class-map tokens, implement the previously-dropped Alert `variant="left-accent"` (status-colored 4px leading bar, React + Vue), and change the button icon/spinner spacing tokens from `mr-2`/`ml-2` to `shrink-0` (the button's own `gap` already provides spacing — the stacked margins made icons sit off-center).

## 1.2.0

### Minor Changes

- 6fb7157: Add `hiddenBelow(breakpoint)` and `hiddenFrom(breakpoint)` to the ClassMap, for swapping desktop and phone surfaces in CSS.

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
  - @molecule/app-bond@1.0.1
  - @molecule/app-i18n@1.0.1
