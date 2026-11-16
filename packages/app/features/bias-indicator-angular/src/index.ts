/**
 * Angular political-bias / source-credibility indicator.
 *
 * Exports `<BiasIndicator>` — left/right scale with marker plus optional
 * reliability dot/chip — for news-aggregator article headers and dense
 * article lists (compact variant). It is the Angular counterpart of
 * `@molecule/app-bias-indicator-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { BiasIndicator } from '@molecule/app-bias-indicator-angular'
 *
 * @Component({
 *   selector: 'app-article-header',
 *   standalone: true,
 *   imports: [BiasIndicator],
 *   template: `
 *     <mol-bias-indicator [bias]="-0.4" [reliability]="0.8">
 *       <span slot="sourceLabel">Reuters</span>
 *     </mol-bias-indicator>
 *   `,
 * })
 * export class ArticleHeader {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap and an i18n provider (the component reads
 *   `useTranslation()`), exactly like the React package.
 * - React's `sourceLabel` node prop is projected content: pass it as
 *   `[slot=sourceLabel]` content. The caption element renders only when
 *   something was projected.
 * - Colours come from the per-app semantic CSS custom properties, so themes
 *   flow through without code changes.
 *
 * @module
 */

export * from './bias-indicator.component.js'
export * from './types.js'
