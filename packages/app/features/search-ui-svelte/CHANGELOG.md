# @molecule/app-search-ui-svelte

## 1.3.1

### Patch Changes

- Focus the search field through the kit modal when quick search opens.

## 1.3.0

### Minor Changes

- Share the web UI kit’s hover gesture so mouse and pen entries activate and prefetch each result once.

## 1.2.0

### Minor Changes

- Keeps the active result in view when a new result list replaces it, makes a row active only when a mouse or pen hovers it, and cancels the Enter that confirms a legacy input method's composition.

## 1.1.3

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.2

### Patch Changes

- Closing the quick-search dialog now removes only its own portaled content, leaving other elements in `document.body` (a toast container, a widget, another component's portal) untouched.

## 1.1.1

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-search-ui-react`: the same exports and props, rendering the same DOM.
