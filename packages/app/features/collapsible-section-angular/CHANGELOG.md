# @molecule/app-collapsible-section-angular

## 1.1.4

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.1.3

### Patch Changes

- ShowMore keeps a list in order when an item is inserted before its hidden items, and renders its slots through the shared DOM placement helpers.

## 1.1.2

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 1.1.1

### Patch Changes

- The toggle button now wraps only the label, with `actions` beside it in the same header row. Anything passed to `actions` may therefore contain buttons and links, and a click there does not toggle the section.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-collapsible-section-react`: the same exports and props, rendering the same DOM.
