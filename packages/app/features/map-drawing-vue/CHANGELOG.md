# @molecule/app-map-drawing-vue

## 1.2.0

### Minor Changes

- Keeps drawing when the pointer leaves the surface, finishes a circle or selection at the release position and discards a drag the browser interrupts. Requires `@molecule/app-ui-vue` 1.4 or later.

## 1.1.1

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-map-drawing-react`: the same exports and props, rendering the same DOM.
