# @molecule/app-inline-edit-solid

## 1.1.3

### Patch Changes

- Event handler parameters are typed with the kit event types from `@molecule/app-ui`, so they accept the event every UI kit passes.

## 1.1.2

### Patch Changes

- `InlineEdit` keeps a typed draft when the parent passes the same `value` again, and resets it only when `value` changes.

## 1.1.1

### Patch Changes

- The editor field's fallback accessible label is now looked up through i18n, so it follows the app's locale instead of staying in English. The locale bond adds the `inlineEdit.aria.edit` key in every language.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-inline-edit-react`: the same exports and props, rendering the same DOM.
