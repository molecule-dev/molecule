/**
 * Prompts for the language-model OCR provider.
 *
 * The system prompt pins the model to transcription behavior: output only what
 * is written in the image, preserve reading order and line breaks, invent
 * nothing. The user message carries the image block plus the language hint.
 *
 * @module
 */

/**
 * The system prompt for one recognition pass.
 *
 * @param instructions - Extra caller instructions, appended last.
 * @returns The system prompt.
 */
export function systemPrompt(instructions?: string): string {
  return [
    'You are an OCR engine. Transcribe EXACTLY the text visible in the image.',
    '- Output only recognized text: no commentary, no markdown fences, no preamble.',
    '- Preserve reading order (top to bottom, left to right) and original line breaks.',
    '- Transcribe text in its original language and script; do not translate.',
    '- Illegible text becomes a single "?" per unreadable word — never guess a plausible reading.',
    '- If the image contains no text, return an empty response.',
    ...(instructions ? ['- ' + instructions] : []),
  ].join('\n')
}

/**
 * The text part of the user message (the image block is sent alongside it).
 *
 * @param language - Optional language hint.
 * @returns The user-side instruction.
 */
export function userPrompt(language?: string): string {
  const lang = language
    ? ` The text is expected to be in "${language}" — transcribe it in that language.`
    : ''
  return `Transcribe all text in this image.${lang}`
}
