# @molecule/app-listing-card-svelte

## 1.2.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.2.1

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.2.0

### Minor Changes

- Add the `toggle` prop: a counted, server-backed toggle after the card's content, as `@molecule/app-listing-card-react` renders it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-listing-card-react`: the same exports and props, rendering the same DOM.
