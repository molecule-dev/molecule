# @molecule/app-share-link-card-vue

## 1.2.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.2.2

### Patch Changes

- The docs name packages that exist, and the link-preview and oEmbed cache examples convert their millisecond TTL for `@molecule/api-cache`.

## 1.2.1

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.2.0

### Minor Changes

- Copy through `@molecule/app-clipboard`, now a peer dependency, so copying the link works where the Clipboard API is missing or refuses, and Copied shows only after a successful copy.

### Patch Changes

- Name the link field and the password switch for assistive technology, the field through the translated `shareLinkCard.aria.url` label.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-share-link-card-react`: the same exports and props, rendering the same DOM.
