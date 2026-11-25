# @molecule/app-auth-modal-vue

## 1.1.2

### Patch Changes

- Opening the dialog focuses the email field instead of the close button, through Modal `initialFocus` (requires the `@molecule/app-ui-vue` release that adds it).

## 1.1.1

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-auth-modal-react`: the same exports and props, rendering the same DOM.
