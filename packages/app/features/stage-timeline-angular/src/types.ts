/**
 * Types of `@molecule/app-stage-timeline-angular` — the Angular counterpart of
 * `@molecule/app-stage-timeline-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** A single stage on the timeline. */
export interface StageTimelineStage {
  /** Stable id (used as the render key + `data-stage-id`). */
  id: string
  /** Stage label: a template reference (a node), or text. */
  label: string | number | TemplateRef<unknown>
  /** Optional secondary line (timestamp, owner, etc.): a template reference, or text. */
  subtitle?: string | number | TemplateRef<unknown>
  /** Optional click handler. */
  onClick?: () => void
}

/** Per-stage rendering state. */
export type StageStatus = 'completed' | 'current' | 'upcoming'

/**
 * Props accepted by {@link StageTimeline} — the same props
 * `@molecule/app-stage-timeline-react` accepts. Node-valued stage fields
 * (`label`, `subtitle`) are template references in Angular (an input cannot
 * carry a node), or plain text.
 */
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
