# @molecule/app-ui-vue

## 1.7.0

### Minor Changes

- Adds FileField for browsing and dropping files with shared filtering and portable selections.

## 1.6.0

### Minor Changes

- Modal takes `initialFocus`, the control that receives focus when it opens, and PromptDialog uses it to focus its input.
- Coordinates inline overlay dismissal, document-local positions and toast pauses with the shared platform.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-inline-style-dom@1.2.0
  - @molecule/app-overlay-dom@1.1.0

## 1.5.0

### Minor Changes

- Add mouse and pen hover and Ctrl-wheel zoom bindings for DOM elements.
- Expose React-compatible inline style objects for Vue bindings.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-pointer-events-dom@1.1.0
  - @molecule/app-inline-style-dom@1.1.0

## 1.4.0

### Minor Changes

- Share pointer drag ownership across the web UI kits.

### Patch Changes

- Lays out Input, Select and Textarea wrappers as flex columns so a control's margin is the same on every renderer.
- Coordinate Escape, focus and body scroll with the other web UI kits' dialogs, drawers and menus, keep Dropdowns in the trigger's document, and render open dialogs inline during server rendering. Requires `@molecule/app-ui` 1.9.0.

## 1.3.4

### Patch Changes

- A form submits the last value of a repeated field name and keeps a `__proto__` field as an ordinary key; a prompt dialog lets the user retry when its submit handler throws.
- A growing text area counts its rows in the field's exact line height.

## 1.3.3

### Patch Changes

- ThemeToggle, LanguagePicker and LoadErrorBanner take `testId` and `automationId`, and SidebarUserCard takes `testId`, as in React.
- PageHeader breadcrumb links navigate through the app's router instead of reloading the page.
- `renderIcon` draws an icon set's prebuilt markup glyphs.

## 1.3.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it.

## 1.3.1

### Patch Changes

- ConfirmDialog and PromptDialog point the dialog at their heading only while the title renders something, and PromptDialog's input label follows a projected title as it changes.

## 1.3.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.
- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.2.1

### Patch Changes

- `Grid` sets only the gap and template properties it is given, so `columnGap` and `rowGap` no longer clear the `gap` it set or erase the same property from the caller's `style`.

## 1.2.0

### Minor Changes

- Export the props types `@molecule/app-ui-react` exports (`ConfirmDialogProps`, `OptimisticToggleButtonProps`, …); `Form` treats a passed `submitError` as React's does, and each component carries React's `displayName`.
- Matches `@molecule/app-ui-react`: a component's ref receives its main element, components forward every prop their types declare (`automationId` as `data-mol-id`, `id`, `title`, `aria-*` and DOM event handlers), Tabs, Accordion, Dropdown and Card honor `disabled`, and handlers are typed with the kit event types from `@molecule/app-ui`.

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.1.5

### Patch Changes

- `Dropdown` no longer reports `openChange(false)` on mount, so a controlled menu mounted open stays open when its owner follows `openChange`.

## 1.1.4

### Patch Changes

- ConfirmDialog and PromptDialog are named by their title and described by their description, the SidebarUserCard drawer is named "Account", and Tabs sets `aria-controls` only on the tab whose panel is rendered.
- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.3

### Patch Changes

- PageHeader's breadcrumb navigation label is translated (`ui.pageHeader.breadcrumbs`) and follows a locale switch.
- Interactive cards activate with Enter and Space, tabs take arrow keys on the focused tab, prompt dialogs focus their input on open, and Flex forwards every element prop.

## 1.1.2

### Patch Changes

- A controlled checkbox, switch or radio group now updates only the `checked` property after creation, as React does.

## 1.1.1

### Patch Changes

- Lists keep each item's DOM node, and the focused item its focus, when items are replaced by equal ones or reordered, keyed the same way as `@molecule/app-ui-react`.

## 1.1.0

### Minor Changes

- The Vue, Solid and Angular UI packages export every `@molecule/app-ui-react` component with the same names, props, markup and behavior, and each UI package declares its framework binding, and every package its types reference, as a peer.

### Patch Changes

- UI components re-render their translated text on a locale switch, as `@molecule/app-ui-react` does; `@molecule/app-angular`'s `useTranslation().t` and `useT()` make the view that calls them follow a locale switch.
- Components read auth, routing, theme and translation through the framework binding (`@molecule/app-vue`, `@molecule/app-solid`) instead of a private copy of its accessors, so the binding's translated errors and fixes apply to them.

## 1.0.6

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- e15c19a: Fleet audit fixes: add `borderL` and `alertLeftAccent` class-map tokens, implement the previously-dropped Alert `variant="left-accent"` (status-colored 4px leading bar, React + Vue), and change the button icon/spinner spacing tokens from `mr-2`/`ml-2` to `shrink-0` (the button's own `gap` already provides spacing — the stacked margins made icons sit off-center).

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
  - @molecule/app-ui@1.0.1
