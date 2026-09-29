/**
 * TeleOCR provider for molecule.dev.
 *
 * Implements the `@molecule/api-ocr` contract with TeleOCR, an open
 * (Apache-2.0 weights), ~1.2B-parameter vision-language model built for
 * document parsing — scanned and photographed pages, tables, formulas, code.
 * It runs on your own GPU behind vLLM's OpenAI-compatible server, reached
 * through `@molecule/api-ai-local`, so there is no per-call vendor cost.
 *
 * @example
 * ```typescript
 * import { createProvider as createLocalAi } from '@molecule/api-ai-local'
 * import { requireProvider, setProvider } from '@molecule/api-ocr'
 * import { createProvider } from '@molecule/api-ocr-teleocr'
 *
 * // vllm serve StarDoc-AI/TeleOCR (with the TeleOCR_vllm plugin installed)
 * const ai = createLocalAi({ baseUrl: 'http://localhost:8000/v1' })
 * setProvider(createProvider({ ai }))
 *
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(imageBytes),
 *   mimeType: 'image/png',
 * })
 * console.log(result.text)
 * ```
 *
 * @remarks
 * - **Serve it with the `TeleOCR_vllm` plugin, never stock vLLM alone.** The
 *   model reuses the architecture name `Qwen2_5_VLForConditionalGeneration`,
 *   so stock vLLM may load it with the wrong model code instead of failing.
 *   `pip install -e .` in the TeleOCR repo registers the plugin; it pins vLLM
 *   0.11.x, torch 2.8 and transformers 4.57 and needs a CUDA GPU. The weights
 *   load with `trust_remote_code`, so pin a model revision.
 * - **The task prompts are load-bearing — do not rewrite them.** TeleOCR is
 *   trained on fixed strings (`TELEOCR_PROMPTS`); a paraphrase, an extra
 *   instruction, or `@molecule/api-ocr-llm`'s generic OCR prompt is
 *   off-distribution. The `distortedLayout` prompt starts with a newline on
 *   purpose.
 * - **Chinese and English only. `language` is ignored** — there is no slot for
 *   a language hint in the prompt, and appending one hurts accuracy. For other
 *   scripts bond `@molecule/api-ocr-tesseract` or `@molecule/api-ocr-llm`.
 * - **`recognize()` returns plain text only.** Tables in the `table` /
 *   `scientificFigure` tasks come back as OTSL tokens (`<fcel>`, `<nl>`, …) —
 *   never show those to users; pass them through `convertOtslToHtml()`.
 *   Formulas come back as LaTeX; `formatFormula()` wraps them in `$$…$$`.
 * - **The layout tasks need the image resized to 1036×1036 first**, and their
 *   raw output format is not documented upstream — do not parse it on a guess.
 * - **One image per call, no confidence, no PDFs.** Rasterize PDF pages
 *   yourself; `pages[0].confidence` is always unset.
 * - **Output is capped at 4096 tokens by default** (the reference budget). A
 *   page that fills it throws `TeleOcrTruncatedError` (with `partialText`)
 *   rather than returning cut-off text; raise `maxOutputTokens` within the
 *   server's `--max-model-len`, or split the image.
 * - The served model name defaults to `TELEOCR_MODEL`, then
 *   `StarDoc-AI/TeleOCR`; it must match the name `vllm serve` was started
 *   with. The endpoint and any `--api-key` belong to the injected AI provider
 *   (`LOCAL_AI_BASE_URL`, `LOCAL_AI_API_KEY`), not to this package.
 *
 * @module
 */
export * from './browser-guard.js'
export * from './errors.js'
export * from './otsl.js'
export * from './prompt.js'
export * from './provider.js'
export * from './types.js'
