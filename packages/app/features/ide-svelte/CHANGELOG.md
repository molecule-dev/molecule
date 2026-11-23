# @molecule/app-ide-svelte

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
