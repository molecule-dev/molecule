# @molecule/app-i18n-default

## 1.3.0

### Minor Changes

- Add `@molecule/app-i18n-default/offered.js`, a setup that loads no locale bond itself, for apps that pass every bond's strings through `packageLocaleLoaders`.

## 1.2.0

### Minor Changes

- Start the i18n provider in the app's primary locale.

## 1.1.1

### Patch Changes

- Document the React Native (Metro) form of the locale table: one literal `import()` per language.

## 1.1.0

### Minor Changes

- Add `@molecule/app-i18n-default`: the default i18n setup (`setupI18nDefault`) for every app framework, as in `@molecule/app-i18n-default-react`.
