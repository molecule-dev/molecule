# @molecule/app-drag-drop

## 1.2.1

### Patch Changes

- Use shared host types for drag and drop so React and React Native can build against the same bindings.

## 1.2.0

### Minor Changes

- Add scoped drag bindings for existing React hosts and report how each drag ended.

## 1.1.0

### Minor Changes

- Add a scoped React drag-and-drop renderer contract for shared web and native features.

## 1.0.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
