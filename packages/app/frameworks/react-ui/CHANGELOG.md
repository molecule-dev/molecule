# @molecule/app-ui-react

## 4.13.0

### Minor Changes

- Resolve the shared elements and overlay entries to the native renderers on React Native.
- Expose the typed text value from FloatingInput in every renderer. Use onValueChange in React, Solid, and Svelte, and the valueChange event in Vue and Angular.

### Patch Changes

- Select browser UI and ClassMap entries when Metro asserts both browser and React Native conditions.
- Expose FileField from the React Native root through the same public entry as React DOM.

## 4.12.1

### Patch Changes

- Clarify that the React elements entry renders React DOM and that the native elements entry has yet to ship.

## 4.12.0

### Minor Changes

- Support a hidden file picker shared by multiple browse buttons and a configurable browser drop target.

## 4.11.0

### Minor Changes

- Report changes to text fields, checkboxes, and switches through callbacks that receive the new value directly.

## 4.10.0

### Minor Changes

- Adds FileField for browsing and dropping files with shared filtering and portable selections.

## 4.9.0

### Minor Changes

- Modal takes `initialFocus`, the control that receives focus when it opens, and PromptDialog uses it to focus its input.
- Shares account, confirmation and menu dismissal across renderers and positions anchored overlays consistently.

### Patch Changes

- Serialize inline styles through `@molecule/app-inline-style-dom`.
- Updated dependencies
- Updated dependencies
  - @molecule/app-inline-style-dom@1.2.0
  - @molecule/app-overlay-dom@1.1.0

## 4.8.1

### Patch Changes

- Use the shared DOM hover and Ctrl-wheel zoom gestures in React elements.
- Updated dependencies
  - @molecule/app-pointer-events-dom@1.1.0

## 4.8.0

### Minor Changes

- Adds disclosure and thematic break elements, address containers, and number and date field bounds.
- Adds element drag, hover and touch observation, double activation, nearest-edge reveal, and a Ctrl-wheel zoom shortcut.
- Report scroll offsets on existing elements, support secondary presses, and retain authored select defaults.
- Render Toast and Tooltip with shared elements, preserve their React DOM types, and support callback ref cleanup.
- Adds the `PulseDots` element for reduced-motion-aware typing animation. Requires `@molecule/app-ui` 1.9.0.
- Add the `./platform` overlay host, layer, portal and backdrop that Modal, ConfirmDialog and the app shell's drawer render with, coordinate Escape, focus and body scroll with the other web UI kits, and keep Dropdowns in the trigger's document.
- Adds SVG definitions, gradients, clipping, patterns, images, and descriptive metadata to the React elements.
- Preserves authored web attribute order and supports centered cover images on boxes.
- Share pointer drag ownership across the web UI kits.

### Patch Changes

- Lays out Input, Select and Textarea wrappers as flex columns so a control's margin is the same on every renderer.

## 4.7.0

### Minor Changes

- 7a92839: Add SelectField and support ordered multiple values in Select.

### Patch Changes

- Form, its fields and labels, and PageShell render with the renderer-neutral elements; their web output is unchanged. `Label` now takes `role` and `aria-invalid` with the types every kit component's props declare (`ElementRole`, `AriaBoolean`); its other attributes are unchanged.

## 4.6.0

### Minor Changes

- Adds an Anchor element that renders a literal href and uses browser navigation without a router.
- Support plain-text paste, focus selection, outside dismissal and interactive SVG shapes in shared React elements.
- Add RangeField for platform range inputs.
- Add a `RichText` element for rendering rich translation messages.

## 4.5.0

### Minor Changes

- Adds the FormArea, Fieldset, CheckField, TableBox and TableCell elements, which Form, Checkbox, RadioGroup, Switch and Table now render with; a PromptDialog whose onSubmit throws stays open for a retry.

### Patch Changes

- A growing text area counts its rows in the field's exact line height.

## 4.4.0

### Minor Changes

- PageHeader breadcrumb links navigate through the app's router instead of reloading the page.
- Icon, Alert and Avatar render with the elements; the elements add `SvgMarkup`, path fill rules and image `onLoad`/`onError`, and `renderIcon` draws an icon set's prebuilt markup glyphs.
- `splitForNative` reads a grid's rows, the text's line height and which sizes the classes set, and ranks a matching `data-[…]:` class above the plain class it overrides; the device ClassMap keeps the web's container, spacer, page, header, responsive-visibility and grid-row classes; `TextField` gains date and time types, `defaultValue`, `required`, `minLength`, `pattern`, `cols`, `wrap` and `autoGrow`.
- A Box takes the interaction handlers; Badge, Separator and Skeleton render with the elements, and Card renders as one element.
- Card and its header, title, description, content and footer render with the elements; the sections take `CardSectionProps`.
- Add `./elements` (Box, Text, Pressable, TextField, Image, ScrollArea, Svg, Link, GlyphIcon), renderer-neutral elements each rendering the web tag its `as` prop names; Button and Spinner render with them.
- Input, Textarea and FloatingInput render with the elements; FloatingInput takes `FloatingInputProps`.
- EmptyState, LoadErrorBanner, Container, Flex, Grid, Spacer, AuthGuard, ThemeToggle, ConfirmButton, SidebarUserCard, Tabs, Accordion, Pagination and LanguagePicker render with the elements; ThemeToggle, LanguagePicker, LoadErrorBanner and SidebarUserCard take the kit's element props, `testId` included.
- Progress renders with the elements.

## 4.3.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it.

## 4.3.1

### Patch Changes

- ConfirmDialog and PromptDialog point the dialog at their heading only while the title renders something, and PromptDialog's input label follows a projected title as it changes.

## 4.3.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.2.0

### Minor Changes

- Components forward every prop their types declare (`automationId` as `data-mol-id`, `id`, `title`, `aria-*` and DOM event handlers), Tabs, Accordion, Dropdown and Card honor `disabled`, and handlers are typed with the kit event types from `@molecule/app-ui`, re-exported here.

## 4.1.7

### Patch Changes

- `Toast` passes a caller's `id` and other element props to its root, and `useToast().addToast` keeps an `id` the caller gives.

## 4.1.6

### Patch Changes

- `Dropdown` reports `onOpenChange` only for a real change (a toggle, a selection, Escape, a route change), so a controlled menu whose owner follows it stays open after opening or mounting open; `Dropdown`, `UserMenu`, `UserMenuPopover`, `SidebarUserCard`, `ResponsiveAppShell` and `PromptDialog` reset on a route change or reopen in the render that sees it.

## 4.1.5

### Patch Changes

- Document existing resource toggle direction and complete action labels with persistence regressions.

## 4.1.4

### Patch Changes

- ConfirmDialog and PromptDialog are named by their title and described by their description, the SidebarUserCard drawer is named "Account", and Tabs sets `aria-controls` only on the tab whose panel is rendered.
- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 4.1.3

### Patch Changes

- PageHeader's breadcrumb navigation label is translated (`ui.pageHeader.breadcrumbs`) and follows a locale switch.
- Interactive cards activate with Enter and Space, tabs take arrow keys on the focused tab, prompt dialogs focus their input on open, and Flex forwards every element prop.

## 4.1.2

### Patch Changes

- Components read translations through `useTranslation()`, so their text changes language the moment the locale switches instead of on their next unrelated re-render.

## 4.1.1

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 4.1.0

### Minor Changes

- Keep rejected submissions in form state and render accessible server error lists by default in React forms.

### Patch Changes

- ConfirmButton no longer leaks an unhandled rejection when `onConfirm` rejects, and PromptDialog accepts the next submit when its parent keeps it open after a successful one.

## 4.0.1

### Patch Changes

- `AuthGuard` renders its children on its own login path, so a guard around the whole route tree no longer redirects in a loop.
- ClassMap tokens for truncated text, minimum width, `object-cover`, pointer events, a left-docked drawer and the user menu parts, with numeric sizes safelisted; the React and React Native components use them instead of raw class names.
- `Switch` runs a caller's `onClick` before toggling (and skips the toggle when it calls `preventDefault()`) instead of letting it replace the toggle.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0

## 3.1.0

### Minor Changes

- Add OptimisticToggleButton for immediate server-backed action labels with ordered saves and rollback.

## 3.0.5

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 3.0.4

### Patch Changes

- Redirect guarded routes only for unauthenticated sessions, retaining unavailable candidates without requiring a profile.
- Document the three-way session-restore decision and test guarded and public rendering during restore.

## 3.0.3

### Patch Changes

- Show one tooltip at a time while preserving hover access to tooltip content.

## 3.0.2

### Patch Changes

- Restore the colored context ring with context and allowance summaries, detailed usage controls, localized labels, and persistent, dismissible tooltips.

## 3.0.1

### Patch Changes

- Clarify pending button interactions and asynchronous action status.

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

## 1.3.5

### Patch Changes

- f1a9581: `AuthGuard` renders from the session status, so a restored session paints immediately instead of waiting for a background verification.

## 1.3.4

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.3.3

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.3.2

### Patch Changes

- 3a0eda6: `Switch` delivers a click that lands right after it renders, instead of dropping it.

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
