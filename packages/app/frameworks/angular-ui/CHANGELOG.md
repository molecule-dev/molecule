# @molecule/app-ui-angular

## 1.3.1

### Patch Changes

- Modal, Dropdown, PromptDialog and ResponsiveAppShell move focus after Angular renders, the open drawer returns focus when it is destroyed, `Grid` no longer erases the caller's style properties, Table moves `id`, `title` and other rest attributes onto its `<table>`, and Alert, EmptyState, PageHeader, Toast and OptimisticToggleButton leave no `title` or `value` attribute on their host.

## 1.3.0

### Minor Changes

- Export the props types `@molecule/app-ui-react` exports (`ConfirmDialogProps`, `ResponsiveAppShellProps`, `ReactFormProps`, …); dialogs, banners and the shell render their node inputs given as data (`brand`, `actions`, `footer`, `loadingFallback`, …) as React does; add `ElementPropsWriter`, which writes React-spelled element props onto an element.
- A `data-mol-id` bound on a component's host reaches its element in the change detection that bound it, and follows a change (Modal, Tooltip, Input, Switch, Checkbox, Textarea, Table, Select); the component's own `automationId` still wins. Adds `adoptHostDataMolId` for components that render the id on an inner element.
- Matches `@molecule/app-ui-react`: a component's ref receives its main element, components forward every prop their types declare (`automationId` as `data-mol-id`, `id`, `title`, `aria-*` and DOM event handlers), Tabs, Accordion, Dropdown and Card honor `disabled`, and handlers are typed with the kit event types from `@molecule/app-ui`.

### Patch Changes

- Dropdown re-enables its trigger when `disabled` turns back to false.

## 1.2.1

### Patch Changes

- `Dropdown` no longer reports `openChange(false)` on mount, so a controlled menu mounted open stays open when its owner follows `openChange`.

## 1.2.0

### Minor Changes

- ConfirmDialog and PromptDialog are named by their title and described by their description, the SidebarUserCard drawer is named "Account", and Tabs sets `aria-controls` only on the tab whose panel is rendered. Modal now passes updated `aria-*` and `data-*` attributes to its dialog, and `reapplyRestAttributes` takes an `includeDescribedBy` option.

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.3

### Patch Changes

- Input, Select and Textarea move a re-bound rest attribute (an `aria-label` that follows the locale) onto their inner element instead of keeping the first value.
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

- Table keeps each row's DOM when rows keyed by `rowKey` are reordered, and uncontrolled Tabs keep their active tab when the tabs are reordered.
- UI components re-render their translated text on a locale switch, as `@molecule/app-ui-react` does; `@molecule/app-angular`'s `useTranslation().t` and `useT()` make the view that calls them follow a locale switch.

## 1.0.6

### Patch Changes

- The `@angular/*` peer ranges now accept every Angular 22 release, including the 22.2.3 these packages are tested with, and `createChangePasswordState` / `createPasswordResetState` accept the client `AUTH_CLIENT` provides.

## 1.0.5

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

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
