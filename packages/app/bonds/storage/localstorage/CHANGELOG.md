# @molecule/app-storage-localstorage

## 1.1.0

### Minor Changes

- Reads that lose to a newer write, remove, external change or provider swap are now discarded, and `refresh()` keeps the render-time snapshot coherent after a direct provider write. The localStorage bond accepts per-key codecs, so values an earlier raw-string helper persisted stay readable.
- Add a synchronous preference store (`getPreferenceStore()`) over the bonded storage provider, and synchronous read plus external-change subscription support in the localStorage provider.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-storage@1.0.1
