# @molecule/app-ticker-row-vue

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- The percentage change is formatted in the active locale and colored with the theme's success and error tones instead of fixed hex colors. With `onClick` the whole row is a native button named by the symbol, so it works from the keyboard, and the Vue, Solid, Svelte and Angular ports match it.

## 1.1.1

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-ticker-row-react`: the same exports and props, rendering the same DOM.
