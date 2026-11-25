# @molecule/app-tag-input-svelte

## 1.2.0

### Minor Changes

- Keeps the draft when the input method confirms Enter with legacy key code 229, adds a `fieldProps` text-field binding to `useTagInput`, and takes the chip's remove glyph from the `tagChip.removeGlyph` translation.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- Let saved tag lists carry the page’s accessible label and native list attributes, as the React package does.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-tag-input-react`: the same exports and props, rendering the same DOM.
