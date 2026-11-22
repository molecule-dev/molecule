/**
 * ThinkingBlock — the collapsible AI thinking/reasoning block.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import { formatThinkingDuration } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Collapsible block for displaying AI thinking/reasoning content.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered thinking block element.
 */
export function ThinkingBlock({
  content,
  durationMs,
  isStreaming,
}: {
  content: string
  durationMs?: number
  isStreaming?: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const contentRef = useRef<HTMLDivElement>(null)
  // Auto-expand while streaming so the user can see thinking in real-time.
  // Once streaming ends, the user's manual toggle takes over.
  const [manualToggle, setManualToggle] = useState<boolean | null>(null)
  const open = manualToggle ?? isStreaming === true

  // Auto-scroll to the bottom as new thinking content streams in.
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [open, content])

  const label = isStreaming
    ? t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
    : durationMs != null
      ? formatThinkingDuration(t, durationMs)
      : t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })

  return (
    <div style={{ marginBottom: '6px' }}>
      <button
        /* mol-bespoke-button: thinking disclosure toggle — chevron + muted label, a summary/details affordance with no button frame */
        type="button"
        onClick={() => setManualToggle((v) => !(v ?? isStreaming === true))}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: '2px 0',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            display: 'block',
            flexShrink: 0,
            opacity: 0.5,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        >
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>{label}</span>
      </button>
      {open && (
        <div
          ref={contentRef}
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{
            paddingLeft: '16px',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            fontStyle: 'italic',
            opacity: 0.7,
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
