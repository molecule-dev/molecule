/**
 * Types for the Svelte activity-timeline primitives — the Svelte counterpart
 * of `@molecule/app-activity-timeline-react`'s types, with snippets where React
 * has `ReactNode`.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Single event displayed on the timeline. The `kind` drives the icon and
 * dot colour via the consumer-supplied `toneByKind` map on
 * `<ActivityTimeline>`.
 */
export interface TimelineEventData {
  /** Stable row id (the render key). */
  id: string
  /** Event kind, matched against `toneByKind`. */
  kind: string
  /** Row heading (a snippet, or plain text). */
  title: Snippet | string | number
  /** Supporting line under the heading (a snippet, or plain text). */
  description?: Snippet | string | number
  /** Reserved — not consumed; pass a pre-formatted `meta` instead. */
  occurredAt?: string
  /** Pre-formatted right-aligned label (e.g. "Mar 5", "2h ago"; a snippet, or plain text). */
  meta?: Snippet | string | number
  /** Reserved — not consumed; wrap rows in a link via `rowWrapper` instead. */
  href?: string
  /** Extra footer content (badges, before/after chips, etc.; a snippet, or plain text). */
  footer?: Snippet | string | number
}

/** Visual treatment for a particular event kind. */
export interface TimelineKindTone {
  /**
   * Material Symbols icon name (e.g. `'call'`, `'mail'`). Requires the
   * Material Symbols Outlined font to be loaded in the app (e.g. via an
   * `@molecule/app-fonts-*` bond) — without it the raw name renders as text.
   */
  icon: string
  /**
   * Raw utility class string applied to the dot background (e.g. Tailwind
   * `'bg-primary'`). NOTE: raw class strings couple the call site to the
   * active styling bond — prefer semantic token classes and keep them out of
   * shared code.
   */
  dotClass?: string
  /** Raw utility class string applied to the icon (e.g. `'text-on-primary'`). */
  iconClass?: string
}
