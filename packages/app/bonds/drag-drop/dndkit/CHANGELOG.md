# @molecule/app-drag-drop-dndkit

## 2.0.0

### Major Changes

- The React `SortableList` moved to `@molecule/app-drag-drop-dndkit-react`, with matching lists in `-vue`, `-solid`, `-svelte` and `-angular`. This package is now framework-free: the provider plus the sensors, axis, drop and translated screen-reader text every list shares, on dnd-kit 0.5. It no longer depends on React.

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
  - @molecule/app-drag-drop@1.0.1
