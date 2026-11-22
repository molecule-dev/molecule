/**
 * Expandable commit card for the chat timeline.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `CommitCardItem` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The label renders the commit message
 * with any trailing `Co-authored-by:` attribution trailer STRIPPED through the
 * shared `stripCommitCoauthorTrailer` — the endpoint returns the full git
 * message, and that attribution is noise the user never wrote. Clicking the row
 * discloses the committed files; a done commit with a hash offers revert/redo
 * (as a sibling of the row button, never nested inside it), when the host wires
 * `onRevert`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes (status dot, row geometry, disclosure), written in Solid's kebab-case
 * style form with explicit `px` units (React's camelCase keys, where a unitless
 * number means pixels). The revert control's hover writes its own background
 * and opacity on the element the way React's `onMouseEnter`/`onMouseLeave`
 * imperatively do. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'

import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { stripCommitCoauthorTrailer } from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'

// Re-exported for the callers (and tests) that name a commit card by this
// module; the type itself is the shared, framework-neutral one.
export type { CommitCard }

/** Props for {@link CommitCardItem} — the React prop names, React's own contract. */
export interface CommitCardItemProps {
  /** The commit to render. */
  card: CommitCard
  /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
  onRevert?: (hash: string) => Promise<string | undefined>
}

/**
 * Renders the commit's full message, monospaced, under the label.
 *
 * @returns The message's inline style fields.
 */
function messageStyle(): Record<string, string> {
  return {
    'font-family': '"SF Mono", Menlo, Consolas, "Courier New", monospace',
    'font-size': 'inherit',
  }
}

/**
 * Expandable tool-call-style card displaying a commit with its files.
 *
 * @param props - See {@link CommitCardItemProps}.
 * @returns The rendered commit card.
 */
export function CommitCardItem(props: CommitCardItemProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const isCoarse = useCoarsePointer()
  const [expanded, setExpanded] = createSignal(false)
  const [isHovered, setIsHovered] = createSignal(false)
  const [isReverting, setIsReverting] = createSignal(false)
  // Track undo/redo state: each revert produces a new hash that can itself be reverted
  const [isReverted, setIsReverted] = createSignal(false)
  const [revertHash, setRevertHash] = createSignal<string | undefined>()
  // The revert control is a SIBLING of the row button, so the row's hover no
  // longer covers the last pixel of travel to it — its own hover keeps it
  // revealed (without this, leaving the row would hide it under the pointer).
  const [isRevertHovered, setIsRevertHovered] = createSignal(false)

  const hasFiles = (): boolean => props.card.files.length > 0
  const isRunning = (): boolean => props.card.status === 'running'
  const isDone = (): boolean => props.card.status === 'done'
  const canRevert = (): boolean =>
    isDone() && !!(isReverted() ? revertHash() : props.card.hash) && !!props.onRevert
  const dotColor = (): string =>
    isRunning() ? '#e8a000' : props.card.status === 'error' ? '#f04040' : '#4070e0'

  /**
   * Reverts (or re-applies) the commit, then offers the reverse operation.
   *
   * @param event - The click or key press that triggered the action.
   * @returns A promise that settles once the revert answered.
   */
  const handleRevert = async (event: Event): Promise<void> => {
    event.stopPropagation()
    if (!canRevert() || isReverting()) return
    const hashToRevert = isReverted() ? revertHash() : props.card.hash
    if (!hashToRevert || !props.onRevert) return
    setIsReverting(true)
    try {
      const newHash = await props.onRevert(hashToRevert)
      if (newHash) {
        // Both undoing and re-applying store the new hash so the control can
        // undo again (the label flips with `isReverted`).
        setRevertHash(newHash)
        setIsReverted((value) => !value)
      }
    } finally {
      setIsReverting(false)
    }
  }

  /**
   * The row button's inline style. Read through a call (not an inline object
   * literal) so every property is applied through the CSSOM at runtime, the way
   * React's `style` prop is — a static literal is hoisted into the template
   * attribute, where a shorthand like `background` round-trips differently
   * under jsdom.
   *
   * @returns The row button's inline style fields.
   */
  const rowButtonStyle = (): Record<string, string> => ({
    display: 'flex',
    'align-items': 'flex-start',
    gap: '6px',
    background: 'none',
    border: 'none',
    cursor: hasFiles() ? 'pointer' : 'default',
    color: 'inherit',
    'text-align': 'left',
    padding: '2px 0',
    width: '100%',
    'min-width': '0',
  })

  return (
    // One timeline rhythm: bottom margin only (see TIMELINE_ITEM_GAP).
    <div style={{ 'margin-bottom': `${TIMELINE_ITEM_GAP}px` }}>
      {/* The row button and its revert control are SIBLINGS: a control cannot
          sit inside the row button (axe nested-interactive). */}
      <div style={{ 'margin-bottom': '4px', display: 'flex', 'align-items': 'flex-start' }}>
        <button
          /* mol-bespoke-button: commit card header — expand/collapse disclosure for the commit's file list */
          type="button"
          onClick={() => {
            if (hasFiles()) setExpanded((value) => !value)
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={rowButtonStyle()}
        >
          {/* Status dot — orange while running, red on error, blue when done */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{ 'flex-shrink': '0', 'margin-top': '5px' }}
          >
            <circle cx="5" cy="5" r="3" fill={dotColor()} opacity="0.35" />
            <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor()} stroke-width="2" />
          </svg>

          {/* Label — single truncated line unless expanded */}
          <span
            style={{
              flex: '1',
              'min-width': '0',
              overflow: 'hidden',
              'text-overflow': 'ellipsis',
              'white-space': expanded() ? 'normal' : 'nowrap',
            }}
          >
            <span
              style={{
                'font-size': '13px',
                display: 'flex',
                'align-items': 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  // flex:1 so the message fills the row and pushes the revert icon to
                  // the right edge (directly left of the chevron), matching the
                  // tool-call cards instead of letting it hug the commit text.
                  flex: '1',
                  'min-width': '0',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': expanded() ? 'normal' : 'nowrap',
                }}
              >
                <Show
                  when={!isRunning()}
                  fallback={t('ide.chat.committing', undefined, {
                    defaultValue: 'Committing...',
                  })}
                >
                  {t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })}{' '}
                  <code style={messageStyle()}>
                    {stripCommitCoauthorTrailer(props.card.message)}
                  </code>
                </Show>
              </span>
            </span>
            <Show when={hasFiles() && !expanded()}>
              <span
                class={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style={{ display: 'block', 'margin-top': '1px' }}
              >
                {t(
                  'ide.chat.fileCount',
                  { count: props.card.files.length },
                  { defaultValue: '{{count}} files' },
                )}
              </span>
            </Show>
          </span>

          {/* Expand chevron */}
          <Show when={hasFiles()}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={{
                display: 'block',
                'flex-shrink': '0',
                'margin-top': '3px',
                transform: expanded() ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered() ? '0.85' : '0.35',
              }}
            >
              <polyline
                points="6,4 10,8 6,12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Show>
        </button>
        <Show when={canRevert()}>
          <span
            /* mol-bespoke-button: icon-only revert affordance — 20px (32px coarse) hit
                   box beside a dense commit row, not inside its button, no label */
            role="button"
            tabIndex={0}
            title={
              isReverted()
                ? t('ide.chat.redoCommit', undefined, {
                    defaultValue: 'Re-apply this commit',
                  })
                : t('ide.chat.revertCommit', undefined, {
                    defaultValue: 'Revert this commit',
                  })
            }
            onClick={(event) => void handleRevert(event)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                void handleRevert(event)
              }
            }}
            onMouseEnter={(event) => {
              // The imperative touches come first, then the hover signal: React's
              // state update re-renders AFTER its handler's style writes, so the
              // rendered opacity (0.6) is the one that survives.
              event.currentTarget.style.background = 'rgba(128,128,128,0.2)'
              event.currentTarget.style.opacity = '1'
              setIsRevertHovered(true)
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.opacity = ''
              setIsRevertHovered(false)
            }}
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              'align-self': 'flex-start',
              // Touch: hover can't reveal it, so it rests visible at 0.6 and
              // gets a 32px hit box (the floor for these dense inline rows).
              width: isCoarse() ? '32px' : '20px',
              height: isCoarse() ? '32px' : '20px',
              'border-radius': '4px',
              'flex-shrink': '0',
              cursor: isReverting() ? 'wait' : 'pointer',
              opacity: isReverting()
                ? '0.3'
                : isHovered() || isCoarse() || isRevertHovered()
                  ? '0.6'
                  : '0',
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
              <Show
                when={isReverted()}
                fallback={
                  <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
                }
              >
                <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
              </Show>
            </svg>
          </span>
        </Show>

        {/* Expanded file list */}
        <Show when={expanded() && hasFiles()}>
          <div
            class={cm.surfaceSecondary}
            style={{
              'margin-left': '14px',
              'margin-top': '4px',
              'margin-bottom': '4px',
              'border-radius': '4px',
              'overflow-x': 'auto',
              padding: '6px 10px',
            }}
          >
            <div
              style={{
                'font-family': '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                'font-size': '11px',
                'line-height': '1.6',
              }}
            >
              <For each={props.card.files}>{(file) => <div>{file}</div>}</For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
