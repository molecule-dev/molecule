/**
 * React political-bias / source-credibility indicator.
 *
 * Exports `<BiasIndicator>` — left/right scale with marker plus
 * optional reliability dot/chip — for news-aggregator article
 * headers and dense article lists (compact variant).
 *
 * @example
 * ```tsx
 * import { BiasIndicator } from '@molecule/app-bias-indicator-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as biasIndicatorLocales from '@molecule/app-locales-bias-indicator'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(biasIndicatorLocales)
 *
 * const sources = [
 *   { name: 'Reuters', bias: -0.1, reliability: 0.9 },
 *   { name: 'The Daily Take', bias: 0.7, reliability: 0.3 },
 * ]
 *
 * export function SourceRatings() {
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       {sources.map((s) => (
 *         <BiasIndicator key={s.name} bias={s.bias} reliability={s.reliability} sourceLabel={s.name} />
 *       ))}
 *       <BiasIndicator bias={-0.4} compact sourceLabel="Metro Wire" />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Scales:** `bias` is `-1` (far left) … `0` (center) … `+1` (far right) —
 *   NOT `0..100` or `0..1`; `reliability` is `0..1`. Out-of-range values are
 *   clamped, `NaN` becomes the minimum. Buckets: `<= -0.6` far left,
 *   `<= -0.2` left-leaning, `< 0.2` center, `< 0.6` right-leaning, else far
 *   right; reliability `>= 0.75` high, `>= 0.5` medium, `>= 0.25` low, else
 *   disputed. Omit `reliability` to hide the reliability chip.
 * - It calls `useTranslation()` from `@molecule/app-react` (throws without an
 *   `I18nProvider` / `MoleculeProvider i18n` above it) and `getClassMap()`
 *   (throws until `setClassMap(...)` ran). Labels come from the companion
 *   `@molecule/app-locales-bias-indicator` bond.
 * - `compact` renders only a coloured dot (+ `sourceLabel`); its bias and
 *   reliability text is in the `aria-label` only, not visible.
 * - It only displays scores you supply — it does not rate sources.
 *
 * @module
 */

export * from './BiasIndicator.js'
