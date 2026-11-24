# @molecule/app-progress-bar-solid

## 1.1.2

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.1

### Patch Changes

- The progress track always has an accessible name: its rendered label, an element id passed as `labelledBy`, or a translatable default, with `describedBy` adding a description. `ProgressCard` names the bar by its title and describes it by its description.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-progress-bar-react`: the same exports and props, rendering the same DOM.
