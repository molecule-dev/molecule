/**
 * Types of `@molecule/app-empty-state-angular` — the Angular counterpart of
 * `@molecule/app-empty-state-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link EmptyState} — the same props
 * `@molecule/app-empty-state-react` accepts. Node props are an input (a string,
 * or a `TemplateRef` for a node value) or projected content: `icon`, `title`,
 * `description` and `action` are selected by `[slot=icon]`, `[slot=title]`,
 * `[slot=description]` and `[slot=action]`.
 */
export interface EmptyStateProps {
  /** Visual — an icon node as a `TemplateRef`, or `[slot=icon]` projected content. */
  icon?: unknown
  /** Primary heading for a general, unselected collection. */
  title?: unknown
  /** Supporting description shown below the heading. */
  description?: unknown
  /** Optional action for a general empty state. */
  action?: unknown
  /**
   * The selected view's translated message and required recovery element, kept
   * together so a filtered or personal list never reuses the whole
   * collection's empty message. Replaces `title`, `description` and `action`
   * when given.
   */
  view?: {
    /** The selected view's translated heading. */
    title: unknown
    /** The selected view's supporting description. */
    description?: unknown
    /** The selected view's recovery element — a `TemplateRef` holding a router link or a button. */
    action: unknown
  }
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string
}

/**
 * Props accepted by {@link CtaCard} — the same props
 * `@molecule/app-empty-state-react` accepts. Node props are an input (a string,
 * or a `TemplateRef` for a node value) or projected content: `eyebrow`,
 * `title`, `description`, `action` and `media` are selected by
 * `[slot=eyebrow]`, `[slot=title]`, `[slot=description]`, `[slot=action]` and
 * `[slot=media]`.
 */
export interface CtaCardProps {
  /** Optional small eyebrow line above the title — a string, a `TemplateRef`, or `[slot=eyebrow]`. */
  eyebrow?: unknown
  /** Primary heading — a string, a `TemplateRef`, or `[slot=title]`. */
  title?: unknown
  /** Supporting copy — a string, a `TemplateRef`, or `[slot=description]`. */
  description?: unknown
  /** Primary call-to-action — a string, a `TemplateRef`, or `[slot=action]`. */
  action?: unknown
  /** Optional visual / illustration — a `TemplateRef`, or `[slot=media]`. */
  media?: unknown
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}
