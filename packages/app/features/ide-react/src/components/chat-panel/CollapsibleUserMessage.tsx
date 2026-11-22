/**
 * CollapsibleUserMessage — height-limited user message with expand toggle.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-react'

// ---------------------------------------------------------------------------
// CollapsibleUserMessage — height-limited user message with expand toggle
// ---------------------------------------------------------------------------

/**
 * Renders user message content with a max height and a chevron-down expand button
 * when the content overflows. Similar to the compaction summary expand pattern.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered collapsible message element.
 */
export function CollapsibleUserMessage({
  content,
  isLight,
}: {
  content: string
  isLight: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const innerRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = innerRef.current
    if (el) setOverflows(el.scrollHeight > USER_MSG_COLLAPSE_HEIGHT)
  }, [content])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={innerRef}
        style={{
          maxHeight: expanded ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
      {overflows && !expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: isLight
              ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
              : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))',
            pointerEvents: 'none',
          }}
        />
      )}
      {overflows && (
        <button
          /* mol-bespoke-button: overflow disclosure strip — full-width chevron that expands a clipped card */
          type="button"
          // The chevron is the strip's only content, so the name comes from aria-label.
          aria-label={
            expanded
              ? t('ide.chat.collapseMessage', undefined, { defaultValue: 'Show less' })
              : t('ide.chat.expandMessage', undefined, { defaultValue: 'Show more' })
          }
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isLight
              ? 'rgba(99,102,241,0.12)'
              : 'rgba(99,102,241,0.18)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '2px 0',
            margin: '2px 0 0',
            background: 'transparent',
            border: 'none',
            borderRadius: '0 0 4px 4px',
            cursor: 'pointer',
            color: 'inherit',
            transition: 'background 100ms',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            style={{
              display: 'block',
              opacity: 0.5,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }}
          >
            <polyline
              points="4,6 8,10 12,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
