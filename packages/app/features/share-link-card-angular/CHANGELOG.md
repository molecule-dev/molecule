# @molecule/app-share-link-card-angular

## 1.2.0

### Minor Changes

- Copy through `@molecule/app-clipboard`, now a peer dependency, so copying the link works where the Clipboard API is missing or refuses, and Copied shows only after a successful copy.

### Patch Changes

- Name the link field and the password switch for assistive technology, the field through the translated `shareLinkCard.aria.url` label.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-share-link-card-react`: the same exports and props, rendering the same DOM.
