/**
 * Tool call display card with collapsible details.
 *
 * @module
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { ToolCallCardProps } from '../types.js'

/**
 * Collapsible card displaying a tool call's name, status, input, and output.
 * @param root0 - The component props.
 * @param root0.name - The name of the tool that was called.
 * @param root0.input - The input data sent to the tool.
 * @param root0.output - The output data returned by the tool.
 * @param root0.status - The current execution status of the tool call.
 * @param root0.className - Optional CSS class name for the card.
 * @returns The rendered tool call card element.
 */
export function ToolCallCard({
  name,
  input,
  output,
  status,
  className,
}: ToolCallCardProps): JSX.Element {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)

  const statusIcon =
    status === 'running' || status === 'pending'
      ? '\u25CB'
      : status === 'done'
        ? '\u2713'
        : '\u2717'
  const statusColorClass =
    status === 'running' || status === 'pending'
      ? cm.textWarning
      : status === 'done'
        ? cm.textSuccess
        : cm.textError

  return (
    <div
      className={cm.cn(cm.sp('my', 2), cm.borderAll, className)}
      style={{ borderRadius: '6px', overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cm.cn(
          cm.w('full'),
          cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.surfaceSecondary,
          cm.cursorPointer,
        )}
        style={{
          border: 'none',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <span className={cm.flex({ direction: 'row', align: 'center', gap: 'sm' })}>
          <span className={statusColorClass}>{statusIcon}</span>
          <span className={cm.fontWeight('medium')}>{name}</span>
          {status === 'running' && (
            <span className={cm.textMuted} style={{ animation: 'pulse 2s infinite' }}>
              {t('ide.toolCall.running')}
            </span>
          )}
        </span>
        <span
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 150ms',
          }}
        >
          {'\u25BC'}
        </span>
      </button>
      {expanded && (
        <div className={cm.cn(cm.sp('p', 3), cm.textSize('xs'), cm.surface, cm.borderT)}>
          {input !== undefined && (
            <div className={cm.sp('mb', 2)}>
              <div className={cm.cn(cm.textMuted, cm.fontWeight('medium'), cm.sp('mb', 1))}>
                {t('ide.toolCall.input')}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <div className={cm.cn(cm.textMuted, cm.fontWeight('medium'), cm.sp('mb', 1))}>
                {t('ide.toolCall.output')}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

ToolCallCard.displayName = 'ToolCallCard'
