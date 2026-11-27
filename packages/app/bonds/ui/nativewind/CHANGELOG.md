# @molecule/app-ui-nativewind

## 1.7.0

### Minor Changes

- Apply NativeWind styles to native SVG elements.

### Patch Changes

- Select browser UI and ClassMap entries when Metro asserts both browser and React Native conditions.

## 1.6.0

### Minor Changes

- Draws checkbox and radio marks and styles table rows and cells on a device.

### Patch Changes

- Growing text areas follow responsive font sizes and the default line-height ratio.

## 1.5.0

### Minor Changes

- `splitForNative` takes the element's data attributes and applies a `data-[state=checked]:` class only when they match, so a checkbox, switch or tab shows its state on a device.
- `splitForNative` hands a descendant selector's classes (`[&_p]:leading-relaxed`) to descendants with that tag through `descendants`, so an alert description's bare text keeps its own line height on a device.
- `splitForNative` reads a CSS grid's columns, gaps, item alignment and spans by breakpoint (`grid`), and the device ClassMap names the breakpoints and the tags the web's reset makes blocks, so native elements lay out grids and replaced elements as the web does.
- `splitForNative` reads a grid's rows, the text's line height and which sizes the classes set, and ranks a matching `data-[…]:` class above the plain class it overrides; the device ClassMap keeps the web's container, spacer, page, header, responsive-visibility and grid-row classes; `TextField` gains date and time types, `defaultValue`, `required`, `minLength`, `pattern`, `cols`, `wrap` and `autoGrow`.
- Add `splitForNative`, which divides an element's classes into its view's and the text classes its text inherits, with web line heights and the icon glyph classes.
- `splitForNative` lays a flex container that names no direction in a row, as the web does, and reports the text's font weight; a Box takes a `title`.

### Patch Changes

- The preset paints Tailwind's default palette (`text-gray-400`, `bg-red-500`, …) in the web's colours.

## 1.4.0

### Minor Changes

- Add the Tailwind preset `@molecule/app-ui-nativewind/preset` (theme colours, fonts, animations and `moleculeContent()`), and rewrite every web class a device cannot apply.

## 1.3.0

### Minor Changes

- Implement the ClassMap's tone classes.

## 1.2.2

### Patch Changes

- Declare the peers this package loads on start-up as required instead of optional.

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
  - @molecule/app-styling@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-tailwind@1.0.1
