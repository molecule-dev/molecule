import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CollapsibleSectionProps {
  /** Section heading — rendered as an expand-toggle button. */
  title: ReactNode
  /** Body to show when expanded. */
  children: ReactNode
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header. */
  badge?: ReactNode
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}

/**
 * Expandable section with a clickable heading. Lighter-weight than
 * `<Accordion>` — renders a single toggle, not a group of panels.
 *
 * Typical uses: "Key concepts" in lesson pages, filter groups in a
 * sidebar, FAQ rows, disclosure in settings.
 * @param root0
 * @param root0.title
 * @param root0.children
 * @param root0.expanded
 * @param root0.defaultExpanded
 * @param root0.onExpandedChange
 * @param root0.badge
 * @param root0.actions
 * @param root0.level
 * @param root0.className
 */
export function CollapsibleSection({
  title,
  children,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  badge,
  actions,
  level = 3,
  className,
}: CollapsibleSectionProps) {
  const cm = getClassMap()
  const [internal, setInternal] = useState(defaultExpanded)
  const isOpen = expanded ?? internal
  /**
   *
   */
  function toggle() {
    const next = !isOpen
    if (expanded === undefined) setInternal(next)
    onExpandedChange?.(next)
  }
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return (
    <section className={cm.cn(cm.stack(2), className)}>
      <Heading>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.w('full'),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span aria-hidden>{isOpen ? '▾' : '▸'}</span>
            <span>{title}</span>
            {badge}
          </span>
          {actions && <span onClick={(e) => e.stopPropagation()}>{actions}</span>}
        </button>
      </Heading>
      {isOpen && <div>{children}</div>}
    </section>
  )
}

interface ShowMoreProps {
  /** Items before truncation. */
  children: ReactNode[]
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}

/**
 * "Show N more" / "Show less" toggle. Simpler than `<CollapsibleSection>`
 * when you just want to truncate a long list.
 * @param root0
 * @param root0.children
 * @param root0.initialCount
 * @param root0.moreKey
 * @param root0.lessKey
 * @param root0.className
 */
export function ShowMore({
  children,
  initialCount = 3,
  moreKey = 'showMore.more',
  lessKey = 'showMore.less',
  className,
}: ShowMoreProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? children : children.slice(0, initialCount)
  const remaining = Math.max(0, children.length - initialCount)
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {visible}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}
        >
          {expanded
            ? t(lessKey, {}, { defaultValue: 'Show less' })
            : t(moreKey, { remaining }, { defaultValue: `Show ${remaining} more` })}
        </button>
      )}
    </div>
  )
}
