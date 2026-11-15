/**
 * Types of `@molecule/app-status-timeline-angular` — the Angular counterpart
 * of `@molecule/app-status-timeline-react`, same props and DOM.
 *
 * @module
 */

/** A single step entry in a StatusTimeline. */
export interface StatusTimelineStep {
  /** Stable identifier for this step (used as the `@for` track key). */
  key: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/**
 * Props accepted by {@link StatusTimeline} — the same props
 * `@molecule/app-status-timeline-react` accepts.
 */
export interface StatusTimelineProps {
  /** Ordered list of steps from earliest to latest. */
  steps: ReadonlyArray<StatusTimelineStep>
  /** The key of the current step. Steps with the same or earlier index are shown as "reached". */
  currentKey: string
  /** Aria-label for the timeline ordered list. */
  ariaLabel?: string
  /** Extra classes on the outer `<ol>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
