# @molecule/api-ai-alibaba

## 1.1.0

### Minor Changes

- d989065: Honor `toolChoice` ('required' and named-tool forms) as OpenAI-compatible `tool_choice`. MiniMax and Moonshot family gates now key on the canonical model id (a `modelMap`-translated upstream id never matched, so re-hosted requests lost their thinking rules); MiniMax forwards image input for the natively-multimodal M3 and disables its thinking via `chat_template_kwargs` on hosts that ignore the `thinking` param; Alibaba pairs a forced tool choice with an explicit thinking-off (DashScope rejects forced `tool_choice` in thinking mode).

## 1.0.2

### Patch Changes

- cda70ae: Model definitions accept `supersededBy`, naming the newer-generation model that replaces an older one. Superseded models are excluded from `MODEL_IDS`, `getAvailableModels()`, `GET /ai/models` and the client picker helpers — so only the newest generation of a family is offered — while `getModel()` still returns them so saved selections and past usage stay priceable. New helpers: `isSelectableModel()` and `resolveSelectableModelId()` (server), `isSelectableModel()` (client). The Alibaba AI bond now defaults to `qwen3.8-max`.

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
