# @molecule/app-social-share-buttons-angular

## 1.2.0

### Minor Changes

- Copy the link through `@molecule/app-clipboard`, now a peer dependency, so copying works where the Clipboard API is missing or refuses, and the copied state shows only after a successful copy.

### Patch Changes

- Name each share button by its platform (Twitter, LinkedIn, Email, Copy, …), translated through one literal `share.<platform>` key per platform.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-social-share-buttons-react`: the same exports and props, rendering the same DOM.
