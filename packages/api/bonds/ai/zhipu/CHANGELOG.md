# @molecule/api-ai-zhipu

## 1.0.2

### Patch Changes

- 23dcd7f: Default model is now `glm-5.3` (was `glm-5.2`). Documents that glm-5.3 narrows `reasoning_effort` to low | high | max and can no longer disable reasoning; the budget-tokens fallback keeps returning the `'high'`/`'low'` both generations accept.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai@1.0.1
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-secrets@1.0.1
