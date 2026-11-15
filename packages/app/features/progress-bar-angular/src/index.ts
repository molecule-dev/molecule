/**
 * Angular labeled progress bar and progress-card wrapper — the counterpart of
 * `@molecule/app-progress-bar-react`, with the same props and the same DOM.
 *
 * Exports:
 * - `<ProgressBar>` (`div[mol-progress-bar]`) — standalone bar with optional
 *   label + value display.
 * - `<ProgressCard>` (`div[mol-progress-card]`) — Card-wrapped progress
 *   display (title, icon, description, bar, optional extras slot).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ProgressBar, ProgressCard } from '@molecule/app-progress-bar-angular'
 *
 * @Component({
 *   selector: 'app-dashboard',
 *   standalone: true,
 *   imports: [ProgressBar, ProgressCard],
 *   template: `
 *     <div mol-progress-bar [value]="65" label="Upload progress" valueLabel="65%"></div>
 *     <div mol-progress-card
 *       [title]="'Storage used'"
 *       [description]="'8.5 GB of 10 GB'"
 *       [value]="85"
 *       valueLabel="85%"
 *       color="warning"></div>
 *   `,
 * })
 * export class Dashboard {}
 * ```
 *
 * @remarks
 * All text (`label`, `valueLabel`, `title`, `description`) is pass-through —
 * supply already-translated strings; the package renders no text of its own.
 * Requires a wired ClassMap bond: the track/fill styles come from the
 * `progress*` ClassMap tokens, so colors follow the active theme. Node props
 * are projected content (`[slot=<name>]`) or plain string inputs.
 *
 * @module
 */

export * from './progress-bar.component.js'
export * from './progress-card.component.js'
export * from './types.js'
