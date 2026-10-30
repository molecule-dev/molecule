# @molecule/app-forms

## 2.1.0

### Minor Changes

- Default validation messages now go through the bonded i18n provider, so they show in the active locale.

### Patch Changes

- An empty or blank rule message, an empty, blank or non-string translation, or a custom validator's empty string no longer turns validation off.

## 2.0.0

### Major Changes

- Accept an ordinary `interface` as a form's values type: every form entrypoint now constrains it to the exported `FormValuesConstraint<T>` instead of `Record<string, unknown>`, while primitives, arrays, functions and `Date` stay rejected. Generic forwarders that name `Record<string, unknown>` or `object` must copy that constraint.

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- c78c76f: Make `reset(values)` establish the resulting values as the new clean baseline, so a form reset to freshly loaded or saved data reads clean.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
