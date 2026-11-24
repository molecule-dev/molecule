# @molecule/app-log-viewer-svelte

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- Severity badge colours come from the theme's success, warning and error tones with on-tone text instead of fixed hex values. This requires `@molecule/app-ui` 1.4 or later.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-log-viewer-react`: the same exports and props, rendering the same DOM.
