# @molecule/app-progress-bar-vue

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- The progress track always has an accessible name: its rendered label, an element id passed as `labelledBy`, or a translatable default, with `describedBy` adding a description. `ProgressCard` names the bar by its title and describes it by its description.

## 1.1.1

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-progress-bar-react`: the same exports and props, rendering the same DOM.
