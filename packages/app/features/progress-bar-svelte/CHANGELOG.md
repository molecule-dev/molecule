# @molecule/app-progress-bar-svelte

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The progress track always has an accessible name: its rendered label, an element id passed as `labelledBy`, or a translatable default, with `describedBy` adding a description. `ProgressCard` names the bar by its title and describes it by its description.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-progress-bar-react`: the same exports and props, rendering the same DOM.
