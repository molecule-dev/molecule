/**
 * Lazy, per-language access to this bond's translations.
 *
 * `index.ts` re-exports every language, so `import * as bond from
 * '@molecule/app-locales-drawing-toolbar'` (and `registerLocaleModule`) pulls all 79 dictionaries
 * into whatever bundle imports it — the largest single contributor to a built
 * app's entry chunk. Importing {@link loadLocaleModule} from
 * '@molecule/app-locales-drawing-toolbar/loader.js' instead keeps only the requested language: each
 * `import()` below is its own chunk, fetched when that locale is selected.
 *
 * @module
 */

const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  af: () => import('./af.js'),
  am: () => import('./am.js'),
  ar: () => import('./ar.js'),
  az: () => import('./az.js'),
  be: () => import('./be.js'),
  bg: () => import('./bg.js'),
  bn: () => import('./bn.js'),
  bs: () => import('./bs.js'),
  ca: () => import('./ca.js'),
  cs: () => import('./cs.js'),
  cy: () => import('./cy.js'),
  da: () => import('./da.js'),
  de: () => import('./de.js'),
  el: () => import('./el.js'),
  en: () => import('./en.js'),
  es: () => import('./es.js'),
  et: () => import('./et.js'),
  eu: () => import('./eu.js'),
  fa: () => import('./fa.js'),
  fi: () => import('./fi.js'),
  fil: () => import('./fil.js'),
  fr: () => import('./fr.js'),
  ga: () => import('./ga.js'),
  gl: () => import('./gl.js'),
  gu: () => import('./gu.js'),
  ha: () => import('./ha.js'),
  he: () => import('./he.js'),
  hi: () => import('./hi.js'),
  hr: () => import('./hr.js'),
  hu: () => import('./hu.js'),
  hy: () => import('./hy.js'),
  id: () => import('./id.js'),
  ig: () => import('./ig.js'),
  is: () => import('./is.js'),
  it: () => import('./it.js'),
  ja: () => import('./ja.js'),
  ka: () => import('./ka.js'),
  kk: () => import('./kk.js'),
  km: () => import('./km.js'),
  kn: () => import('./kn.js'),
  ko: () => import('./ko.js'),
  ky: () => import('./ky.js'),
  lo: () => import('./lo.js'),
  lt: () => import('./lt.js'),
  lv: () => import('./lv.js'),
  mk: () => import('./mk.js'),
  ml: () => import('./ml.js'),
  mn: () => import('./mn.js'),
  mr: () => import('./mr.js'),
  ms: () => import('./ms.js'),
  mt: () => import('./mt.js'),
  my: () => import('./my.js'),
  nb: () => import('./nb.js'),
  ne: () => import('./ne.js'),
  nl: () => import('./nl.js'),
  pa: () => import('./pa.js'),
  pl: () => import('./pl.js'),
  pt: () => import('./pt.js'),
  ro: () => import('./ro.js'),
  ru: () => import('./ru.js'),
  si: () => import('./si.js'),
  sk: () => import('./sk.js'),
  sl: () => import('./sl.js'),
  sq: () => import('./sq.js'),
  sr: () => import('./sr.js'),
  sv: () => import('./sv.js'),
  sw: () => import('./sw.js'),
  ta: () => import('./ta.js'),
  te: () => import('./te.js'),
  th: () => import('./th.js'),
  tr: () => import('./tr.js'),
  uk: () => import('./uk.js'),
  ur: () => import('./ur.js'),
  uz: () => import('./uz.js'),
  vi: () => import('./vi.js'),
  yo: () => import('./yo.js'),
  'zh-TW': () => import('./zh-TW.js'),
  zh: () => import('./zh.js'),
  zu: () => import('./zu.js'),
}

/** Every locale code this bond carries a dictionary for. */
export const localeCodes = Object.keys(loaders)

/**
 * Loads this bond's translations for one locale, on demand.
 *
 * Regional codes fall back to their base language (`es-MX` → `es`) and an
 * unknown code resolves to `undefined`, so callers can compose several bonds
 * without every locale existing in every one.
 *
 * @param code - Locale code, e.g. `en`, `pt`, `zh-TW`.
 * @returns The translation record, or `undefined` when this bond has none.
 */
export async function loadLocaleModule(code: string): Promise<Record<string, string> | undefined> {
  const key = code.replace('_', '-')
  const load = loaders[key] ?? loaders[key.split('-')[0]]
  if (!load) return undefined
  const module = (await load()) as Record<string, unknown>
  const value = module[key.replace('-', '')] ?? module[key.split('-')[0]]
  return value && typeof value === 'object' ? (value as Record<string, string>) : undefined
}
