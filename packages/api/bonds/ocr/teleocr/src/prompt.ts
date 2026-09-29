/**
 * TeleOCR's fixed task prompts, verbatim from the model card.
 *
 * TeleOCR is a specialist model trained on these exact strings — each one
 * selects a task. A paraphrase, an appended language hint or a free-form OCR
 * prompt is off-distribution and degrades the output. Keep them byte-for-byte,
 * including the leading newline of `distortedLayout`.
 *
 * @module
 */

/** The system prompt the reference implementation sends with every task. */
export const TELEOCR_SYSTEM_PROMPT = 'You are a helpful assistant.'

/**
 * The task prompts. `text` is what `recognize()` sends; the rest are exported
 * for callers that drive the model directly through `@molecule/api-ai`.
 *
 * - `text` → plain text.
 * - `table` → OTSL tokens; convert with {@link convertOtslToHtml}.
 * - `formula` → LaTeX; normalize with {@link formatFormula}.
 * - `code` → the code snippet's text.
 * - `layout` / `distortedLayout` → layout blocks. The image must first be
 *   resized to 1036×1036 (bicubic), and the raw serialization of the blocks
 *   is not documented upstream — parse it only after checking it yourself.
 * - `scientificFigure` → the table a chart implies, as OTSL.
 */
export const TELEOCR_PROMPTS = {
  text: 'Please output the text content from the image.',
  table: 'This is the image of a table. Please output the table in OTSL format.',
  formula: 'Please write out the expression of the formula in the image using LaTeX format.',
  code: 'The image contains a code snippet, please output the parsing result.',
  layout: 'Analyze the image layout.',
  distortedLayout: '\nMulti-point Layout Segmentation Analysis.',
  scientificFigure: 'This is a scientific figure. Please extract the table implied by this figure.',
} as const

/** One of TeleOCR's tasks — a key of {@link TELEOCR_PROMPTS}. */
export type TeleOcrTask = keyof typeof TELEOCR_PROMPTS

/** Side length, in pixels, the layout tasks expect the image resized to. */
export const TELEOCR_LAYOUT_IMAGE_SIZE = 1036
