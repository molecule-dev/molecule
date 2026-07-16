import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/** A single action item rendered as a button (or linked button) in the toolbar. */
export interface ToolbarAction {
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** Visual variant — defaults to 'ghost'. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Optional color variant for emphasis. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}

export interface EditorToolbarProps {
  /** Document title. */
  title: ReactNode
  /** Optional version / status badge next to the title. */
  badge?: ReactNode
  /** Primary actions (e.g. Save, Publish) rendered on the right. */
  primaryActions?: ToolbarAction[]
  /** Secondary icon-only actions (theme, settings, help). */
  secondaryActions?: ToolbarAction[]
  /** Optional leading slot (back button, breadcrumb). */
  leading?: ReactNode
  /** Sticky top — defaults to true. */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Renders a single toolbar action as a Button, optionally wrapped in an anchor.
 * @param a
 * @param key
 */
function renderAction(a: ToolbarAction, key: string): JSX.Element {
  const btn = (
    <Button
      key={key}
      variant={a.variant ?? 'ghost'}
      color={a.color}
      onClick={a.onClick}
      disabled={a.disabled}
    >
      {a.icon}
      {a.label && <span>{a.label}</span>}
    </Button>
  )
  return a.href ? (
    <a key={key} href={a.href}>
      {btn}
    </a>
  ) : (
    btn
  )
}

/**
 * Editor-page top toolbar — title + optional version/status badge +
 * primary actions (Save, Publish, Test) + secondary icon actions.
 *
 * Pair with `<EditorLayout>` from `@molecule/app-editor-layout-react` as
 * the `topBar` slot.
 * @param props - Component props (see {@link EditorToolbarProps}).
 */
export function EditorToolbar({
  title,
  badge,
  primaryActions = [],
  secondaryActions = [],
  leading,
  sticky = true,
  className,
  dataMolId,
}: EditorToolbarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        className,
      )}
      style={sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {leading}
        <h1 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h1>
        {badge}
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {primaryActions.map((a) => renderAction(a, `p-${a.id}`))}
        {secondaryActions.length > 0 && primaryActions.length > 0 && (
          <span
            aria-hidden
            style={{ width: 1, height: 24, opacity: 0.2, background: 'currentColor' }}
          />
        )}
        {secondaryActions.map((a) => renderAction(a, `s-${a.id}`))}
      </div>
    </div>
  )
}
