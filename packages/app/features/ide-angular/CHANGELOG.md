# @molecule/app-ide-angular

## 1.1.5

### Patch Changes

- Bug reports, sharing, quick pickers, the keyboard shortcuts reference and the chat panel overlay open as kit modals: Escape closes only the top one, focus stays inside and returns to the opener, and the page behind stops scrolling. Requires `@molecule/app-ai-models` 1.2.0, `@molecule/app-i18n` 1.2.0, `@molecule/app-ui` 1.10.0 and `@molecule/app-ui-angular` 1.7.0 or later.
- Requires `@molecule/app-ai-models` 1.4.0 or later, which `@molecule/app-ide-panel-logic` needs.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.2

## 1.1.4

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.3

### Patch Changes

- `WorkspaceLayout` follows the panes a consumer adds, removes or reorders after the first render.
- A work tray's chips keep the strips' order as strips come and go, and a strip's detail, actions and hint render only while they have something to show.

## 1.1.2

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.1.1

### Patch Changes

- The preview panel ignores the iframe's initial about:blank `load`, so a preview that never loads gets the same retry as in React; quick-picker rows, skill names, author names and activity-card borders render with React's background, weight and hover border.
- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.1

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-ide-react`: the same exports and props, rendering the same DOM.

### Patch Changes

- Updated dependencies
  - @molecule/app-ide-panel-logic@1.4.0
