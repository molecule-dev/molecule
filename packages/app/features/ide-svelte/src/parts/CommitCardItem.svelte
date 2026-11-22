<!--
  Expandable commit card for the chat timeline.

  Svelte counterpart of `@molecule/app-ide-react`'s `CommitCardItem` (see that
  file for the design notes): the same props (React names), the same DOM for
  the same input, the same callbacks. The label renders the commit message with
  any trailing `Co-authored-by:` attribution trailer STRIPPED through the
  shared `stripCommitCoauthorTrailer` — the endpoint returns the full git
  message, and that attribution is noise the user never wrote. Clicking the row
  discloses the committed files; a done commit with a hash offers revert/redo
  (as a sibling of the row button, never nested inside it), when the host wires
  `onRevert`.

  Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
  writes, applied as CSS text through the CSSOM so their serialized form
  matches React's (a unitless radius becomes pixels, and `flex: 1` serializes
  the way the CSSOM does). The revert control's own hover keeps it revealed
  (its `background`/`opacity` writes, then the state that renders the resting
  opacity) and its resting opacity includes the row hover, exactly as React
  computes it. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type * as panels from '@molecule/app-ide-panel-logic/panels'

  /** Re-exported from the shared, framework-neutral contract. */
  export type CommitCard = panels.CommitCard

  /** Props for `CommitCardItem` — the React prop names, React's own contract. */
  export interface CommitCardItemProps {
    /** The commit to render. */
    card: CommitCard
    /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
    onRevert?: (hash: string) => Promise<string | undefined>
  }

  /** The monospace figure stack React writes for the commit message. */
  const MONO_FONT = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

  /** The merged revert control's hover background (React's imperative write). */
  const REVERT_HOVER_BACKGROUND = 'rgba(128,128,128,0.2)'
</script>

<script lang="ts">
  import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
  import { stripCommitCoauthorTrailer } from '@molecule/app-ide-panel-logic/panels'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useCoarsePointer } from '../hooks/useViewport.js'
  import { styleText } from './inline-style.js'

  let { card, onRevert }: CommitCardItemProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()
  const isCoarse = useCoarsePointer()

  let expanded = $state(false)
  let hovered = $state(false)
  let reverting = $state(false)
  // Each revert produces a new hash that can itself be reverted.
  let reverted = $state(false)
  let revertHash = $state<string | undefined>(undefined)
  // The revert control's own hover, kept separate from the row's: leaving the
  // row would otherwise hide the control under the pointer on its way to it.
  let revertHovered = $state(false)

  const hasFiles = $derived(card.files.length > 0)
  const isRunning = $derived(card.status === 'running')
  const isDone = $derived(card.status === 'done')
  const canRevert = $derived(isDone && !!(reverted ? revertHash : card.hash) && !!onRevert)
  const dotColor = $derived(isRunning ? '#e8a000' : card.status === 'error' ? '#f04040' : '#4070e0')
  const labelWhiteSpace = $derived(expanded ? 'normal' : 'nowrap')

  /** The card's single timeline rhythm: a bottom margin only. */
  const rootStyle = `margin-bottom: ${TIMELINE_ITEM_GAP}px`

  /** The row wrapper beside which the revert control sits. */
  const rowStyle = 'margin-bottom: 4px; display: flex; align-items: flex-start'

  /** The row disclosure button. */
  const rowButtonStyle = $derived(
    [
      'display: flex',
      'align-items: flex-start',
      'gap: 6px',
      'background: none',
      'border: none',
      `cursor: ${hasFiles ? 'pointer' : 'default'}`,
      'color: inherit',
      'text-align: left',
      'padding: 2px 0px',
      'width: 100%',
      'min-width: 0px',
    ].join('; '),
  )

  /** The status dot's geometry. */
  const dotStyle = 'flex-shrink: 0; margin-top: 5px'

  /** The label wrapper's truncation (single line unless expanded). */
  const labelWrapStyle = $derived(
    `flex: 1; min-width: 0px; overflow: hidden; text-overflow: ellipsis; white-space: ${labelWhiteSpace}`,
  )

  /** The label's inner row. */
  const labelRowStyle = 'font-size: 13px; display: flex; align-items: center; gap: 5px'

  /** The commit message's monospace figure. */
  const messageStyle = `font-family: ${MONO_FONT}; font-size: inherit`

  /** The collapsed file-count line. */
  const countStyle = 'display: block; margin-top: 1px'

  /** The disclosure chevron (rotates when expanded, dims until hovered). */
  const chevronStyle = $derived(
    [
      'display: block',
      'flex-shrink: 0',
      'margin-top: 3px',
      `transform: rotate(${expanded ? 90 : 0}deg)`,
      'transition: transform 150ms, opacity 100ms',
      `opacity: ${hovered ? 0.85 : 0.35}`,
    ].join('; '),
  )

  /**
   * The revert control's resting opacity (React's rendered style value).
   *
   * React applies this only when the value changes, so an imperative write (the
   * control's own hover) survives while the value stays put; Svelte's
   * `style:opacity` directive diffs the same way.
   *
   * @returns The opacity React's style prop renders.
   */
  const revertOpacity = $derived(reverting ? 0.3 : hovered || $isCoarse || revertHovered ? 0.6 : 0)

  /** The icon-only revert control's layout (React writes the rest imperatively). */
  const revertStyle = $derived.by((): string => {
    const parts = [
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'align-self: flex-start',
      // Touch: hover cannot reveal it, so it rests visible at 0.6 with a 32px
      // hit box (the floor for these dense inline rows).
      `width: ${$isCoarse ? 32 : 20}px`,
      `height: ${$isCoarse ? 32 : 20}px`,
      'border-radius: 4px',
      'flex-shrink: 0',
      `cursor: ${reverting ? 'wait' : 'pointer'}`,
      'transition: opacity 100ms, background 100ms',
    ]
    return parts.join('; ')
  })

  /** The expanded file list's panel. */
  const fileListStyle =
    'margin-left: 14px; margin-top: 4px; margin-bottom: 4px; border-radius: 4px; overflow-x: auto; padding: 6px 10px'

  /** The file list's monospace body. */
  const fileListBodyStyle = `font-family: ${MONO_FONT}; font-size: 11px; line-height: 1.6`

  /** Flips the file-list disclosure (React's `setExpanded((e) => !e)`). */
  function toggleExpanded(): void {
    expanded = !expanded
  }

  /**
   * Reverts (or re-applies) the commit, then offers the reverse operation.
   *
   * @param event - The click or key event that asked for it.
   */
  async function handleRevert(event: Event): Promise<void> {
    event.stopPropagation()
    if (!canRevert || reverting) return
    const hashToRevert = reverted ? revertHash : card.hash
    if (!hashToRevert || !onRevert) return
    reverting = true
    try {
      const newHash = await onRevert(hashToRevert)
      if (newHash) {
        // Both undoing and re-applying store the new hash so the control can
        // undo again (the label flips with `reverted`).
        revertHash = newHash
        reverted = !reverted
      }
    } finally {
      reverting = false
    }
  }
</script>

<div use:styleText={rootStyle}>
  <!-- The row button and its revert control are SIBLINGS: a control cannot
       sit inside the row button (axe nested-interactive). -->
  <div use:styleText={rowStyle}>
    <button
      type="button"
      onclick={hasFiles ? toggleExpanded : undefined}
      onmouseenter={() => (hovered = true)}
      onmouseleave={() => (hovered = false)}
      use:styleText={rowButtonStyle}
    >
      <!-- Status dot — orange while running, red on error, blue when done -->
      <svg width="10" height="10" viewBox="0 0 10 10" use:styleText={dotStyle}>
        <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35"></circle>
        <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} stroke-width="2"></circle>
      </svg>

      <!-- Label — single truncated line unless expanded -->
      <span use:styleText={labelWrapStyle}>
        <span use:styleText={labelRowStyle}>
          <span use:styleText={labelWrapStyle}>
            {#if isRunning}
              {t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })}
            {:else}
              {t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })}
              <code use:styleText={messageStyle}>{stripCommitCoauthorTrailer(card.message)}</code>
            {/if}
          </span>
        </span>
        {#if hasFiles && !expanded}
          <span class={cm.cn(cm.textMuted, cm.textSize('xs'))} use:styleText={countStyle}>
            {t(
              'ide.chat.fileCount',
              { count: card.files.length },
              { defaultValue: '{{count}} files' },
            )}
          </span>
        {/if}
      </span>

      <!-- Expand chevron -->
      {#if hasFiles}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          use:styleText={chevronStyle}
        >
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></polyline>
        </svg>
      {/if}
    </button>
    {#if canRevert}
      <!-- mol-bespoke-button: icon-only revert affordance — 20px (32px coarse) hit
           box beside a dense commit row, not inside its button, no label -->
      <span
        role="button"
        tabindex="0"
        title={reverted
          ? t('ide.chat.redoCommit', undefined, { defaultValue: 'Re-apply this commit' })
          : t('ide.chat.revertCommit', undefined, { defaultValue: 'Revert this commit' })}
        onclick={(event) => void handleRevert(event)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleRevert(event)
          }
        }}
        onmouseenter={(event) => {
          event.currentTarget.style.opacity = '1'
          event.currentTarget.style.background = REVERT_HOVER_BACKGROUND
          revertHovered = true
        }}
        onmouseleave={(event) => {
          event.currentTarget.style.opacity = ''
          event.currentTarget.style.background = 'transparent'
          revertHovered = false
        }}
        use:styleText={revertStyle}
        style:opacity={revertOpacity}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
        >
          {#if reverted}
            <path
              d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z"
            ></path>
          {:else}
            <path
              d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"
            ></path>
          {/if}
        </svg>
      </span>
    {/if}

    <!-- Expanded file list: inside the row, where React renders it -->
    {#if expanded && hasFiles}
      <div class={cm.surfaceSecondary} use:styleText={fileListStyle}>
        <div use:styleText={fileListBodyStyle}>
          {#each card.files as file, index (index)}
            <div>{file}</div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
