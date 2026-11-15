/**
 * Types for the Svelte info display components.
 *
 * The same names `@molecule/app-info-display-react` exports; node-valued
 * fields take Svelte snippets (or plain text) instead of React nodes.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A node-valued field: a snippet (the caller's slot), or plain text. */
type NodeProp = Snippet | string

/** A single label/value pair rendered inside a DefinitionList. */
export interface DefinitionField {
  /** Label content, shown beside the field's icon. */
  label: NodeProp
  /** Rendered value. */
  value: NodeProp
  /** Optional icon rendered to the left of the label. */
  icon?: NodeProp
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
  /** Card heading. */
  title: NodeProp
  /** Optional leading icon. */
  icon?: NodeProp
  /** Optional right-side header actions. */
  actions?: NodeProp
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
