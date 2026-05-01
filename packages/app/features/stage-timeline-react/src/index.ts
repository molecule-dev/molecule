/**
 * Multi-stage horizontal progress timeline with a current-stage marker.
 * Used by employee-onboarding, applicant-tracking, kanban-board status
 * flows, and order-fulfillment progress trackers.
 *
 * @example
 * ```tsx
 * import { StageTimeline } from '@molecule/app-stage-timeline-react'
 *
 * <StageTimeline
 *   currentIndex={2}
 *   stages={[
 *     { id: 'applied', label: 'Applied' },
 *     { id: 'screen',  label: 'Phone Screen' },
 *     { id: 'onsite',  label: 'On-site' },
 *     { id: 'offer',   label: 'Offer' },
 *   ]}
 * />
 * ```
 *
 * @module
 */

export * from './StageTimeline.js'
export * from './types.js'
