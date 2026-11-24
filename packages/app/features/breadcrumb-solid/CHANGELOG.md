# @molecule/app-breadcrumb-solid

## 1.1.3

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.

## 1.1.2

### Patch Changes

- A separator given as a list renders every node in each gap, and an empty list leaves the gap empty instead of showing the default `/`.

## 1.1.1

### Patch Changes

- The navigation landmark's accessible name is now looked up in the app's translation function with `Breadcrumb` as the English default, so it follows the active locale.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-breadcrumb-react`: the same exports and props, rendering the same DOM.
