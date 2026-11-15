/**
 * Types for the Angular info display components.
 *
 * The same names `@molecule/app-info-display-react` exports; node-valued
 * fields arrive as `TemplateRef`s (an input cannot carry a node) or as text,
 * and node-valued props are projected content.
 *
 * @module
 */

/** A single label/value pair rendered inside a DefinitionList. */
export interface DefinitionField {
  /** Label content: a `TemplateRef` or plain text, shown beside the field's icon. */
  label: unknown
  /** Rendered value: a `TemplateRef` or plain text. */
  value: unknown
  /** Optional icon rendered to the left of the label: a `TemplateRef` or plain text. */
  icon?: unknown
}

/** Props accepted by the {@link DefinitionList} component. */
export interface DefinitionListProps {
  /** Fields to render. */
  fields: DefinitionField[]
  /** Grid column count. Defaults to `1`. */
  columns?: 1 | 2 | 3
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link InfoCard} — the same props
 * `@molecule/app-info-display-react` accepts. Node props (`title`, `icon`,
 * `actions`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them in the host template, not as values.
 */
export interface InfoCardProps {
  /** Card heading, projected as `[slot=title]` content. */
  title?: unknown
  /** Optional leading icon, projected as `[slot=icon]` content. */
  icon?: unknown
  /** Optional right-side header actions, projected as `[slot=actions]` content. */
  actions?: unknown
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
