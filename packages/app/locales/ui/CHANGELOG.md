# @molecule/app-locales-ui

## 1.2.0

### Minor Changes

- Translate drag-and-drop move controls and position labels in all supported locales.

## 1.1.5

### Patch Changes

- The published package no longer includes its compiled tests.

## 1.1.4

### Patch Changes

- Add the SidebarUserCard drawer label translations in every language.

## 1.1.3

### Patch Changes

- PageHeader's breadcrumb navigation label is translated (`ui.pageHeader.breadcrumbs`) and follows a locale switch.

## 1.1.2

### Patch Changes

- `@molecule/app-ui-svelte` ships real Svelte components with the same names, props, markup and behavior as `@molecule/app-ui-react`, each with generated type declarations; the page shell's sidebar toggle label is translated.

## 1.1.1

### Patch Changes

- Translate every key into every supported language, keeping the spacing around interpolated values and the code names they mention.

## 1.1.0

### Minor Changes

- Adds translations for the shared UI components' labels: app shell menu, confirm button, prompt and confirm dialogs, load-error retry, form submit error, select, toast, icons and user menu.

### Patch Changes

- Adds the missing-UIClassMap error message.

## 1.0.3

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
