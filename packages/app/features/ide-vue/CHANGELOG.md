# @molecule/app-ide-vue

## 1.1.4

### Patch Changes

- Uses the dedicated feature imports from the framework binding.

## 1.1.3

### Patch Changes

- Bug reports, sharing, quick pickers, the keyboard shortcuts reference and the chat panel overlay open as kit modals: Escape closes only the top one, focus stays inside and returns to the opener, and the page behind stops scrolling. Requires `@molecule/app-ai-models` 1.2.0, `@molecule/app-vue` 3.15.0, `@molecule/app-ui` 1.10.0 and `@molecule/app-ui-vue` 1.5.0 or later.
- Requires `@molecule/app-ai-models` 1.4.0 and `@molecule/app-i18n` 1.2.0 or later, which `@molecule/app-ide-panel-logic` needs.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.2

## 1.1.2

### Patch Changes

- A work tray's chips keep the strips' order as strips come and go, and a strip's detail, actions and hint render only while they have something to show.

## 1.1.1

### Patch Changes

- `ActivityCard` deepens its whole border on hover, as in React.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.1

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-ide-react`: the same exports and props, rendering the same DOM.

### Patch Changes

- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.0
