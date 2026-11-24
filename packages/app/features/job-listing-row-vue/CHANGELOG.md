# @molecule/app-job-listing-row-vue

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.1.1

### Patch Changes

- `onClick` makes the whole row an accessible native button over the content, labelled by the row's title, so it can be activated with Enter or Space. Action and tag controls keep their own clicks.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-job-listing-row-react`: the same exports and props, rendering the same DOM.
