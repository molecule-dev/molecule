# @molecule/app-ticker-row-svelte

## 1.1.4

### Patch Changes

- Use the shared React-compatible inline style helper.

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The percentage change is formatted in the active locale and colored with the theme's success and error tones instead of fixed hex colors. With `onClick` the whole row is a native button named by the symbol, so it works from the keyboard, and the Vue, Solid, Svelte and Angular ports match it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-ticker-row-react`: the same exports and props, rendering the same DOM.
