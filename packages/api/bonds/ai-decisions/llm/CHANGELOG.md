# @molecule/api-ai-decisions-llm

## 1.2.0

### Minor Changes

- `aiProvider` also accepts a provider instance, for callers that route each request to a different `ai` provider.

## 1.1.0

### Minor Changes

- Passes `decide()` `images` to the bonded `ai` provider as image content blocks, so vision chat models can answer questions about images.
- Updated dependencies
  - @molecule/api-ai-decisions@1.1.0
