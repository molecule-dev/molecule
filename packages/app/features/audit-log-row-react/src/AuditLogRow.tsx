import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface AuditLogEntry {
  id: string
  /** Actor name or id. */
  actor: ReactNode
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: ReactNode
  /** Target object / record. */
  target?: ReactNode
  /** ISO timestamp. */
  timestamp: ReactNode
  /** Optional summary field for delta display — old + new values. */
  oldValue?: ReactNode
  newValue?: ReactNode
  /** Environment / source badge. */
  environment?: ReactNode
  /** Optional trace or correlation id. */
  traceId?: ReactNode
}

interface AuditLogRowProps {
  entry: AuditLogEntry
  /** Called when the row is clicked. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * One row of an audit / activity / event log. Shape:
 * `[actor] [action] [target] · [timestamp]` with optional
 * `[old → new]` diff line and environment/trace metadata.
 * @param root0
 * @param root0.entry
 * @param root0.onClick
 * @param root0.className
 */
export function AuditLogRow({ entry, onClick, className }: AuditLogRowProps) {
  const cm = getClassMap()
  const { actor, action, target, timestamp, oldValue, newValue, environment, traceId } = entry
  const showDelta = oldValue !== undefined || newValue !== undefined
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div className={cm.cn(cm.textSize('sm'))}>
          <span className={cm.fontWeight('semibold')}>{actor}</span> <span>{action}</span>{' '}
          {target && <span className={cm.fontWeight('medium')}>{target}</span>}
          <span className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>· {timestamp}</span>
          {environment && (
            <span className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}>
              [{environment}]
            </span>
          )}
        </div>
        {showDelta && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}>
            {oldValue !== undefined && (
              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{oldValue}</span>
            )}
            {oldValue !== undefined && newValue !== undefined && <span aria-hidden>→</span>}
            {newValue !== undefined && <span>{newValue}</span>}
          </div>
        )}
        {traceId && <span className={cm.textSize('xs')}>{traceId}</span>}
      </div>
    </div>
  )
}
