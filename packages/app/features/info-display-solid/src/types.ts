/**
 * Types for the Solid info display components.
 *
 * The same names `@molecule/app-info-display-react` exports; node-valued
 * fields take Solid JSX values instead of React nodes.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single label/value pair rendered inside a DefinitionList. */
export interface DefinitionField {
  /** Label content (usually a translated string or JSX). */
  label: JSX.Element
  /** Rendered value. */
  value: JSX.Element
  /** Optional icon rendered to the left of the label. */
  icon?: JSX.Element
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
  title: JSX.Element
  /** Optional leading icon. */
  icon?: JSX.Element
  /** Optional right-side header actions. */
  actions?: JSX.Element
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
