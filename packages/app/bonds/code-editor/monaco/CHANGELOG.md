# @molecule/app-code-editor-monaco

## 1.0.7

### Patch Changes

- Declares `@molecule/app-logger` as a required peer, since the provider loads it on start-up.
- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 1.0.6

### Patch Changes

- Declare the peers this package loads on start-up as required instead of optional.

## 1.0.5

### Patch Changes

- The README lists every member of long type declarations and keeps long descriptions whole.

## 1.0.3

### Patch Changes

- 30b2c09: Documents over 250,000 characters are no longer sent to the language server, so one large open file can no longer push the language-server connection into a reconnect loop.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-code-editor@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
