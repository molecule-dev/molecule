/**
 * vLLM-Omni image-generation provider for `@molecule/api-ai-image-generation`.
 *
 * Generates and edits images on your own vLLM-Omni or SGLang server through
 * its OpenAI-compatible Images API (`/v1/images/generations`,
 * `/v1/images/edits`). The default model is Qwen-Image-2.1 (text-to-image,
 * multi-reference editing, transparent output, 2K native); the same bond also
 * knows MiniMax-H3-Image's native ~16 MP sizes and sampling rules
 * (`MiniMaxAI/MiniMax-H3-Image`, up to 16 references), and serves any other
 * diffusion model the server hosts — set `VLLM_OMNI_MODEL` or pass `model`.
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
 * - **MiniMax-H3-Image WEIGHTS ARE UNDER ITS OWN COMMUNITY LICENSE** (Nov 10,
 *   2026, licensor Nanonoble Pte. Ltd.) — and self-hosting them for users is
 *   exactly what it restricts: written authorization is required to offer a
 *   "Hosted Service" (availability "including via application programming
 *   interfaces (APIs), web access") or past $1M USD revenue, the "Excluded
 *   Territories" are the EU, the UK, South Korea and the USA, and outputs
 *   must not train other models. Serving H3-Image through a molecule app is a
 *   Hosted Service under that license — you are responsible for the
 *   authorization and territory check. Calling MiniMax's hosted API instead
 *   (the `@molecule/api-ai-image-generation-minimax` bond) puts the hosting
 *   party on MiniMax's side of the line.
 * - **MiniMax-H3-Image (self-hosted) rules this bond enforces for you:**
 *   sizes snap to the native ~16 MP grid (1:1 `4096x4096`, 4:3 `4736x3552`,
 *   3:4 `3552x4736`, 3:2 `5024x3360`, 2:3 `3360x5024`, 16:9 `5472x3072`,
 *   9:16 `3072x5472`, 21:9 `6272x2688`; working range ~4–20 MP) and `size` is
 *   REQUIRED — with none, `4096x4096` is sent. The checkpoint is distilled to
 *   exactly 6 steps with no classifier-free guidance: `steps` other than 6,
 *   `guidanceScale` other than 1, `negativePrompt` (always) and a non-PNG
 *   `outputFormat` throw before any request; the accepted values are simply
 *   omitted (the documented form). There is no masked editing — a `mask`
 *   throws. Edits accept up to 16 references (vs Qwen-Image-2.1's 10). A
 *   204 GB full checkpoint plus a 66.7 GB text encoder is a multi-GPU
 *   commitment (the card's own examples split across 4 GPUs); the card
 *   recommends `generator_device: cpu` for reproducible seeds.
 * - **You run the server; it needs a GPU.** `vllm serve Qwen/Qwen-Image-2.1
 *   --omni --port 8091` (vLLM-Omni's own default port is 8000); H3-Image
 *   serves the same Images API through vLLM-Omni or SGLang. A 7B DiT plus
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
 *   not with a clean 400. (MiniMax-H3-Image is the exception: its server
 *   400s, and this bond throws even earlier — see its bullet above.)
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
export * from './minimax-h3-image.js'
export * from './provider.js'
export * from './qwen-image.js'
export * from './secrets.js'
export * from './types.js'
