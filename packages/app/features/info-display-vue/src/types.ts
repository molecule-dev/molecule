/**
 * Types for the Vue info display components.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single label/value pair rendered inside a DefinitionList. */
export interface DefinitionField {
  /** Label content (usually `t('...')`). Passed as a VNode or plain text. */
  label: VNodeChild
  /** Rendered value. */
  value: VNodeChild
  /** Optional icon rendered to the left of the label. */
  icon?: VNodeChild
}

/** Props for {@link DefinitionList}. */
export interface DefinitionListProps {
  /** Fields to render. */
  fields: DefinitionField[]
  /** Grid column count. Defaults to `1`. */
  columns?: 1 | 2 | 3
  /** Extra classes. */
  className?: string
}

/** Props for {@link InfoCard}. */
export interface InfoCardProps {
  /** Card heading. Passed as a prop or as the same-named slot — both work. */
  title?: VNodeChild
  /** Optional leading icon. Passed as a prop or as the same-named slot. */
  icon?: VNodeChild
  /** Optional right-side header actions. Passed as a prop or as the same-named slot. */
  actions?: VNodeChild
  /** Structured fields to display. */
  fields: DefinitionField[]
  /**
   * Grid column count — `1` stacks labels above values, `2+` puts labels beside
   * values. Defaults to `1`.
   */
  columns?: 1 | 2 | 3
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
