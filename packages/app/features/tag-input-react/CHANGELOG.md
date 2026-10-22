# @molecule/app-tag-input-react

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
