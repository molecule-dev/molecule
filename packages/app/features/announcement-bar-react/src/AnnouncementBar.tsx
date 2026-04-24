import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'

interface AnnouncementBarProps {
  /** Primary message. */
  children: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional call-to-action (link or button). */
  action?: { label: ReactNode; href?: string; onClick?: () => void }
  /** Semantic kind — affects default styling. Defaults to `'info'`. */
  kind?: AnnouncementKind
  /** Show a dismiss (×) button. Defaults to true. */
  dismissible?: boolean
  /** Called when the bar is dismissed. */
  onDismiss?: () => void
  /** Controlled visibility — when provided, overrides internal state. */
  visible?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Persistent announcement banner — product updates, promos, outage
 * notices, feature callouts. Different from `<Toast>` in being
 * long-lived and prominent (top-of-page), and from `<Alert>` in
 * including an action slot + dismiss.
 * @param root0
 * @param root0.children
 * @param root0.icon
 * @param root0.action
 * @param root0.kind
 * @param root0.dismissible
 * @param root0.onDismiss
 * @param root0.visible
 * @param root0.className
 * @param root0.dataMolId
 */
export function AnnouncementBar({
  children,
  icon,
  action,
  kind = 'info',
  dismissible = true,
  onDismiss,
  visible,
  className,
  dataMolId,
}: AnnouncementBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internalVisible, setInternalVisible] = useState(true)
  const isVisible = visible ?? internalVisible
  if (!isVisible) return null

  /**
   *
   */
  function dismiss() {
    if (visible === undefined) setInternalVisible(false)
    onDismiss?.()
  }

  const actionNode = action ? (
    action.href ? (
      <a
        href={action.href}
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}
      >
        {action.label}
      </a>
    ) : (
      <button
        type="button"
        onClick={action.onClick}
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}
      >
        {action.label}
      </button>
    )
  ) : null

  return (
    <div
      role="status"
      data-mol-id={dataMolId}
      data-kind={kind}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        className,
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {icon}
        <span className={cm.textSize('sm')}>{children}</span>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {actionNode}
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('announcement.dismiss', {}, { defaultValue: 'Dismiss' })}
            className={cm.cn(cm.w(6), cm.h(6), cm.flex({ align: 'center', justify: 'center' }))}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
