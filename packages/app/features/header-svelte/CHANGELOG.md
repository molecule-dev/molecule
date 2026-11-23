# @molecule/app-header-svelte

## 1.2.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.2.1

### Patch Changes

- Type the theme and i18n services from the binding's accessors, now that `@molecule/app-svelte` gives `ThemeProvider` and `I18nProvider` to its provider components.

## 1.2.0

### Minor Changes

- Add the `navigation` prop: a named navigation landmark with one router link per destination, taking the link props `@molecule/app-header-react` takes.

## 1.1.0

### Minor Changes

- Add `@molecule/app-header-vue`, `@molecule/app-header-solid`, `@molecule/app-header-svelte` and `@molecule/app-header-angular`: the app-shell header (branded logo and app name, slotted actions) for Vue, Solid, Svelte and Angular, matching `@molecule/app-header-react`.
