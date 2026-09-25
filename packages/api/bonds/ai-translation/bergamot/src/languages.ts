/**
 * Language codes: what callers send, what Bergamot's model list uses.
 *
 * Firefox's models are keyed by plain ISO 639-1 codes, except Chinese, which
 * is split by script (`zh-Hans`, `zh-Hant`). Callers send whatever their
 * locale system uses (`DE`, `pt-BR`, `es-MX`, `zh-TW`, `no`), so every code is
 * reduced to the model list's form before a model is looked up.
 *
 * @module
 */

/** Region/script variants that pick a Chinese script. */
const CHINESE: Record<string, string> = {
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
}

/** Codes that name the same language differently. */
const ALIASES: Record<string, string> = {
  no: 'nb',
  iw: 'he',
  in: 'id',
  tl: 'fil',
}

/**
 * Reduces a caller's language code to the form Bergamot's model list uses.
 *
 * @param code - Any BCP-47-ish code (`de`, `DE`, `pt-BR`, `zh_TW`, `EN-US`).
 * @returns The model-list code (`de`, `pt`, `zh-Hant`, `en`).
 */
export function toBergamotLanguage(code: string): string {
  const lower = code.trim().toLowerCase().replace(/_/g, '-')
  const chinese = CHINESE[lower] ?? (lower.startsWith('zh-') ? chineseScript(lower) : undefined)
  if (chinese) return chinese
  const base = lower.split('-')[0]
  return ALIASES[base] ?? base
}

/**
 * Picks the Chinese script for a longer tag such as `zh-hant-tw`.
 *
 * @param lower - A lower-cased tag starting with `zh-`.
 * @returns `zh-Hant` for traditional-script tags, otherwise `zh-Hans`.
 */
function chineseScript(lower: string): string {
  return /-(hant|tw|hk|mo)(-|$)/.test(lower) ? 'zh-Hant' : 'zh-Hans'
}

/**
 * English name of a language, for `getSupportedLanguages`.
 *
 * @param code - A model-list code.
 * @returns The English name, or the code itself when the runtime has no name for it.
 */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
  } catch (_error) {
    // Intl throws RangeError on a malformed tag; the code itself is the best label left.
    return code
  }
}
