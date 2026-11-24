# @molecule/app-leaderboard-row-svelte

## 1.1.4

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.3

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.2

### Patch Changes

- A row with `onClick` is now a focusable button in the accessibility tree, and Enter or Space activate it. The rank-delta arrow and the current-user highlight take their colours from the theme's success, error and info tones instead of fixed hex values.

## 1.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-leaderboard-row-react`: the same exports and props, rendering the same DOM.
