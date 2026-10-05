# @molecule/api-ai-decisions-llm

## 1.2.1

### Patch Changes

- 35a90f0: Serialise an object `state` as compact JSON instead of indented JSON, so deeply nested input no longer grows the prompt by orders of magnitude.
- fc0bdf9: Omit the `temperature` parameter by default — several catalog models reject the parameter itself with a 400, which made every decide call fail against them. Pin sampling with the new optional `temperature` config only when the bonded model accepts it.

## 1.2.0

### Minor Changes

- `aiProvider` also accepts a provider instance, for callers that route each request to a different `ai` provider.

## 1.1.0

### Minor Changes

- Passes `decide()` `images` to the bonded `ai` provider as image content blocks, so vision chat models can answer questions about images.
- Updated dependencies
  - @molecule/api-ai-decisions@1.1.0
