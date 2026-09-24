/**
 * Multi-stage horizontal progress timeline with a current-stage marker.
 * Used by employee-onboarding, applicant-tracking, kanban-board status
 * flows, and order-fulfillment progress trackers.
 *
 * @example
 * ```tsx
 * import { StageTimeline, type StageTimelineStage } from '@molecule/app-stage-timeline-react'
 *
 * export function ApplicationProgress() {
 *   const application = { stage: 'onsite', onsiteDate: 'Mar 14' }
 *   const stages: StageTimelineStage[] = [
 *     { id: 'applied', label: 'Applied' },
 *     { id: 'screen', label: 'Phone Screen' },
 *     { id: 'onsite', label: 'On-site', subtitle: application.onsiteDate },
 *     { id: 'offer', label: 'Offer' },
 *   ]
 *   const currentIndex = stages.findIndex((s) => s.id === application.stage)
 *   return <StageTimeline stages={stages} currentIndex={currentIndex} />
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
 * - It is display-only and stateless: it does NOT advance stages itself —
 *   compute `currentIndex` (a 0-based NUMBER, not a stage id) from your
 *   data and re-render.
 * - `currentIndex` semantics: stages before it render completed, after
 *   it upcoming; pass `-1` for "not started" and `stages.length` for
 *   "all done".
 * - Stage dots render as buttons but are disabled unless that stage has
 *   an `onClick`.
 * - This is the horizontal stage/pipeline marker; for a vertical
 *   ordered-step list use `@molecule/app-status-timeline-react`, and for
 *   wizard/checkout progress chrome use `@molecule/app-stepper-react`.
 *
 * @module
 */

export * from './StageTimeline.js'
export * from './types.js'
