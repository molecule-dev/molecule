# @molecule/app-search-ui-angular

## 1.3.0

### Minor Changes

- Keeps the active result in view when a new result list replaces it, makes a row active only when a mouse or pen hovers it, and cancels the Enter that confirms a legacy input method's composition.

## 1.2.1

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.2.0

### Minor Changes

- A custom `renderLink` gets the row body's context as `childrenContext`, so it can render the row; the row body template is now available on the first render.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-search-ui-react`: the same exports and props, rendering the same DOM.
