# @molecule/app-collapsible-section-solid

## 1.1.4

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.3

### Patch Changes

- `ShowMore` counts and slices the items it is given even when they are rendered through a `<For>`, so a growing or shrinking list keeps the right items and toggle label.

## 1.1.2

### Patch Changes

- Show `MoleculeProvider`'s flat props in the usage example.

## 1.1.1

### Patch Changes

- The toggle button now wraps only the label, with `actions` beside it in the same header row. Anything passed to `actions` may therefore contain buttons and links, and a click there does not toggle the section.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-collapsible-section-react`: the same exports and props, rendering the same DOM.
