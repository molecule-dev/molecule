---
'@molecule/api-ai-minimax': minor
'@molecule/api-ai-moonshot': minor
'@molecule/api-ai-alibaba': minor
'@molecule/api-ai-zhipu': minor
---

Honor `toolChoice` ('required' and named-tool forms) as OpenAI-compatible `tool_choice`. MiniMax and Moonshot family gates now key on the canonical model id (a `modelMap`-translated upstream id never matched, so re-hosted requests lost their thinking rules); MiniMax forwards image input for the natively-multimodal M3 and disables its thinking via `chat_template_kwargs` on hosts that ignore the `thinking` param; Alibaba pairs a forced tool choice with an explicit thinking-off (DashScope rejects forced `tool_choice` in thinking mode).
