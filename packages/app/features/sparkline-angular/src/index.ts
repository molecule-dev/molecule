/**
 * Angular tiny inline trend chart — line/bar/dot variants, SVG only.
 *
 * Exports `<Sparkline>` — the Angular counterpart of
 * `@molecule/app-sparkline-react`, with the same props (React names, bound
 * as inputs) and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Sparkline } from '@molecule/app-sparkline-angular'
 *
 * @Component({
 *   selector: 'revenue-tile',
 *   standalone: true,
 *   imports: [Sparkline],
 *   template: `
 *     <mol-sparkline
 *       [values]="[12, 18, 15, 22, 30, 27, 35]"
 *       variant="line"
 *       [width]="80"
 *       [height]="24"
 *       ariaLabel="Weekly revenue trend"
 *     />
 *   `,
 * })
 * export class RevenueTile {}
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding); no i18n dependency.
 * - The SVG is fixed-pixel (`width`/`height` inputs, defaults 80×24) —
 *   it does not stretch to its container. Compute px from layout if you
 *   need responsiveness.
 * - `color` accepts any CSS color and defaults to `currentColor`, so the
 *   sparkline inherits the surrounding text color — set a text color on
 *   a parent (e.g. success/error) to theme it.
 * - Values are min-max normalized per series; a constant series renders
 *   as a line along the bottom edge, and `values: []` renders nothing.
 * - Pass `ariaLabel` with a translated string — the built-in fallback
 *   ("Trend sparkline") is English-only.
 * - React's root is the `<svg>` when the series is non-empty and nothing
 *   when empty, so the host is unwrapped (`data-parity-unwrap`,
 *   `display: contents`) and contributes no DOM of its own.
 *
 * @module
 */

export * from './sparkline.component.js'
export * from './types.js'
