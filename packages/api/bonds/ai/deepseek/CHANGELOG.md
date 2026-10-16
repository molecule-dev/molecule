# @molecule/api-ai-deepseek

## 1.0.8

### Patch Changes

- 8b56035: Clarify the documentation of the stream stall bound.

## 1.0.7

### Patch Changes

- 84217b4: A stream that opens and then produces no content is now bounded: `chat()` waits at most 45 s for the first content event, asks once more with a fresh stream, and after the reply has started bounds the silence between chunks at 60 s instead of leaving both to the caller (`onStreamStall` reports each one).

## 1.0.6

### Patch Changes

- Tool-result messages keep their non-tool content parts instead of dropping them.

## 1.0.5

### Patch Changes

- A user message mixing `tool_result` blocks with other content parts (an image riding a tool result — the screenshot tool's capture) no longer loses the non-tool parts on the Chat Completions path: they are emitted as a user message after the tool messages, matching what the Responses, Anthropic and Gemini transports already did. Previously any such part was silently dropped.

## 1.0.4

### Patch Changes

- b1a0cdc: Relax a forced `toolChoice` to the model's own choice when thinking is enabled. DeepSeek rejects the combination with `400 Thinking mode does not support this tool_choice`, which fails the whole request; the thinking setting is kept and the tool nudge is degraded instead.

## 1.0.2

### Patch Changes

- The provider's fallback `defaultModel` follows the go-forward `deepseek-flash` id (was the retired `deepseek-v4-flash`).

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
