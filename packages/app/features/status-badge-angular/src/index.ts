/**
 * Angular status-badge and status-pill components.
 *
 * Both components map a small `StatusKind` union (`success`/`warning`/
 * `error`/`info`/`neutral`) to ClassMap-driven styling so apps can
 * restyle by swapping the ClassMap bond rather than rewriting
 * components.
 *
 * `<span mol-status-badge kind="…">children</span>` — the contract is
 * `kind` + projected children (there are NO `label`/`color` props).
 * `appearance='ui'` (default) carries the framework `<Badge>`'s ClassMap
 * styling and works with any ClassMap bond.
 * `<span mol-status-pill kind="…">children</span>` adds a small colored
 * status dot before the label.
 *
 * This is the Angular counterpart of `@molecule/app-status-badge-react`: the
 * same props (React names) and the same DOM for the same input. Node props are
 * projected content: the icon is `[slot=icon]`, everything else is the default
 * projection.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { StatusBadge, StatusPill } from '@molecule/app-status-badge-angular'
 *
 * @Component({
 *   selector: 'app-row',
 *   standalone: true,
 *   imports: [StatusBadge, StatusPill],
 *   template: `
 *     <span mol-status-badge kind="success">Open</span>
 *     <span mol-status-badge kind="warning" appearance="uppercase-pill">
 *       <span slot="icon" aria-hidden="true">!</span>
 *       Pending
 *     </span>
 *     <span mol-status-pill kind="error">Overdue</span>
 *   `,
 * })
 * export class Row {}
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
 * - The host element IS the badge span (`span[mol-status-badge]` /
 *   `span[mol-status-pill]`), so the rendered DOM is exactly React's.
 * - The `'uppercase-pill'` variant colors through the same ClassMap `badge`
 *   tokens and layers `cm.uppercase` + `cm.trackingWide`, so every kind is
 *   visibly colored in every theme.
 * - `<StatusPill>` has no background surface of its own — only the dot is
 *   colored; add a surface via `className` if you need a filled pill. Its
 *   `neutral` dot uses `bg-outline`, which also needs a theme `outline` color
 *   token to be visible.
 * - Labels are the projected children — pass already-translated strings
 *   (`t('...')`); the components render no text of their own.
 *
 * @module
 */

export * from './status-badge.component.js'
export * from './status-pill.component.js'
export * from './types.js'
