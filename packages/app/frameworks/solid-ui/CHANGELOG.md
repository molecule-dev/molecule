# @molecule/app-ui-solid

## 1.6.0

### Minor Changes

- Add mouse and pen hover and Ctrl-wheel zoom bindings for DOM elements.
- Expose React-compatible JSX style maps and inline style text.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-pointer-events-dom@1.1.0
  - @molecule/app-inline-style-dom@1.1.0

## 1.5.0

### Minor Changes

- Share pointer drag ownership across the web UI kits.

### Patch Changes

- Lays out Input, Select and Textarea wrappers as flex columns so a control's margin is the same on every renderer.
- Coordinate Escape, focus and body scroll with the other web UI kits' dialogs, drawers and menus, keep Dropdowns in the trigger's document, and render open dialogs inline during server rendering. Requires `@molecule/app-ui` 1.9.0.

## 1.4.2

### Patch Changes

- A form submits the last value of a repeated field name and keeps a `__proto__` field as an ordinary key; a prompt dialog lets the user retry when its submit handler throws.
- A growing text area counts its rows in the field's exact line height.

## 1.4.1

### Patch Changes

- ThemeToggle, LanguagePicker and LoadErrorBanner take `testId` and `automationId`, and SidebarUserCard takes `testId`, as in React.
- PageHeader breadcrumb links navigate through the app's router instead of reloading the page.
- `renderIcon` draws an icon set's prebuilt markup glyphs.

## 1.4.0

### Minor Changes

- Exports Solid-typed props under the core names, with node props typed `JSX.Element`, and a node prop that renders nothing leaves out the element around it, as in React.

## 1.3.2

### Patch Changes

- Add `rendersNode(node)`: whether a resolved node renders anything, by the rule React's `slot(node)` uses.
- ConfirmDialog and PromptDialog point the dialog at their heading only while the title renders something, and PromptDialog's input label follows a projected title as it changes.

## 1.3.1

### Patch Changes

- Portal content (Modal, Dropdown menu, Tooltip, ToastContainer and the app-shell overlays) now renders through `BodyPortal`, so a `<Show>`, `<For>` or text child no longer throws and each portal unmounts with its owner.
- Dropdown and FormField follow a trigger or children that change after mount, including ones rendered through `<For>` or `<Show>`, and FormField points its label at the field id again once it no longer holds a single control.

## 1.3.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.2.1

### Patch Changes

- `Grid` sets only the gap and template properties it is given, so an unset one no longer erases the same property from the caller's `style`.

## 1.2.0

### Minor Changes

- Export `ReactFormProps`, the name `@molecule/app-ui-react` gives the `Form` props.
- Matches `@molecule/app-ui-react`: a component's ref receives its main element, components forward every prop their types declare (`automationId` as `data-mol-id`, `id`, `title`, `aria-*` and DOM event handlers), Tabs, Accordion, Dropdown and Card honor `disabled`, and handlers are typed with the kit event types from `@molecule/app-ui`.

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

- An open `Dropdown` no longer pulls focus back to its menu on a re-render after focus has left it, matching `@molecule/app-ui-react`.
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

- 7857fd8: Dependencies updated: both bindings are now tested against solid-js 1.9.17, which resolves the patched seroval 1.6.x.

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
