# @molecule/app-search-ui-svelte

## 1.1.2

### Patch Changes

- Closing the quick-search dialog now removes only its own portaled content, leaving other elements in `document.body` (a toast container, a widget, another component's portal) untouched.

## 1.1.1

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-search-ui-react`: the same exports and props, rendering the same DOM.
