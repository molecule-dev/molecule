/**
 * Errors raised by the TeleOCR provider.
 *
 * @module
 */

/**
 * The model used its whole output budget, so the transcription is cut off.
 * Carries the partial text so a caller can keep it knowingly — never returned
 * silently as if it were the full page. Dense pages hit the reference budget of
 * 4096 tokens; raise `maxOutputTokens` (within the server's `--max-model-len`)
 * or split the image.
 */
export class TeleOcrTruncatedError extends Error {
  override readonly name = 'TeleOcrTruncatedError'

  /**
   * Creates a truncation error.
   *
   * @param partialText - The text the model produced before it hit the limit.
   * @param maxOutputTokens - The output token ceiling that was reached.
   */
  constructor(
    readonly partialText: string,
    readonly maxOutputTokens: number,
  ) {
    super(
      `TeleOCR output reached the ${maxOutputTokens}-token limit; the transcription is truncated.`,
    )
  }
}
