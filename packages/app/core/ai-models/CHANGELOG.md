# @molecule/app-ai-models

## 1.1.0

### Minor Changes

- cda70ae: Model definitions accept `supersededBy`, naming the newer-generation model that replaces an older one. Superseded models are excluded from `MODEL_IDS`, `getAvailableModels()`, `GET /ai/models` and the client picker helpers — so only the newest generation of a family is offered — while `getModel()` still returns them so saved selections and past usage stay priceable. New helpers: `isSelectableModel()` and `resolveSelectableModelId()` (server), `isSelectableModel()` (client). The Alibaba AI bond now defaults to `qwen3.8-max`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-http@1.0.1
