# @molecule/app-price-range-slider-svelte

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The minimum and maximum handles' aria-labels now come from the `priceRangeSlider.aria.minimum` and `priceRangeSlider.aria.maximum` translation keys, so they follow the active locale.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-price-range-slider-react`: the same exports and props, rendering the same DOM.
