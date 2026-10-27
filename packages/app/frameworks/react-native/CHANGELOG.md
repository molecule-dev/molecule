# @molecule/app-react-native

## 3.0.0

### Major Changes

- Accept an ordinary `interface` as a form's values type: every form entrypoint now constrains it to the exported `FormValuesConstraint<T>` instead of `Record<string, unknown>`, while primitives, arrays, functions and `Date` stay rejected. Generic forwarders that name `Record<string, unknown>` or `object` must copy that constraint.

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.1

### Patch Changes

- 2a74d83: Preserve generic type parameters and explicit types in API documentation.

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

## 1.0.3

### Patch Changes

- 8c20e8d: Clarify custom response envelope handling and account registration examples.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-keyboard@1.0.1
  - @molecule/app-lifecycle@1.0.1
  - @molecule/app-react@1.0.1
