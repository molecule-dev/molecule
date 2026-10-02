# @molecule/api-ai-local

## 1.0.5

### Patch Changes

- Tool-result messages keep their non-tool content parts instead of dropping them.

## 1.0.4

### Patch Changes

- A user message mixing `tool_result` blocks with other content parts (an image riding a tool result — the screenshot tool's capture) no longer loses the non-tool parts on the Chat Completions path: they are emitted as a user message after the tool messages, matching what the Responses, Anthropic and Gemini transports already did. Previously any such part was silently dropped.

## 1.0.2

### Patch Changes

- 596361b: Serialize `tool_use` and `tool_result` message blocks as native `tool_calls` and `role:"tool"` messages instead of flattening them to placeholder text. Multi-turn agentic tool loops now receive real tool results, so models that previously looped on their first tool call and never finished can complete a tool-driven conversation.

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
