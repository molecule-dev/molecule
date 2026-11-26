# @molecule/app-photo-lightbox-svelte

## 1.1.2

### Patch Changes

- The lightbox opens as a kit modal: Escape closes only the top dialog, arrow keys move between photos, and focus returns to the opener. Requires `@molecule/app-ui` 1.10.0 and `@molecule/app-ui-svelte` 1.6.0 or later.

## 1.1.1

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-photo-lightbox-react`: the same exports and props, rendering the same DOM.
