# @molecule/app-bulk-action-toolbar-svelte

## 1.1.3

### Patch Changes

- Use the shared React-compatible inline style helper.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The toolbar's accessible name is looked up through the `bulkActions.aria.toolbar` translation key instead of a fixed English string, so it follows the active language. The locale bond adds that key in every language.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-bulk-action-toolbar-react`: the same exports and props, rendering the same DOM.
