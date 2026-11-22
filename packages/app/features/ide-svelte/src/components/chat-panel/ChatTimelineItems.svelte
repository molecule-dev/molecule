<!--
  React's section "Every item renders inside its own boundary" (ChatPanel.tsx
  lines 5301–5589): the per-item dispatch of the timeline — each item kind to
  its row or card — and the live error banner that sits between the transcript
  and the persistent activity slot.

  Every item renders inside its own `ChatItemBoundary`: the timeline is built
  from model-authored data, so one malformed payload must cost one inline
  notice, never the whole IDE. The body is preceded by the item's own-line
  timestamp when the timeline's plan places one there (React's
  `withTimelineTimestamp`), and a body React renders as `null` (an unhandled
  future system-card variant) draws neither the body nor its line.

  View only: the state and the handlers come from the slices through `ctx`.
-->
<script lang="ts">
  import type { ChatMessage } from '@molecule/app-ai-chat'
  import {
    CHAT_CARD_ICON_SIZE,
    chatCardStyle,
    NOTICE_TONE,
    TIMELINE_ITEM_GAP,
  } from '@molecule/app-ide-panel-logic'
  import type { ChatTimelineItem, CommitCard } from '@molecule/app-ide-panel-logic/panels'
  import { tipText, upgradeContextFromError } from '@molecule/app-ide-panel-logic/panels'

  import CardSegment from '../../parts/CardSegment.svelte'
  import ChatItemBoundary from '../../parts/ChatItemBoundary.svelte'
  import CommitCardItem from '../../parts/CommitCardItem.svelte'
  import HelpCard from '../../parts/HelpCard.svelte'
  import { styleText } from '../../parts/inline-style.js'
  import MessageItem from '../../parts/MessageItem.svelte'
  import NoticeCard from '../../parts/NoticeCard.svelte'
  import ResourceLimitBanner from '../../parts/ResourceLimitBanner.svelte'
  import TipCard from '../../parts/TipCard.svelte'
  import ActivityCard from '../ActivityCard.svelte'
  import ChatTimestamp from '../ChatTimestamp.svelte'
  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /** What one timeline item's body is, once the dispatch has resolved it. */
  type BodyKind = 'commit' | 'activity' | 'tip' | 'system' | 'message-commit' | 'message' | 'none'

  /**
   * Resolves the body a timeline item renders, so the item's timestamp line is
   * skipped exactly when React's dispatch returns `null`.
   *
   * @param item - The timeline item.
   * @returns The body kind (`none` for an unhandled system-card variant).
   */
  function bodyKind(item: ChatTimelineItem): BodyKind {
    if (item.kind === 'commit') return 'commit'
    if (item.kind === 'activity') return 'activity'
    if (item.kind === 'tip') return 'tip'
    if (item.kind === 'system') {
      if (item.card.variant === 'help' || item.card.variant === 'skillsLoaded') return 'system'
      return item.card.variant === undefined ? 'system' : 'none'
    }
    return item.msg.commitRecord ? 'message-commit' : 'message'
  }

  /**
   * A timeline item's stable list key (React's `key`: the message id, else the
   * card id).
   *
   * @param item - The timeline item.
   * @returns Its key.
   */
  function itemKey(item: ChatTimelineItem): string {
    return item.kind === 'message' ? item.msg.id : item.card.id
  }

  /**
   * React's files normalization for a persisted commit record: a plain path, or
   * an object carrying its `path`.
   *
   * @param files - The record's file list.
   * @returns The file paths.
   */
  function recordFiles(files: readonly (string | { path: string })[]): string[] {
    return files.map((file) => (typeof file === 'string' ? file : file.path))
  }

  /**
   * React's persisted commit record as the card the timeline renders.
   *
   * @param msg - The message carrying the record.
   * @param record - The message's commit record.
   * @returns The commit card.
   */
  function persistedCommitCard(
    msg: ChatMessage,
    record: NonNullable<ChatMessage['commitRecord']>,
  ): CommitCard {
    return {
      id: msg.id,
      message: record.message,
      files: recordFiles(record.files),
      timestamp: msg.timestamp,
      status: 'done',
      hash: record.hash,
    }
  }

  /** The revert handler, omitted for a read-only viewer (React's `onRevert`). */
  const onRevert = $derived(ctx.props.canEdit === false ? undefined : ctx.git.handleRevertCommit)

  /** The reason a read-only viewer cannot skip a tool call (React's translated prop). */
  const skipToolCallReason = $derived(
    ctx.props.canEdit === false
      ? ctx.env.t('ide.chat.skipToolCallViewer', undefined, {
          defaultValue: 'Only editors can skip this.',
        })
      : null,
  )

  /** Whether the live error's anonymous limit is stale (the banner hides then). */
  const staleAnonymousLimit = $derived(ctx.timeline.staleAnonymousLimit)

  /** Whether the chat's error is a read-only viewer's access-denied refusal. */
  const isViewerAccessDenied = $derived(ctx.timeline.isViewerAccessDenied)

  /** Whether the brief view-only notice is showing. */
  const viewerDeniedFlash = $derived(ctx.timeline.viewerDeniedFlash)

  /** The live error text, or null. */
  const error = $derived(ctx.chat.error)

  /** The live error's limit metadata, or null. */
  const errorMeta = $derived(ctx.chat.errorMeta)

  /** The gold view-only notice's inline style (layout + the shared card chrome). */
  const viewerDeniedStyle = $derived.by((): string => {
    const { padding, borderRadius, border, background } = chatCardStyle(NOTICE_TONE.gold.accent)
    return [
      'display: flex',
      'align-items: flex-start',
      'gap: 8px',
      'margin-bottom: 8px',
      `padding: ${padding}`,
      `border-radius: ${borderRadius}px`,
      `border: ${border}`,
      `background: ${background}`,
      'line-height: 1.5',
    ].join('; ')
  })

  /** The view-only notice icon's inline style. */
  const viewerDeniedIconStyle = `flex-shrink: 0; margin-top: 1px; color: ${NOTICE_TONE.gold.accent}`

  /**
   * The clickable loaded-skills notice's inline style: plain text like the
   * build-phase notice — no border, fill or pill.
   */
  const skillsLoadedButtonStyle =
    'background: none; border: none; margin: 0px; padding: 6px 0px; font-family: inherit; cursor: pointer'

  /**
   * Underlines the loaded-skills notice while the pointer is over it — the only
   * clickability hint (React's `onMouseEnter`).
   *
   * @param event - The native mouse event.
   */
  function underlineSkillsLoaded(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.textDecoration = 'underline'
  }

  /**
   * Drops the loaded-skills underline when the pointer leaves (React's
   * `onMouseLeave`).
   *
   * @param event - The native mouse event.
   */
  function ununderlineSkillsLoaded(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.textDecoration = 'none'
  }
</script>

{#each ctx.timeline.renderedTimeline as item (itemKey(item))}
  <ChatItemBoundary onError={ctx.props.onRenderError}>
    {#snippet render()}
      {@const kind = bodyKind(item)}
      {@const line = kind === 'none' ? null : ctx.timeline.withTimelineTimestamp(item)}
      {#if line}
        <ChatTimestamp timestamp={line.timestamp} variant="line" align={line.align} />
      {/if}
      {#if item.kind === 'commit'}
        <CommitCardItem card={item.card} {onRevert} />
      {:else if item.kind === 'activity'}
        <ActivityCard activity={item.card.activity} onActivityClick={ctx.props.onActivityClick} />
      {:else if item.kind === 'tip'}
        <TipCard
          text={tipText(ctx.env.t, item.card.tip, { agentName: ctx.agentName })}
          accent={item.card.accent}
          icon={item.card.icon}
          onDismiss={() => ctx.tips.dismissTip(item.card.id)}
        />
      {:else if item.kind === 'system'}
        {#if item.card.variant === 'help'}
          {@const upgradeSection = ctx.props.buildHelpUpgradeSection?.()}
          <HelpCard
            isLight={ctx.env.isLight}
            agentName={ctx.agentName}
            productName={ctx.productName}
            upgradeLines={upgradeSection?.lines}
            upgradeAction={upgradeSection?.action ?? undefined}
          />
        {:else if item.card.variant === 'skillsLoaded'}
          <!-- A plain centered phase message that happens to be clickable;
               opening the /skills browser is exactly what typing /skills does. -->
          <div style="text-align: center; margin-bottom: {TIMELINE_ITEM_GAP}px">
            <!-- mol-bespoke-button: skills-loaded notice — deliberately a plain centered phase message that happens to be clickable; a button frame would make it shout -->
            <button
              type="button"
              data-mol-id="chat-skills-loaded"
              onclick={() => ctx.overlay.openPanelOverlay('skills')}
              class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
              use:styleText={skillsLoadedButtonStyle}
              onmouseenter={underlineSkillsLoaded}
              onmouseleave={ununderlineSkillsLoaded}
            >
              {item.card.text}
            </button>
          </div>
        {:else if item.card.variant !== undefined}
          <!-- Every rich variant is handled above; a future unhandled one renders
               nothing rather than being mis-rendered as a plain card. -->
        {:else}
          {@const tipTone =
            item.card.tone ?? (item.card.emphasized || item.card.action ? 'info' : null)}
          {#if tipTone}
            <NoticeCard
              tone={tipTone}
              text={item.card.text}
              content={item.card.content}
              action={item.card.action}
              icon={item.card.icon}
            />
          {:else}
            {@const isMultiLine = item.card.text.includes('\n')}
            <div
              class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
              use:styleText={`text-align: ${isMultiLine ? 'left' : 'center'}; padding: ${
                isMultiLine ? '8px 12px' : '6px 0'
              }; margin-bottom: ${TIMELINE_ITEM_GAP}px;${
                isMultiLine
                  ? ' white-space: pre-wrap; font-family: var(--mol-font-mono, monospace); line-height: 1.5'
                  : ''
              }`}
            >
              {#if item.card.content}
                {#each item.card.content as segment, i (i)}
                  <CardSegment seg={segment} />
                {/each}
              {:else}
                {item.card.text}
              {/if}
            </div>
          {/if}
        {/if}
      {:else if item.kind === 'message'}
        {#if item.msg.commitRecord}
          <CommitCardItem card={persistedCommitCard(item.msg, item.msg.commitRecord)} {onRevert} />
        {:else}
          <MessageItem
            msg={item.msg}
            sendMessage={ctx.chat.sendMessage}
            handleAskUserResponse={ctx.chat.handleAskUserResponse}
            isLoading={ctx.chat.isLoading}
            streamingStatus={ctx.chat.streamingStatus}
            onNavigatePreview={ctx.props.onNavigatePreview}
            undoneTcIds={ctx.undo.undoneTcIds}
            handleUndoToggle={ctx.undo.handleUndoToggle}
            onFileOpen={ctx.props.onFileOpen}
            onFileDoubleClick={ctx.props.onFileDoubleClick}
            onFileDiff={ctx.props.onFileDiff}
            handleFileRevert={ctx.git.handleFileRevert}
            setInputAndCursorEnd={ctx.input.setInputAndCursorEnd}
            setModelPicker={ctx.composer.setModelPicker}
            chatMode={ctx.chat.liveModelMode}
            isLight={ctx.env.isLight}
            userAvatar={ctx.props.userAvatar}
            onProfileClick={ctx.props.onProfileClick}
            currentUserId={ctx.props.currentUserId}
            showTimestamp={ctx.timeline.shownTimestampIds.has(item.msg.id)}
            discovery={ctx.props.discovery}
            buildUpgradeCta={ctx.props.buildUpgradeCta}
            agentName={ctx.agentName}
            canEdit={ctx.props.canEdit}
            onSkipToolCall={ctx.props.skipToolCall ? ctx.tests.handleSkipToolCall : undefined}
            {skipToolCallReason}
          />
        {/if}
      {/if}
    {/snippet}
  </ChatItemBoundary>
{/each}

{#if error && !staleAnonymousLimit}
  {#if errorMeta?.limitType}
    <!-- The CTA routes/copy are the host's: it receives everything the backend
         said about the refusal (the rule, the remedy it resolved, the tier). -->
    <ResourceLimitBanner
      message={error}
      action={ctx.props.buildUpgradeCta?.(upgradeContextFromError(errorMeta))}
    />
  {:else if isViewerAccessDenied}
    <!-- A viewer's denial is expected state, not an alarm: a brief, calm gold
         view-only notice (matching the viewer tip's treatment) that clears itself. -->
    {#if viewerDeniedFlash}
      <div
        data-mol-id="chat-viewer-denied-notice"
        class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
        use:styleText={viewerDeniedStyle}
      >
        <Icon
          name="people"
          size={CHAT_CARD_ICON_SIZE}
          aria-hidden="true"
          style={viewerDeniedIconStyle}
        />
        <span style="flex: 1 1 0%">
          {ctx.env.t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          })}
        </span>
      </div>
    {/if}
  {:else}
    <div
      class={ctx.env.cm.cn(
        ctx.env.cm.textSize('sm'),
        ctx.env.cm.sp('p', 2),
        ctx.env.cm.sp('mb', 2),
        ctx.env.cm.bgErrorSubtle,
        ctx.env.cm.textError,
      )}
      use:styleText={'border-radius: 6px'}
    >
      {error}
    </div>
  {/if}
{/if}
