# @molecule/api-resource-ai-models

## 1.1.0

### Minor Changes

- cda70ae: Model definitions accept `supersededBy`, naming the newer-generation model that replaces an older one. Superseded models are excluded from `MODEL_IDS`, `getAvailableModels()`, `GET /ai/models` and the client picker helpers — so only the newest generation of a family is offered — while `getModel()` still returns them so saved selections and past usage stay priceable. New helpers: `isSelectableModel()` and `resolveSelectableModelId()` (server), `isSelectableModel()` (client). The Alibaba AI bond now defaults to `qwen3.8-max`.

### Patch Changes

- a8b91df: Kimi K3 is now available in the US processing region and defaults to it, priced at $2.85/$14.25 per MTok with cache reads at $0.285 — cheaper than the native host on every axis, with the full 1M context. Kimi K2.7 Code's US rates were re-verified and corrected to $0.68/$3.40 (cache reads $0.136). Every multi-region model's default region is now the cheapest one for real agentic traffic, enforced by a test.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-resource@1.0.1
