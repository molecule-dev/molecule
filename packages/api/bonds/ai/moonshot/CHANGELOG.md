# @molecule/api-ai-moonshot

## 1.1.3

### Patch Changes

- Tool-result messages keep their non-tool content parts instead of dropping them.

## 1.1.2

### Patch Changes

- A user message mixing `tool_result` blocks with other content parts (an image riding a tool result — the screenshot tool's capture) no longer loses the non-tool parts on the Chat Completions path: they are emitted as a user message after the tool messages, matching what the Responses, Anthropic and Gemini transports already did. Previously any such part was silently dropped.

## 1.1.0

### Minor Changes

- d989065: Honor `toolChoice` ('required' and named-tool forms) as OpenAI-compatible `tool_choice`. MiniMax and Moonshot family gates now key on the canonical model id (a `modelMap`-translated upstream id never matched, so re-hosted requests lost their thinking rules); MiniMax forwards image input for the natively-multimodal M3 and disables its thinking via `chat_template_kwargs` on hosts that ignore the `thinking` param; Alibaba pairs a forced tool choice with an explicit thinking-off (DashScope rejects forced `tool_choice` in thinking mode).

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
