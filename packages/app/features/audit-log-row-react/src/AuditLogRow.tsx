import type { JSX, ReactNode } from 'react'

import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Shape of a single audit / activity log entry displayed by AuditLogRow. */
export interface AuditLogEntry {
  id: string
  /** Actor name or id. */
  actor: ReactNode
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: ReactNode
  /** Target object / record. */
  target?: ReactNode
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
  timestamp: ReactNode
  /** Optional summary field for delta display — old + new values. */
  oldValue?: ReactNode
  newValue?: ReactNode
  /** Environment / source badge. */
  environment?: ReactNode
  /** Optional trace or correlation id. */
  traceId?: ReactNode
}

/** Props for {@link AuditLogRow}. */
export interface AuditLogRowProps {
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
 * @param props - Component props (see {@link AuditLogRowProps}).
 */
export function AuditLogRow({ entry, onClick, className }: AuditLogRowProps): JSX.Element {
  const cm = getClassMap()
  const { actor, action, target, timestamp, oldValue, newValue, environment, traceId } = entry
  const showDelta = oldValue !== undefined || newValue !== undefined
  // When the row is interactive, promote the <div> to a real button in the
  // a11y tree: role/tabIndex make it focusable and Enter/Space activate it,
  // matching native button keyboard semantics.
  const handleKeyDown = onClick
    ? (event: KitKeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }
    : undefined
  return (
    <Pressable
      as="div"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-mol-id="audit-log-row"
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <Box as="div" className={cm.cn(cm.textSize('sm'))}>
          <Box as="span" className={cm.fontWeight('semibold')}>
            {actor}
          </Box>{' '}
          <Box as="span">{action}</Box>{' '}
          {target && (
            <Box as="span" className={cm.fontWeight('medium')}>
              {target}
            </Box>
          )}
          <Box as="span" className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>
            · {timestamp}
          </Box>
          {environment && (
            <Box
              as="span"
              className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              [{environment}]
            </Box>
          )}
        </Box>
        {showDelta && (
          <Box
            as="div"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
          >
            {oldValue !== undefined && (
              <Box as="span" style={{ opacity: 0.7 }} webStyle={{ textDecoration: 'line-through' }}>
                {oldValue}
              </Box>
            )}
            {oldValue !== undefined && newValue !== undefined && (
              <Text as="span" aria-hidden>
                →
              </Text>
            )}
            {newValue !== undefined && <Box as="span">{newValue}</Box>}
          </Box>
        )}
        {traceId && (
          <Box as="span" className={cm.textSize('xs')}>
            {traceId}
          </Box>
        )}
      </Box>
    </Pressable>
  )
}
