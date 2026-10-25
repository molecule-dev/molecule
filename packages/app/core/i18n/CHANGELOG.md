# @molecule/app-i18n

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
