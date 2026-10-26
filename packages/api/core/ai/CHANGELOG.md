# @molecule/api-ai

## 1.4.0

### Minor Changes

- Add provider-specific image token estimates with documented DeepSeek vision support.

## 1.3.6

### Patch Changes

- Clarify public API usage and configuration.

## 1.3.4

### Patch Changes

- 5242cf8: Requests can carry `stop` sequences. `ChatParams.stop` declares the sequences a provider must stop generating at (OpenAI-compatible `stop`), and the DeepSeek bond sends them, capped at the 16 its API takes. The matched text is dropped from the reply, so a caller can end a reply it would discard at the cost of the tokens written before the match instead of the whole answer.

## 1.3.3

### Patch Changes

- 65d90c5: Each call carries a per-request id and reports the response's own id, trace id and served model back on `done`, so a reply that does not belong to the request that asked for it can be identified and traced.

## 1.3.2

### Patch Changes

- 8b56035: Clarify the documentation of the stream stall bound.

## 1.3.1

### Patch Changes

- 84217b4: A stream that opens and then produces no content is now bounded: `chat()` waits at most 45 s for the first content event, asks once more with a fresh stream, and after the reply has started bounds the silence between chunks at 60 s instead of leaving both to the caller (`onStreamStall` reports each one).

## 1.3.0

### Minor Changes

- 1412226: Add `TokenUsage.webSearchRequests`, the number of provider-run web searches billed per search on top of tokens; each AI bond reports the searches its provider ran.

## 1.2.0

### Minor Changes

- d5289ec: Tool-use blocks and events carry an optional provider-opaque `signature` replay token. The Google bond captures Gemini 3.x's part-level `thoughtSignature` on function calls and echoes it on replayed calls — without it, Gemini rejects the second request of any tool round-trip (400 "Function call is missing a thought_signature"). The Google bond also sends `thinking.effort` as `thinkingLevel` (previously the effort value was silently ignored and a fixed token budget was sent), and forwards the `google_search` server tool with `includeServerSideToolInvocations` when function tools ride along.

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
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
