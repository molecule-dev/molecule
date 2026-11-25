# @molecule/app-ui

## 1.7.0

### Minor Changes

- Types for the FormArea, Fieldset, CheckField, TableBox and TableCell elements, and `aria-sort` on the shared ARIA attributes.
- `ElementLinkProps.target` accepts any browsing-context keyword or name.

### Patch Changes

- Native ClassMaps can report the exact line height at each breakpoint.

## 1.6.1

### Patch Changes

- The elements' boolean ARIA props take `'true'` and `'false'` as React DOM does.

## 1.6.0

### Minor Changes

- `splitForNative` takes the element's data attributes and applies a `data-[state=checked]:` class only when they match, so a checkbox, switch or tab shows its state on a device.
- `splitForNative` hands a descendant selector's classes (`[&_p]:leading-relaxed`) to descendants with that tag through `descendants`, so an alert description's bare text keeps its own line height on a device.
- Add renderer-neutral element prop types (`BoxProps`, `TextProps`, `PressableProps`, `GlyphIconProps` and others) and the ClassMap's native class split.
- Icon, Alert and Avatar render with the elements; the elements add `SvgMarkup`, path fill rules and image `onLoad`/`onError`, and `renderIcon` draws an icon set's prebuilt markup glyphs.
- `splitForNative` reads a CSS grid's columns, gaps, item alignment and spans by breakpoint (`grid`), and the device ClassMap names the breakpoints and the tags the web's reset makes blocks, so native elements lay out grids and replaced elements as the web does.
- `splitForNative` reads a grid's rows, the text's line height and which sizes the classes set, and ranks a matching `data-[…]:` class above the plain class it overrides; the device ClassMap keeps the web's container, spacer, page, header, responsive-visibility and grid-row classes; `TextField` gains date and time types, `defaultValue`, `required`, `minLength`, `pattern`, `cols`, `wrap` and `autoGrow`.
- A Box takes the interaction handlers; Badge, Separator and Skeleton render with the elements, and Card renders as one element.
- Card and its header, title, description, content and footer render with the elements; the sections take `CardSectionProps`.
- Input, Textarea and FloatingInput render with the elements; FloatingInput takes `FloatingInputProps`.
- `splitForNative` lays a flex container that names no direction in a row, as the web does, and reports the text's font weight; a Box takes a `title`.

## 1.5.0

### Minor Changes

- Adds `KitEvent`, `KitMouseEvent`, `KitKeyboardEvent`, `KitFocusEvent` and `KitModifierKeys`, the event members every UI kit passes to a component's handlers. `BaseProps` now documents which element a component's ref receives, and that `disabled` disables the controls a component renders.

### Patch Changes

- A handler written for the event a kit passes, such as `(event: Event) => void` on the Vue, Solid, Svelte and Angular kits, is accepted by the kits' handler props again; an unannotated handler's event is still `KitEvent`.

## 1.4.0

### Minor Changes

- UIClassMap gains textTone, bgTone, borderTone, textOnTone and bgScrim, so a component colours a status from the theme instead of a hex value.

## 1.3.11

### Patch Changes

- Feature components style through ClassMap tokens instead of raw class names, so a styling bond swap restyles them too; the Tailwind bond renders the same classes as before.

## 1.3.10

### Patch Changes

- ClassMap tokens for truncated text, minimum width, `object-cover`, pointer events, a left-docked drawer and the user menu parts, with numeric sizes safelisted; the React and React Native components use them instead of raw class names.

## 1.3.9

### Patch Changes

- The README lists every member of long type declarations and keeps long descriptions whole.

## 1.3.7

### Patch Changes

- e7a285d: A request-supplied stylesheet is used by its own class names written directly in `className` — ClassMap governs molecule's utilities, not a supplied stylesheet's contract.

## 1.3.6

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.3.5

### Patch Changes

- b876925: Documents that `Button` defaults to `type="button"` and that a form's primary action needs `type="submit"`.

## 1.3.4

### Patch Changes

- `accentCard({ tone })` and `accentCardLabel({ tone })`: a block with an inset colored bar down its leading edge and a heading in the bar's color, with semantic, primary and custom (`--mol-accent`) tones.

## 1.3.3

### Patch Changes

- 44ba621: Search UI tokens: searchField, filterChip, kbd, resultList and friends, for search boxes and result lists.

## 1.3.2

### Patch Changes

- The spinner's warm glint now rides a peach overlay circle stacked over an
  always-opaque base stroke. Fading a stop of the base itself made part of each
  atom's rim semi-transparent, which showed the background through on light
  surfaces.

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
