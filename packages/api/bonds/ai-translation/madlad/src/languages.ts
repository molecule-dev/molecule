/**
 * Language codes: what callers send, what MADLAD-400's target tokens use.
 *
 * MADLAD picks the output language from a `<2xx>` token in front of the text.
 * The tokens are mostly ISO 639-1/-3 codes, with a script suffix where one
 * language is written several ways (`zh_Hant` for Traditional Chinese). The
 * source language is never named — the model reads it from the text.
 *
 * @module
 */

/** Region/script variants that pick a Chinese script. */
const CHINESE: Record<string, string> = {
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-sg': 'zh',
  'zh-hans': 'zh',
  'zh-tw': 'zh_Hant',
  'zh-hk': 'zh_Hant',
  'zh-mo': 'zh_Hant',
  'zh-hant': 'zh_Hant',
}

/** Codes that name the same language differently in MADLAD's list. */
const ALIASES: Record<string, string> = {
  nb: 'no',
  iw: 'he',
  in: 'id',
  tl: 'fil',
}

/**
 * Reduces a caller's language code to MADLAD's target token (without `<2` `>`).
 *
 * A code whose exact form is a MADLAD token (e.g. `ms_Arab`) is kept as is;
 * otherwise the region is dropped (`pt-BR` → `pt`, `es-MX` → `es`).
 *
 * @param code - Any BCP-47-ish code (`de`, `DE`, `pt-BR`, `zh-TW`, `nb`).
 * @param known - MADLAD's token list, when known, to keep exact matches.
 * @returns The token code (`de`, `pt`, `zh_Hant`, `no`).
 */
export function toMadladLanguage(code: string, known?: ReadonlySet<string>): string {
  const trimmed = code.trim()
  if (known?.has(trimmed)) return trimmed
  const lower = trimmed.toLowerCase().replace(/_/g, '-')
  const chinese =
    CHINESE[lower] ??
    (lower.startsWith('zh-') ? (/-(hant|tw|hk|mo)(-|$)/.test(lower) ? 'zh_Hant' : 'zh') : undefined)
  if (chinese) return chinese
  const base = lower.split('-')[0]
  return ALIASES[base] ?? base
}

/**
 * English name of a MADLAD language, for `getSupportedLanguages`.
 *
 * @param code - A MADLAD token code (`de`, `zh_Hant`, `ms_Arab`).
 * @returns The English name, or the code when the runtime has no name for it.
 */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code.replace(/_/g, '-')) ?? code
  } catch (_error) {
    // Intl throws RangeError on tags it cannot parse (some MADLAD codes are not BCP-47).
    return code
  }
}
