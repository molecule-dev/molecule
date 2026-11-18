# @molecule/app-list-item-row-angular

## 1.2.0

### Minor Changes

- Add the `toggle` prop: a row toggle renders as its own button beside the actions, as in `@molecule/app-list-item-row-react`.

## 1.1.1

### Patch Changes

- The row's open action sits on a transparent native button covering the whole row, named by the title, so keyboard and mouse users get the same action while the actions slot keeps its own clicks. `selected` now sets `aria-current="true"` instead of `aria-selected`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-list-item-row-react`: the same exports and props, rendering the same DOM.
