# @molecule/app-listing-card-angular

## 1.2.2

### Patch Changes

- Slot content a consumer adds after the first render now shows with its wrapper (FileCard actions, StatusBadge icon, ListingCardBody rows, ListingCardMedia children and overlay, NowPlayingBar trailing, QuizCard progress and explanation, UserChip subtitle), ListingCardMedia sets no image source while children replace the image, and `hasNodes` is deprecated.

## 1.2.1

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 1.2.0

### Minor Changes

- Add the `toggle` prop: a counted, server-backed toggle after the card's content, as `@molecule/app-listing-card-react` renders it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-listing-card-react`: the same exports and props, rendering the same DOM.
