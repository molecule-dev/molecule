# @molecule/app-ide-svelte

## 2.0.4

### Patch Changes

- Bug reports, sharing, quick pickers, the keyboard shortcuts reference and the chat panel overlay open as kit modals: Escape closes only the top one, focus stays inside and returns to the opener, and the page behind stops scrolling. Requires `@molecule/app-ai-models` 1.2.0, `@molecule/app-i18n` 1.2.0 and `@molecule/app-ui` 1.10.0 or later.
- Requires `@molecule/app-ai-models` 1.4.0 or later, which `@molecule/app-ide-panel-logic` needs.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.2

## 2.0.3

### Patch Changes

- Use the shared React-compatible inline style helper.

## 2.0.2

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.

## 2.0.1

### Patch Changes

- A work tray's chips keep the strips' order as strips come and go, and a strip's detail, actions and hint render only while they have something to show.
- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 2.0.0

### Major Changes

- `WorkspaceLayout` now takes the panes as data in `items` and renders one entry through its `children` snippet, so a pane that appears later is wrapped and gets its divider.

### Patch Changes

- The dock strip, the file-explorer context menu and the context-usage view now render their portaled content through `BodyPortal`, so it unmounts with its owner instead of moving nodes or removing the UI kit's portals by hand.

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
