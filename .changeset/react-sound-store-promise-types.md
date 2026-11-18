---
'@molecule/app-react': minor
---

`useStore` without a selector returns the store's own state type (a second type argument now requires a `selector`, typed by the new `SelectingStoreOptions`), and `usePromise` takes its result and parameter types from the wrapped function (`usePromise<T, A>`). `useTheme` reads a provider's optional `onThemeChange`/`getThemeName` through type guards.
