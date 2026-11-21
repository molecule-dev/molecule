/**
 * Types for the Solid stage timeline — the Solid counterpart of
 * `@molecule/app-stage-timeline-react`'s types, with Solid JSX values where
 * React has `ReactNode`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single stage on the timeline. */
export interface StageTimelineStage {
  /** Stable id (used as the render key + `data-stage-id`). */
  id: string
  /** Stage label (e.g. "Applied", "Phone Screen", "Offer"). */
  label: JSX.Element
  /** Optional secondary line (timestamp, owner, etc.). */
  subtitle?: JSX.Element
  /** Optional click handler. */
  onClick?: () => void
}

/** Per-stage rendering state. */
export type StageStatus = 'completed' | 'current' | 'upcoming'

/** Props for {@link StageTimeline}. */
export interface StageTimelineProps {
  /** Ordered stages to render, left-to-right. */
  stages: StageTimelineStage[]
  /**
   * Index of the **current** stage (0-based). Stages before this index
   * are rendered as `completed`; stages after are rendered as `upcoming`.
   * Pass `-1` to render every stage as upcoming (e.g. before kickoff).
   * Pass `stages.length` to render every stage as completed (process done).
   */
  currentIndex: number
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
