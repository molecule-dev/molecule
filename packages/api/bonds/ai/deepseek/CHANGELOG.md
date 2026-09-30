# @molecule/api-ai-deepseek

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
