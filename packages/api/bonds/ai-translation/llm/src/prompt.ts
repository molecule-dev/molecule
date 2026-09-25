/**
 * Prompt construction and response parsing for model-based translation.
 *
 * The model receives a JSON array of strings and must answer with a JSON object
 * holding a same-length array. JSON in and out keeps batch boundaries exact
 * (a newline-separated format breaks on multi-line strings) and lets one
 * request carry dozens of short UI strings.
 *
 * @module
 */

/**
 * English name of a language code, falling back to the code itself.
 * Accepts provider-flavored codes in any case (`de`, `DE`, `PT-BR`, `zh-TW`, `ZH-HANT`).
 *
 * @param code - A BCP-47-style language code.
 * @returns The language's English name, e.g. 'German' or 'Chinese (Taiwan)'.
 */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
  } catch (_error) {
    // Intl rejects codes it cannot parse; the code itself is still a usable hint for the model.
    return code
  }
}

/**
 * Builds the system prompt for one target language.
 *
 * @param targetLang - Target language code.
 * @param sourceLang - Source language code, if known.
 * @param context - Caller-supplied context about the texts (not translated).
 * @param instructions - Extra standing instructions from the provider config.
 * @returns The system prompt.
 */
export function systemPrompt(
  targetLang: string,
  sourceLang: string | undefined,
  context: string | undefined,
  instructions: string | undefined,
): string {
  const from = sourceLang ? languageName(sourceLang) : 'the source language (detect it)'
  const lines = [
    `You are a professional software localizer. Translate every string from ${from} into ${languageName(targetLang)} (language code "${targetLang}").`,
    'The input is a JSON object {"strings": [...]}. Answer with ONLY a JSON object {"translations": [...]} holding exactly one translation per input string, in the same order — no commentary, no code fences.',
    'Rules:',
    '- Tokens like ⟦0⟧ are placeholders for values filled in later. Copy each one exactly, once. You may move a token to where the grammar of the target language needs it. Never translate, renumber, drop or add a token.',
    '- Keep literal escape sequences such as \\n exactly as written, and keep any leading or trailing spaces.',
    '- These are short user-interface texts: buttons, labels, messages. Use the wording a native app in that language would use, and match the tone and length of the source.',
    '- Keep product names, brand names, code, file names and URLs unchanged.',
    '- If a string is already in the target language, or cannot be translated (a number, a symbol), return it unchanged.',
  ]
  if (context) lines.push(`Context about these texts: ${context}`)
  if (instructions) lines.push(instructions)
  return lines.join('\n')
}

/**
 * Parses the model's answer into an array of strings.
 *
 * @param answer - The model's full text output.
 * @param expected - How many translations the request carried.
 * @returns The translations, or null when the answer is not a same-length string array.
 */
export function parseTranslations(answer: string, expected: number): string[] | null {
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(answer.slice(start, end + 1)) as { translations?: unknown }
    const list = parsed.translations
    if (!Array.isArray(list) || list.length !== expected) return null
    return list.every((item) => typeof item === 'string') ? (list as string[]) : null
  } catch (_error) {
    // Not valid JSON — the caller retries this batch in smaller pieces.
    return null
  }
}
