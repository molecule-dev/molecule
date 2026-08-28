# @molecule/api-ai-moonshot

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
