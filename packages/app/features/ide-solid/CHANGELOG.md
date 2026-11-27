# @molecule/app-ide-solid

## 1.1.6

### Patch Changes

- Uses the dedicated feature imports from the framework binding.

## 1.1.5

### Patch Changes

- The context usage card turns its padding into a style through the kit's shared `toStyleProps`, as the other renderers do.
- Bug reports, sharing, quick pickers, the keyboard shortcuts reference and the chat panel overlay open as kit modals: Escape closes only the top one, focus stays inside and returns to the opener, and the page behind stops scrolling. Requires `@molecule/app-ai-models` 1.2.0, `@molecule/app-solid` 3.17.0, `@molecule/app-ui` 1.10.0 and `@molecule/app-ui-solid` 1.6.0 or later.
- Requires `@molecule/app-ai-models` 1.4.0 and `@molecule/app-i18n` 1.2.0 or later, which `@molecule/app-ide-panel-logic` needs.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.2

## 1.1.4

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.3

### Patch Changes

- A work tray's chips keep the strips' order as strips come and go, and a strip's detail, actions and hint render only while they have something to show.

## 1.1.2

### Patch Changes

- The file-explorer context menu renders through `BodyPortal` and unmounts with its owner, and the dock strip's tray chip and detail portal into the tray elements without a wrapper element.

## 1.1.1

### Patch Changes

- `ActivityCard` deepens its whole border on hover and skill names keep their 500 weight, as in React.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.1

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-ide-react`: the same exports and props, rendering the same DOM.

### Patch Changes

- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.0
