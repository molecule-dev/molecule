# @molecule/api-ai-agents-llm

## 1.1.0

### Minor Changes

- Add opt-in `maxToolResultChars` and `finalSynthesisOnBudgetExhaustion` run options for bounded tool results and a final tool-free answer turn.

## 1.0.4

### Patch Changes

- Preserve thinking settings and assistant reasoning across agent tool calls.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai@1.0.1
  - @molecule/api-ai-agents@1.0.1
  - @molecule/api-i18n@1.0.1
