/**
 * CommitCardItem — expandable tool-call-style card for a commit.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useState } from 'react'

import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { stripCommitCoauthorTrailer } from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../../hooks/useViewport.js'

// CommitCardItem — expandable tool-call-style card for commits
// ---------------------------------------------------------------------------

/**
 * Expandable tool-call-style card displaying a commit with its files.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered commit card element.
 */
export function CommitCardItem({
  card,
  onRevert,
}: {
  card: CommitCard
  onRevert?: (hash: string) => Promise<string | undefined>
}): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const isCoarse = useCoarsePointer()
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  // Track undo/redo state: each revert produces a new hash that can itself be reverted
  const [isReverted, setIsReverted] = useState(false)
  const [revertHash, setRevertHash] = useState<string | undefined>()
  // The revert control is a SIBLING of the row button, so the row's hover no
  // longer covers the last pixel of travel to it — its own hover keeps it
  // revealed (without this, leaving the row would hide it under the pointer).
  const [isRevertHovered, setIsRevertHovered] = useState(false)
  const hasFiles = card.files.length > 0
  const isRunning = card.status === 'running'
  const isDone = card.status === 'done'
  const canRevert = isDone && (isReverted ? revertHash : card.hash) && onRevert
  const dotColor = isRunning ? '#e8a000' : card.status === 'error' ? '#f04040' : '#4070e0'

  const handleRevert = useCallback(
    async (e: Pick<React.SyntheticEvent, 'stopPropagation'>) => {
      e.stopPropagation()
      if (!canRevert || isReverting) return
      const hashToRevert = isReverted ? revertHash! : card.hash!
      setIsReverting(true)
      try {
        const newHash = await onRevert(hashToRevert)
        if (newHash) {
          if (isReverted) {
            // Re-applying: store the new hash so we can undo again
            setRevertHash(newHash)
          } else {
            // Undoing: store the revert commit hash so we can redo
            setRevertHash(newHash)
          }
          setIsReverted((v) => !v)
        }
      } finally {
        setIsReverting(false)
      }
    },
    [canRevert, isReverting, isReverted, revertHash, card.hash, onRevert],
  )

  return (
    // One timeline rhythm: bottom margin only (see TIMELINE_ITEM_GAP).
    <div style={{ marginBottom: TIMELINE_ITEM_GAP }}>
      {/* The row button and its revert control are SIBLINGS: a control cannot
          sit inside the row button (axe nested-interactive). */}
      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start' }}>
        <button
          /* mol-bespoke-button: commit card header — expand/collapse disclosure for the commit's file list */
          type="button"
          onClick={hasFiles ? () => setExpanded((e) => !e) : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: hasFiles ? 'pointer' : 'default',
            color: 'inherit',
            textAlign: 'left',
            padding: '2px 0',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* Status dot — orange while running, red on error, blue when done */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{ flexShrink: 0, marginTop: '5px' }}
          >
            <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35" />
            <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} strokeWidth="2" />
          </svg>

          {/* Label — single truncated line unless expanded */}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: expanded ? 'normal' : 'nowrap',
            }}
          >
            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  // flex:1 so the message fills the row and pushes the revert icon to
                  // the right edge (directly left of the chevron), matching the
                  // tool-call cards instead of letting it hug the commit text.
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: expanded ? 'normal' : 'nowrap',
                }}
              >
                {isRunning ? (
                  t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
                ) : (
                  <>
                    {t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })}{' '}
                    <code
                      style={{
                        fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                        fontSize: 'inherit',
                      }}
                    >
                      {stripCommitCoauthorTrailer(card.message)}
                    </code>
                  </>
                )}
              </span>
            </span>
            {hasFiles && !expanded && (
              <span
                className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style={{ display: 'block', marginTop: '1px' }}
              >
                {t(
                  'ide.chat.fileCount',
                  { count: card.files.length },
                  { defaultValue: '{{count}} files' },
                )}
              </span>
            )}
          </span>

          {/* Expand chevron */}
          {hasFiles && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={{
                display: 'block',
                flexShrink: 0,
                marginTop: '3px',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered ? 0.85 : 0.35,
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
          )}
        </button>
        {canRevert && (
          <span
            /* mol-bespoke-button: icon-only revert affordance — 20px (32px coarse) hit
                   box beside a dense commit row, not inside its button, no label */
            role="button"
            tabIndex={0}
            title={
              isReverted
                ? t('ide.chat.redoCommit', undefined, {
                    defaultValue: 'Re-apply this commit',
                  })
                : t('ide.chat.revertCommit', undefined, {
                    defaultValue: 'Revert this commit',
                  })
            }
            onClick={handleRevert}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleRevert(e)
              }
            }}
            onMouseEnter={(e) => {
              setIsRevertHovered(true)
              e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              setIsRevertHovered(false)
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.opacity = ''
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start',
              // Touch: hover can't reveal it, so it rests visible at 0.6 and
              // gets a 32px hit box (the floor for these dense inline rows).
              width: isCoarse ? 32 : 20,
              height: isCoarse ? 32 : 20,
              borderRadius: 4,
              flexShrink: 0,
              cursor: isReverting ? 'wait' : 'pointer',
              opacity: isReverting ? 0.3 : isHovered || isCoarse || isRevertHovered ? 0.6 : 0,
              transition: 'opacity 100ms, background 100ms',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
            >
              {isReverted ? (
                <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
              ) : (
                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
              )}
            </svg>
          </span>
        )}

        {/* Expanded file list */}
        {expanded && hasFiles && (
          <div
            className={cm.surfaceSecondary}
            style={{
              marginLeft: '14px',
              marginTop: '4px',
              marginBottom: '4px',
              borderRadius: '4px',
              overflowX: 'auto',
              padding: '6px 10px',
            }}
          >
            <div
              style={{
                fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                fontSize: '11px',
                lineHeight: 1.6,
              }}
            >
              {card.files.map((f) => {
                const path = typeof f === 'string' ? f : (f as { path: string }).path
                return <div key={path}>{path}</div>
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
