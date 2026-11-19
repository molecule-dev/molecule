# @molecule/app-rating-display-vue

## 1.1.1

### Patch Changes

- Accessible labels are translated through `useTranslation()` and follow a locale switch: the rating label and, in interactive mode, each star's "Rate N of M" button label. The stars now sit in a labelled group, so the rate buttons keep their pressed state for assistive technology instead of being hidden under an image role.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-rating-display-react`: the same exports and props, rendering the same DOM.
