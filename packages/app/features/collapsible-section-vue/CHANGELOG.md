# @molecule/app-collapsible-section-vue

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- `ShowMore` and `CollapsibleSection` count slot content the way React counts children, so a `v-for` list is sliced per item and a false `v-if` adds nothing.

## 1.1.1

### Patch Changes

- The toggle button now wraps only the label, with `actions` beside it in the same header row. Anything passed to `actions` may therefore contain buttons and links, and a click there does not toggle the section.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-collapsible-section-react`: the same exports and props, rendering the same DOM.
