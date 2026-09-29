/**
 * vLLM-Omni image-generation provider for `@molecule/api-ai-image-generation`.
 *
 * Generates and edits images on your own vLLM-Omni server through its
 * OpenAI-compatible Images API (`/v1/images/generations`, `/v1/images/edits`).
 * The default model is Qwen-Image-2.1 (text-to-image, multi-reference editing,
 * transparent output, 2K native); the same bond serves any other diffusion
 * model the server hosts — set `VLLM_OMNI_MODEL` or pass `model`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'
 * import { provider, transparentPrompt } from '@molecule/api-ai-image-generation-vllm-omni'
 *
 * // Reads VLLM_OMNI_BASE_URL (e.g. http://localhost:8091) on each call.
 * setProvider(provider)
 *
 * const { images } = await requireProvider().generate({
 *   prompt: transparentPrompt('A red sneaker, side view, studio lighting'),
 *   size: '2048x2048',
 * })
 * // images[0].base64 is PNG data — save it (uploads bond) before serving it.
 * ```
 *
 * @remarks
 * - **Qwen-Image-2.1 WEIGHTS ARE RESEARCH-ONLY.** They ship under the Qwen
 *   RESEARCH LICENSE AGREEMENT: "You shall not use the Materials for any
 *   commercial purpose without obtaining a separate commercial license" from
 *   Alibaba (model-business@notice.qwencloud.com). Research/evaluation use
 *   only — do NOT put it behind a production or paid feature, and do not offer
 *   it as a service, without that licence. vLLM-Omni itself is Apache-2.0; the
 *   licence follows the weights, whichever runtime serves them. Distributing
 *   the weights requires the Notice: "Qwen is licensed under the Qwen RESEARCH
 *   LICENSE AGREEMENT, Copyright (c) 2026 Hangzhou Tongyi Laboratory Technology
 *   Co., Ltd."
 * - **You run the server; it needs a GPU.** `vllm serve Qwen/Qwen-Image-2.1
 *   --omni --port 8091` (vLLM-Omni's own default port is 8000). A 7B DiT plus
 *   an 8B vision-language text encoder does not fit a molecule sandbox or the
 *   free tier. `VLLM_OMNI_BASE_URL` is required and has no default — a missing
 *   one throws the tagged `config.notConfigured` error. Give it WITHOUT `/v1`
 *   (a trailing `/v1` is stripped). `VLLM_OMNI_API_KEY` is optional and sent
 *   as `Authorization: Bearer …` only when set.
 * - **Qwen-Image-2.1 sizes are 2K-native** and requested sizes are snapped to
 *   the nearest aspect ratio: 1:1 `2048x2048`, 4:3 `2400x1792`, 3:4
 *   `1792x2400`, 3:2 `2528x1696`, 2:3 `1696x2528`, 16:9 `2752x1536`, 9:16
 *   `1536x2752` (so `1024x1024` becomes `2048x2048`). Other models get the size
 *   you send, unchanged.
 * - **Results are base64 only** (`mimeType` set; no URL). `responseFormat:
 *   'url'`, `quality` and `style` are not forwarded.
 * - **Edits: the mask field is `mask_image`, not `mask`.** This bond maps the
 *   core's `mask` for you (white = inpaint). Pointing the OpenAI bond at a
 *   vLLM-Omni server via `OPENAI_BASE_URL` sends `mask`, which the server
 *   drops — use this bond instead. Multi-reference edits: pass extra images in
 *   `images` (sent after `image`); Qwen-Image-2.1 takes at most 10 in total
 *   and more throws before any request.
 * - **Guidance is off by default for Qwen-Image-2.1** (`true_cfg_scale` 1.0,
 *   40 steps recommended). Do not assume SD-style cfg 4–7; `negativePrompt`
 *   likely has no effect unless `guidanceScale` > 1. In `generateImage`,
 *   `guidanceScale` → `true_cfg_scale`; in `imageToImage` it →
 *   `guidance_scale` (the edits API's field). `strength` is not forwarded.
 * - **Diffusion parameters pass to the model WITHOUT server-side
 *   validation** — a bad `steps`/`seed`/`guidanceScale` fails inside the model,
 *   not with a clean 400.
 * - **Transparency has no parameter** — it is triggered by the prompt
 *   template; use `transparentPrompt(description)`.
 * - Errors are `VllmOmniImageError` with `status` (400 bad params, 422 missing
 *   fields, 503 engine not initialised; 0 = unreachable or timed out) and
 *   `code` when the server sent one. Nothing is retried; the default timeout
 *   is 300 s.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './qwen-image.js'
export * from './secrets.js'
export * from './types.js'
