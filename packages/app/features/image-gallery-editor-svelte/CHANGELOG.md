# @molecule/app-image-gallery-editor-svelte

## 2.0.0

### Major Changes

- The gallery passes `readonly PickedFile[]` to `onPickFiles` and automatically releases its local previews.

## 1.1.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.1

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-image-gallery-editor-react`: the same exports and props, rendering the same DOM.
