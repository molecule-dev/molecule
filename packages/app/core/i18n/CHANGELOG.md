# @molecule/app-i18n

## 1.3.0

### Minor Changes

- Read rich catalog translations with portable tags and literal text interpolation.

## 1.2.2

### Patch Changes

- Examples translate through the framework binding's `useTranslation()`, so a component re-renders when the locale changes.

## 1.2.1

### Patch Changes

- An explicit empty `defaultValue` is returned for a missing key instead of the key itself, as in i18next.
- The simple i18n provider logs through whichever logger is bonded at the time of each call, so a logger bonded after its first log receives the later calls.

## 1.2.0

### Minor Changes

- A plural key's default can carry each English form (`defaultValue_one` beside `defaultValue`, as in i18next), and an `I18nError`'s message fills its placeholders from its values.

## 1.1.2

### Patch Changes

- Creating a provider no longer bonds a default logger before the provider has anything to log.

## 1.1.1

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.0

### Minor Changes

- Add an optional provider revision that lets `useT` and `useTranslation` observe translation changes announced before their listener exists, including from a child's layout effect or while a hidden `<Activity>` tree has its effects unmounted.

### Patch Changes

- `createSimpleI18nProvider`'s `addTranslations()` notifies `onLocaleChange` subscribers when it changes text for the active locale or for English (the fallback), and stays quiet when nothing changed.

## 1.0.3

### Patch Changes

- 1024442: The simple provider fills a single-brace placeholder when that key was passed.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-logger@1.0.1
