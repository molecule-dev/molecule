/**
 * Angular multi-stage horizontal progress timeline with a current-stage marker.
 * Used by employee-onboarding, applicant-tracking, kanban-board status
 * flows, and order-fulfillment progress trackers.
 *
 * Exports `<div mol-stage-timeline>` and `statusOf` — the Angular counterpart
 * of `@molecule/app-stage-timeline-react`, with the same props (React names)
 * and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { StageTimeline } from '@molecule/app-stage-timeline-angular'
 *
 * @Component({
 *   selector: 'app-hiring',
 *   standalone: true,
 *   imports: [StageTimeline],
 *   template: `<div mol-stage-timeline [stages]="stages" [currentIndex]="2"></div>`,
 * })
 * export class HiringPage {
 *   stages = [
 *     { id: 'applied', label: 'Applied' },
 *     { id: 'screen', label: 'Phone Screen' },
 *     { id: 'onsite', label: 'On-site' },
 *     { id: 'offer', label: 'Offer' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - Colors are read from `--mol-color-primary`, `--mol-color-on-primary`,
 *   `--mol-color-primary-container`, `--mol-color-outline`,
 *   `--mol-color-surface(-variant)`, `--mol-color-on-surface(-variant)`
 *   CSS custom properties with hardcoded light-theme fallbacks
 *   (blue #3366ff, black-alpha grays). Define those `--mol-color-*`
 *   variables in your theme (both light and dark) or the timeline stays
 *   default-blue and looks wrong in dark mode.
 * - `currentIndex` semantics: stages before it render completed, after
 *   it upcoming; pass `-1` for "not started" and `stages.length` for
 *   "all done".
 * - Stage dots render as buttons but are disabled unless that stage has
 *   an `onClick`.
 * - Node-valued stage fields (`label`, `subtitle`) are `ng-template`
 *   references or plain text, as React's `ReactNode` fields are.
 * - Stages are tracked by `id` (`@for (… ; track stage.id)`), so a re-passed
 *   or re-ordered list keeps each marker's DOM the way React's `key` does.
 *
 * @module
 */

export * from './stage-timeline.component.js'
export * from './types.js'
