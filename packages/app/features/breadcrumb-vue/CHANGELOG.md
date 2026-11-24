# @molecule/app-breadcrumb-vue

## 1.1.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.1

### Patch Changes

- The navigation landmark's accessible name is now looked up in the app's translation function with `Breadcrumb` as the English default, so it follows the active locale.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-breadcrumb-react`: the same exports and props, rendering the same DOM.
