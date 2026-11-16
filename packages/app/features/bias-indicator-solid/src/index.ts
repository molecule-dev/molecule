/**
 * Solid political-bias / source-credibility indicator.
 *
 * Exports `BiasIndicator` — left/right scale with marker plus optional
 * reliability dot/chip — for news-aggregator article headers and dense
 * article lists (compact variant). It is the Solid counterpart of
 * `@molecule/app-bias-indicator-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```tsx
 * import { BiasIndicator } from '@molecule/app-bias-indicator-solid'
 *
 * export function ArticleHeader() {
 *   return <BiasIndicator bias={-0.4} reliability={0.8} sourceLabel="Reuters" />
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap and an i18n provider (the component reads
 *   `useTranslation()`), exactly like the React package.
 * - Colours come from the per-app semantic CSS custom properties, so themes
 *   flow through without code changes.
 *
 * @module
 */

export * from './BiasIndicator.jsx'
export * from './types.js'
