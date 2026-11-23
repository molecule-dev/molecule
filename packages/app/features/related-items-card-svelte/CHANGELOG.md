# @molecule/app-related-items-card-svelte

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- Clickable rows are now reachable and usable from the keyboard: each row stays a list item and its content sits in a focusable `role="button"` element that runs the row's handler on Enter or Space as it does on click.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-related-items-card-react`: the same exports and props, rendering the same DOM.
