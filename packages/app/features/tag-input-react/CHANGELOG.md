# @molecule/app-tag-input-react

## 4.1.1

### Patch Changes

- Let saved tag lists carry the page’s accessible label and native list attributes.

## 4.1.0

### Minor Changes

- Display saved tags in a read-only list with optional app-owned presentation.

## 4.0.1

### Patch Changes

- Every clickable surface is reachable and operable from the keyboard and named for screen readers, using native buttons and radios where they fit.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.1.1

### Patch Changes

- Preserve tag changes and draft commits within a React batch.

## 3.1.0

### Minor Changes

- Add `useTagInput`, the tag-entry behavior without markup, so apps can keep their own input and tag markup.

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-ui-react@2.0.0

## 1.0.3

### Patch Changes

- 97dca1c: Preserve composing text until the input method confirms it.
- f02651e: Keep Enter in the tag field from submitting an enclosing form when the draft is blank, whitespace-only, rejected, or past `maxTags`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
