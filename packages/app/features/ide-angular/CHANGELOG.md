# @molecule/app-ide-angular

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
