# @molecule/api-ai-anthropic

## 1.3.3

### Patch Changes

- 2b44616: A request aborted during a rate-limit backoff, and a non-streaming success body that is not JSON, now yield the sanitized error event instead of throwing a raw TypeError or SyntaxError out of the stream.
- 79c9b9c: The retry backoff now removes its abort listener when the wait completes, so a caller signal reused across turns no longer accumulates a listener per rate-limited retry.
- 123aa90: A streaming response body that dies mid-stream (connection reset, proxy cut, or the default timeout firing) now yields the sanitized error event instead of throwing a raw TypeError or TimeoutError out of the stream. A caller's own abort still propagates as before.
- 86fec8e: Rate-limited and overloaded responses are now released before a retry, so sustained 429/529 handling no longer holds connections open until garbage collection.
- 5c64d8f: API errors now say when the provider's credit balance is too low instead of reporting the request as invalid.

## 1.3.2

### Patch Changes

- Tool-call ids the Messages API rejects are mapped to valid stable ids.

## 1.3.1

### Patch Changes

- Tool-call ids outside the Messages API pattern (`^[a-zA-Z0-9_-]+$`) are mapped to a valid, stable id instead of failing the request with a 400.

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
