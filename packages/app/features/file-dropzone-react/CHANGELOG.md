# @molecule/app-file-dropzone-react

## 5.1.0

### Minor Changes

- Show the file picker action in the React Native file dropzone and image gallery.

## 5.0.0

### Major Changes

- Return portable `PickedFile` batches for files selected or rejected by `FileDropzone`.

## 4.0.3

### Patch Changes

- A `maxSize` of 0 now rejects any nonempty file, a click opens the chooser once, the same file can be chosen again, and `accept` matches MIME types in any case. Requires `@molecule/app-filesystem` 1.1.0 or later.

## 4.0.2

### Patch Changes

- A node prop that renders nothing, such as an empty list, `false` or `''`, renders the same as leaving the prop out.

## 4.0.1

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

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

- 04d3f3b: Every labelled button renders through `cm.button()`; none is hand-styled. Visual parity with the design system, no API change.

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
