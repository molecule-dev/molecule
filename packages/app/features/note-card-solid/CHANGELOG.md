# @molecule/app-note-card-solid

## 1.1.2

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.

## 1.1.1

### Patch Changes

- The yellow, green, blue, red and amber note colours now render as the theme's light tint of the matching tone, so the card and its text follow the app theme; any other colour is applied as given. With `onClick` set, a transparent native button covers the card and is named by the title or body, and the pinned label is translated.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-note-card-react`: the same exports and props, rendering the same DOM.
