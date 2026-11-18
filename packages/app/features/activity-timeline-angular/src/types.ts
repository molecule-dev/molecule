/**
 * Types of `@molecule/app-activity-timeline-angular` — the Angular counterpart
 * of `@molecule/app-activity-timeline-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Single event displayed on the timeline. The `kind` drives the icon and
 * dot colour via the consumer-supplied `toneByKind` map on
 * `<div mol-activity-timeline>`.
 */
export interface TimelineEventData {
  /** Stable row id (the render key). */
  id: string
  /** Event kind, matched against `toneByKind`. */
  kind: string
  /** Row heading: a template reference (a node), or text. */
  title: string | number | TemplateRef<unknown>
  /** Supporting line under the heading: a template reference, or text. */
  description?: string | number | TemplateRef<unknown>
  /** Reserved — not consumed; pass a pre-formatted `meta` instead. */
  occurredAt?: string
  /** Pre-formatted right-aligned label (e.g. "Mar 5", "2h ago"): a template reference, or text. */
  meta?: string | number | TemplateRef<unknown>
  /** Reserved — not consumed; wrap rows in a link via `rowWrapper` instead. */
  href?: string
  /** Extra footer content (badges, before/after chips, etc.): a template reference, or text. */
  footer?: string | number | TemplateRef<unknown>
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
