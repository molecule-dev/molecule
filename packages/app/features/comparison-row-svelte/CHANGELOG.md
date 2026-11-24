# @molecule/app-comparison-row-svelte

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- Delta colours come from the theme's success, error and secondary tones instead of fixed hex values, and the delta chip is styled by a class rather than an inline style. `@molecule/app-ui` is now a `^1.4.0` peer in the Angular, Solid, Svelte and Vue ports.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-comparison-row-react`: the same exports and props, rendering the same DOM.
