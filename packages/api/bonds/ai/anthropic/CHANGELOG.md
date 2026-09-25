# @molecule/api-ai-anthropic

## 1.3.0

### Minor Changes

- 1412226: Add `TokenUsage.webSearchRequests`, the number of provider-run web searches billed per search on top of tokens; each AI bond reports the searches its provider ran.

## 1.2.0

### Minor Changes

- 8336956: The default model is now `claude-opus-5-5` (was `claude-opus-5`) when `defaultModel` is not set.

## 1.1.0

### Minor Changes

- d3fcd88: Add `ChatParams.extraBody` — extra provider-native request-body params (e.g. `reasoning_effort`, `enable_thinking`, `top_k`) shallow-merged into the outgoing request as a base, with the bond's structural fields (model, messages, tools, stream, token limit) always winning. The Gemini bond merges a nested `generationConfig` into its own rather than replacing it.

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
