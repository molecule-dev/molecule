# @molecule/app-avatar-stack-angular

## 1.2.2

### Patch Changes

- Slot content a consumer adds after the first render now shows with its wrapper (FileCard actions, StatusBadge icon, ListingCardBody rows, ListingCardMedia children and overlay, NowPlayingBar trailing, QuizCard progress and explanation, UserChip subtitle), ListingCardMedia sets no image source while children replace the image, and `hasNodes` is deprecated.

## 1.2.1

### Patch Changes

- `UserChip` writes its name link's props with `ElementPropsWriter` from `@molecule/app-ui-angular`.

## 1.2.0

### Minor Changes

- Add profile name links, link attributes and root attribute forwarding to UserChip.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-avatar-stack-react`: the same exports and props, rendering the same DOM.
