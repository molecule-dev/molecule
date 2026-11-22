<!--
  One chat timeline message's user-facing rows: a real user message, an
  auto-sent message and a human-only team note, together with the message body
  that clips behind an expand strip and the clickable author-name button.

  Svelte counterpart of `@molecule/app-ide-react`'s `MessageItem` (for its
  user/auto/team rows), `CollapsibleUserMessage` and `AuthorNameButton` (see
  those files for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks. A real user message keeps its gray
  surface, blue accent ring and the user's own avatar; an auto-sent message is a
  green (`success`) tinted card with the `sync` glyph and no header; a team note
  keeps the user look but carries the gold team-only border and badge. A
  `viaDictation` user message adds the red mic badge. The author name is a reset
  button that underlines on hover/focus and opens the author's profile.

  The assistant reply row renders the reply in its stored order: thinking
  blocks (collapsible, auto-expanded while streaming), text (with the context
  compaction notice), verification badges, resource-limit banners and tool-call
  cards; then any `ask_user` call whose block was never persisted, the tool
  calls of a message that carries no blocks, the "Response stopped" note and
  the loop-limit card with its three choices. All of it is the React part's
  order and props.

  The component is a part (React renders it inside ChatPanel without exporting
  it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
  writes, with every length written as a `px` string (Svelte does not add the
  unit React adds for a number). All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type UpgradeCtaContext = types.UpgradeCtaContext
  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type ChatUserIdentity = types.ChatUserIdentity
  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type MessageItemProps = types.MessageItemProps
</script>

<script lang="ts">
  import { writable } from 'svelte/store'

  import type { MessageBlock, ToolCall } from '@molecule/app-ai-chat'
  import {
    AUTO_SENT_ACCENT,
    CHAT_CARD_ICON_SIZE,
    chatCardStyle,
    formatSize,
    NOTICE_TONE,
    TIMELINE_ITEM_GAP,
    TIMELINE_ITEM_GAP_DISCOVERY,
  } from '@molecule/app-ide-panel-logic'
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ChatTimestamp from '../components/ChatTimestamp.svelte'
  import Icon from '../components/Icon.svelte'
  import ToolCallCard from '../components/ToolCallCard.svelte'
  import UserAvatar from '../components/UserAvatar.svelte'
  import CollapsibleUserMessage from './CollapsibleUserMessage.svelte'
  import MarkdownContent from './MarkdownContent.svelte'
  import ResourceLimitBanner from './ResourceLimitBanner.svelte'
  import ThinkingBlock from './ThinkingBlock.svelte'
  import VerificationBadge from './VerificationBadge.svelte'

  let {
    msg,
    isLight: isLightProp,
    userAvatar,
    agentName,
    currentUserId,
    onProfileClick,
    discovery,
    showTimestamp = false,
    sendMessage,
    handleAskUserResponse,
    isLoading = false,
    streamingStatus,
    onNavigatePreview,
    undoneTcIds,
    handleUndoToggle,
    onFileOpen,
    onFileDoubleClick,
    onFileDiff,
    handleFileRevert,
    setInputAndCursorEnd,
    setModelPicker,
    chatMode,
    buildUpgradeCta,
    canEdit,
    onSkipToolCall,
    skipToolCallReason,
  }: MessageItemProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()
  // The port's own unit tests pin the theme through this prop; the conformance
  // cases never pass it, so they take the host theme exactly as React does.
  // svelte-ignore state_referenced_locally
  const mode = isLightProp === undefined ? useThemeMode() : writable<'light' | 'dark'>('dark')
  // The host theme drives the tinted rows and the mic glyph, as in React's
  // `useThemeMode()`.
  const isLight = $derived(isLightProp ?? $mode === 'light')

  // A message sent automatically on the user's behalf (e.g. an auto-fix
  // prompt): it has role 'user' but must NOT look like the user typed it (C2).
  const isAutomatic = $derived(msg.role === 'user' && !!msg.automatic)
  // A human-only team note (side channel, e.g. /teamsay): renders like a user
  // message but with the gold team-only accent + badge. `role` is 'system'
  // (the model never sees it), so this is checked before isUser.
  const isTeamNote = $derived(!!msg.teamOnly)
  // A real, user-typed message (the only one styled with the accent ring and
  // the user's own avatar).
  const isUser = $derived(msg.role === 'user' && !isAutomatic)

  // Who this message belongs to — the identity a profile click hands the host.
  // An AUTHORED message is that author's; an author-less one (the local
  // optimistic echo, legacy solo rows) is the signed-in user's own.
  const authorIdentity = $derived.by((): types.ChatUserIdentity =>
    msg.author
      ? { id: msg.author.id, name: msg.author.name, avatar: msg.author.avatar ?? null }
      : { id: currentUserId, avatar: userAvatar ?? null },
  )
  // An author whose account is gone keeps its name (no id) and has no profile
  // to open: the name renders as plain text, never a click to the viewer's own.
  const authorGone = $derived(Boolean(msg.author) && !msg.author?.id)
  const openAuthorProfile = $derived(
    onProfileClick && !authorGone ? (): void => onProfileClick?.(authorIdentity) : undefined,
  )
  const authorLabel = $derived(
    msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' }),
  )

  const teamBadgeLabel = $derived(
    t(
      'ide.chat.teamOnly.badge',
      { agentName: agentName ?? 'the assistant' },
      { defaultValue: 'Team only — visible to your team; {{agentName}} will ignore it' },
    ),
  )

  // Spacing follows the one timeline convention: a single bottom margin, no
  // top margin. Discovery is roomier but uses the same bottom-margin-only
  // scheme.
  const wrapperStyle = $derived(
    `margin-bottom: ${discovery ? TIMELINE_ITEM_GAP_DISCOVERY : TIMELINE_ITEM_GAP}px`,
  )

  const rowClass = $derived(
    // Auto-sent card matches the info cards' `xs` body; a real user message
    // keeps its slightly larger `sm`.
    isAutomatic ? cm.textSize('xs') : cm.cn(cm.surfaceSecondary, cm.textSize('sm')),
  )

  const rowChrome = $derived.by((): string => {
    if (isAutomatic) {
      // Auto-sent: the success tint and the info cards' chrome.
      const { padding, border, background, borderRadius } = chatCardStyle(AUTO_SENT_ACCENT)
      return `padding: ${padding}; border-radius: ${borderRadius}px; border: ${border}; background: ${background}`
    }
    // Real user message / team note: gray surface, blue ring (gold for a team
    // note, whose left accent is an inset band matching the stripe geometry).
    // The padding is React's four longhands (12/10/10/10) written as the one
    // shorthand they serialize to: jsdom mis-orders the longhands into the
    // attribute, while the serialized DOM must match React's.
    const border = isTeamNote
      ? `1px solid ${NOTICE_TONE.gold.accent}`
      : '1px solid var(--mol-chat-accent-border, var(--mol-color-primary, #3060c0))'
    const shadow = isTeamNote ? `box-shadow: inset 3px 0 0 0 ${NOTICE_TONE.gold.accent};` : ''
    return `border-radius: 4px; padding: 10px 10px 10px 12px; border: ${border}; ${shadow}`
  })
  const rowStyle = $derived(
    `display: flex; align-items: flex-start; gap: 10px; min-width: 0px; ${rowChrome}`,
  )
  const rowMolId = $derived(
    isTeamNote ? 'chat-team-message' : isAutomatic ? 'chat-automatic-message' : 'chat-user-message',
  )

  // The clickable author name's hover/focus affordance (React's local state).
  let nameHover = $state(false)
  const nameStyle = $derived(
    `padding: 0px; margin: 0px; border: none; font: inherit; color: inherit; font-weight: 600; cursor: pointer; text-decoration: ${
      nameHover ? 'underline' : 'none'
    }`,
  )

  // ── The assistant reply row ─────────────────────────────────────────────
  // The card chrome React tints by theme (its `borderClr`).
  const borderClr = $derived(isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)')
  // Shallow copies: the chat session MUTATES a streaming block in place (it appends
  // each text delta to the block it already pushed) and flushes a new array holding
  // the same block objects. A keyed `{#each}` compares items by identity, so the
  // block's own fields would never invalidate the row it renders. React re-maps
  // `msg.blocks` on every render and reads the mutated fields; copying each block
  // per render gives Svelte the same fresh read.
  const blocks = $derived((msg.blocks ?? []).map((block) => ({ ...block })))
  const blockCount = $derived(blocks.length)
  // Same reason as `blocks`: the session mutates a tool call in place (status,
  // output, the diff snapshot a later `file_diff` attaches) and flushes a new
  // array of the same objects, so a card keyed to one would keep its first
  // props. React re-reads the record every render; the copies do that here.
  const toolCalls = $derived((msg.toolCalls ?? []).map((call) => ({ ...call })))

  // A pending ask_user whose tool_call block was never persisted still
  // renders (G55): the record is the truth — a card the user cannot see parks
  // the whole turn with no way forward, live or after reload.
  const orphanAskUserCalls = $derived(
    blocks.length > 0
      ? toolCalls.filter(
          (call) =>
            call.name === 'ask_user' &&
            isAwaitingResponse(call.output) &&
            !blocks.some((block) => block.type === 'tool_call' && block.id === call.id),
        )
      : [],
  )
  // A message that carries no blocks (legacy rows) renders its tool calls
  // straight through, in order.
  const looseToolCalls = $derived(blocks.length === 0 ? toolCalls : [])

  // React renders the loop-limit card only once the turn has finished.
  const loopLimit = $derived(msg.loopLimitReached ?? 0)
  const showLoopLimit = $derived(loopLimit > 0 && !msg.isStreaming)
  const resolvedChatMode = $derived(chatMode ?? 'execute')
  // The three loop-limit choices, in React's order. The Continue choice sends
  // the same continuation prompt the card's label explains.
  const loopActions = $derived([
    {
      label: t('ide.chat.changeModel', undefined, { defaultValue: 'Change model' }),
      run: (): void => {
        setInputAndCursorEnd?.('/model ')
        setModelPicker?.({ selectedIdx: -1, mode: resolvedChatMode, text: '/model ' })
      },
    },
    {
      label: t('ide.chat.increaseLoops', undefined, { defaultValue: 'Increase max loops' }),
      run: (): void => {
        setInputAndCursorEnd?.('/maxloops ')
      },
    },
    {
      label: t('ide.chat.continueButton', undefined, { defaultValue: 'Continue' }),
      run: (): void => {
        sendMessage?.(
          t('ide.chat.continuePrompt', undefined, {
            defaultValue: 'Continue implementing from where you left off.',
          }),
        )
      },
    },
  ])

  // React writes the loop-limit card's styles as inline style objects, so its
  // DOM carries their resulting CSSOM text. Svelte's dynamic style strings go
  // through one CSSStyleDeclaration parse, which differs in two ways handled
  // at each use: a lone `border: none` collapses (React's sequential set
  // leaves the expanded form), and a keyword `background` followed by another
  // declaration is dropped. Hence the first row's four border longhands and
  // the later rows' `background` written last. The hover tint is part of that
  // string too (React writes it through the CSSOM in onMouseEnter): a CSSOM
  // write to a style parsed from text re-serializes the whole declaration,
  // collapsing the first row's border longhands, which React's never does.
  let hoveredLoop = $state<number | null>(null)
  const loopHoverBg = $derived(isLight ? '#eaeef2' : 'rgba(255,255,255,0.06)')
  /**
   * A loop-limit row's style text, with the hover tint over the row the pointer
   * is on. The first row writes React's four border longhands (and goes through
   * {@link styleAttribute}); the later rows write `background` last.
   *
   * @param index - The row's position.
   * @returns The style text.
   */
  function loopRowStyle(index: number): string {
    const background = hoveredLoop === index ? loopHoverBg : 'transparent'
    const layout = 'display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 12px'
    const text =
      'color: inherit; cursor: pointer; text-align: left; font-size: 13px; transition: background 80ms'
    return index === 0
      ? `${layout}; border-width: medium; border-style: none; border-color: currentcolor; border-image: none; background: ${background}; ${text}`
      : `${layout}; border: none; border-top: 1px solid ${borderClr}; ${text}; background: ${background}`
  }

  /**
   * Writes the first loop-limit row's style as attribute text, verbatim. Svelte's
   * `style` attribute goes through one `cssText` parse, which folds that row's
   * four border longhands into `border: medium`; React's CSSOM-built row keeps
   * them.
   *
   * @param node - The row.
   * @param text - The style text.
   * @returns The action's update hook.
   */
  function styleAttribute(node: HTMLElement, text: string): { update: (next: string) => void } {
    node.setAttribute('style', text)
    return {
      update(next: string): void {
        node.setAttribute('style', next)
      },
    }
  }
  const chipStyle = $derived(
    `display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; border: 1px solid ${borderClr}; background: ${
      isLight ? '#fff' : 'rgba(255,255,255,0.08)'
    }; color: ${isLight ? '#57606a' : '#848d97'}; font-size: 11px; font-weight: 600; flex-shrink: 0; font-family: "SF Mono", Menlo, Consolas, monospace`,
  )

  /**
   * Whether a tool call's output is the `ask_user` awaiting-response record.
   *
   * @param output - The tool call's raw output.
   * @returns True when it is an object whose status is `awaiting_response`.
   */
  function isAwaitingResponse(output: unknown): boolean {
    return (
      typeof output === 'object' &&
      output !== null &&
      'status' in output &&
      output.status === 'awaiting_response'
    )
  }

  /**
   * Finds the tool-call record a `tool_call` block refers to.
   *
   * @param block - One block of the message.
   * @returns The matching tool call, or undefined when none is recorded.
   */
  function toolCallFor(block: MessageBlock): ToolCall | undefined {
    const id = 'id' in block ? block.id : undefined
    return toolCalls.find((call) => call.id === id)
  }

  /**
   * Reads the duration React attaches to a finished thinking block. The block
   * type does not declare it (the session records it as an extra field).
   *
   * @param block - The thinking block.
   * @returns Its duration in milliseconds, or undefined when unrecorded.
   */
  function thinkingDuration(block: {
    type: 'thinking'
    content: string
    durationMs?: number
  }): number | undefined {
    return block.durationMs
  }

  /**
   * Whether a text block is the context-compaction notice React renders as a
   * blue box instead of ordinary markdown.
   *
   * @param text - The block's text.
   * @returns True for either compacted headline form.
   */
  function isCompactionText(text: string): boolean {
    return text.startsWith('**Context compacted**') || text.startsWith('> **Context compacted**')
  }

  /**
   * Splits a compaction notice into its headline (the first line, with a
   * leading blockquote marker stripped) and its optional summary (everything
   * after the first blank line) — React's `nlIdx` split.
   *
   * @param text - The compaction block's text.
   * @returns The headline and the summary (empty when there is none).
   */
  function splitCompaction(text: string): { headline: string; summary: string } {
    const nlIdx = text.indexOf('\n\n')
    const headline = (nlIdx > -1 ? text.slice(0, nlIdx) : text).replace(/^>\s*/, '')
    const summary = nlIdx > -1 ? text.slice(nlIdx + 2) : ''
    return { headline, summary }
  }

  // ── CollapsibleUserMessage ──────────────────────────────────────────────
  // The clipped body and its disclosure strip are their own part (see
  // `CollapsibleUserMessage.svelte`), so the standalone family exercises the
  // very component this row renders.

  /**
   * The glyph shown ahead of an attachment's name, by media type.
   *
   * @param mediaType - The attachment's MIME type.
   * @returns The emoji glyph for its kind.
   */
  function attachmentGlyph(mediaType: string): string {
    if (mediaType.startsWith('image/')) return '🖼️'
    if (mediaType.startsWith('audio/')) return '🎵'
    if (mediaType.startsWith('video/')) return '🎥'
    return '📄'
  }

  /**
   * The label on an attachment chip: the kind's glyph, one space, the name.
   *
   * @param attachment - The attachment (its MIME type and file name).
   * @returns The chip's leading text, before its size.
   */
  function attachmentLabel(attachment: { filename: string; mediaType: string }): string {
    return `${attachmentGlyph(attachment.mediaType)} ${attachment.filename}`
  }
</script>

<div style={wrapperStyle}>
  {#if isUser || isAutomatic || isTeamNote}
    <div class={rowClass} style={rowStyle} data-mol-id={rowMolId}>
      {#if isAutomatic}
        <Icon
          name="sync"
          size={CHAT_CARD_ICON_SIZE}
          aria-hidden="true"
          style="flex-shrink: 0; margin-top: 1px; color: {AUTO_SENT_ACCENT}"
        />
      {:else}
        <UserAvatar
          userAvatar={authorIdentity.avatar}
          name={msg.author?.name ?? undefined}
          size={36}
          onClick={openAuthorProfile}
        />
      {/if}
      <div style="flex: 1 1 0%; min-width: 0px; margin-top: 1px">
        {#if !isAutomatic}
          <div
            style="display: flex; align-items: baseline; gap: 8px; line-height: 1.3; margin-bottom: 1px"
          >
            {#if openAuthorProfile}
              <button
                type="button"
                data-mol-id="chat-user-name-button"
                onclick={() => openAuthorProfile?.()}
                onmouseenter={() => (nameHover = true)}
                onmouseleave={() => (nameHover = false)}
                onfocus={() => (nameHover = true)}
                onblur={() => (nameHover = false)}
                style={nameStyle}
                style:background="transparent"
              >
                {authorLabel}
              </button>
            {:else}
              <span style="font-weight: 600">{authorLabel}</span>
            {/if}
            {#if isTeamNote}
              <span
                title={teamBadgeLabel}
                aria-label={teamBadgeLabel}
                style="display: inline-flex; align-self: center; flex-shrink: 0; position: relative; top: -0.5px"
                data-mol-id="chat-team-only-badge"
                role="img"
              >
                <Icon
                  name="people"
                  size={16}
                  aria-hidden="true"
                  style="color: {NOTICE_TONE.gold.accent}"
                />
              </span>
            {/if}
            {#if isUser && msg.viaDictation}
              <span
                title={t('ide.chat.viaDictation.badge', undefined, {
                  defaultValue: 'Dictated by voice',
                })}
                aria-label={t('ide.chat.viaDictation.badge', undefined, {
                  defaultValue: 'Dictated by voice',
                })}
                style="display: inline-flex; align-self: center; flex-shrink: 0; position: relative; top: -0.5px"
                data-mol-id="chat-dictated-badge"
                role="img"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  style="display: block; color: {isLight ? '#cf222e' : '#f85149'}"
                  aria-hidden="true"
                >
                  <rect x="6" y="1" width="4" height="8" rx="2" fill="currentColor" />
                  <path
                    d="M4 7v1a4 4 0 008 0V7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                  />
                  <line
                    x1="8"
                    y1="12"
                    x2="8"
                    y2="15"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                  />
                  <line
                    x1="6"
                    y1="15"
                    x2="10"
                    y2="15"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
            {/if}
            {#if showTimestamp && typeof msg.timestamp === 'number'}
              <ChatTimestamp timestamp={msg.timestamp} />
            {/if}
          </div>
        {/if}
        <CollapsibleUserMessage content={msg.content} {isLight} />
        {#if msg.attachments && msg.attachments.length > 0}
          <div style="margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap">
            {#each msg.attachments as attachment, attachmentIndex (attachmentIndex)}
              <span
                class={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style="display: inline-flex; align-items: center; gap: 2px"
                >{attachmentLabel(attachment)}<span style="font-size: 10px; opacity: 0.7"
                  >({formatSize(attachment.size)})</span
                ></span
              >
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div>
      {#if blockCount > 0}
        {#each blocks as block, bi (bi)}
          {#if block.type === 'thinking'}
            <ThinkingBlock
              content={block.content}
              durationMs={thinkingDuration(block)}
              isStreaming={msg.isStreaming && bi === blockCount - 1}
            />
          {:else if block.type === 'text'}
            {@const textContent = block.content}
            {#if isCompactionText(textContent)}
              {@const compaction = splitCompaction(textContent)}
              <div
                class={cm.textSize('sm')}
                style="padding: 10px 16px; margin-bottom: {TIMELINE_ITEM_GAP}px; background: rgba(64, 112, 224, 0.1); border: 1px solid rgba(64, 112, 224, 0.25); border-radius: 8px; color: var(--mol-color-text-secondary, #aaa); text-align: center; line-height: 1.5"
              >
                <MarkdownContent text={compaction.headline} isStreaming={false} />
                {#if compaction.summary}
                  <details
                    style="margin: 14px -16px -10px; text-align: left"
                    ontoggle={(event) => {
                      const chevron =
                        event.currentTarget.querySelector<SVGElement>('[data-chevron]')
                      if (chevron)
                        chevron.style.transform = event.currentTarget.open
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)'
                    }}
                  >
                    <summary
                      onmouseenter={(event) => {
                        event.currentTarget.style.background = isLight
                          ? 'rgba(64,112,224,0.12)'
                          : 'rgba(64,112,224,0.18)'
                      }}
                      onmouseleave={(event) => {
                        event.currentTarget.style.background = isLight
                          ? 'rgba(64,112,224,0.05)'
                          : 'rgba(64,112,224,0.08)'
                      }}
                      style="cursor: pointer; text-align: center; list-style: none; padding: 3px 0px; border-radius: 0 0 8px 8px; background: {isLight
                        ? 'rgba(64,112,224,0.05)'
                        : 'rgba(64,112,224,0.08)'}; transition: background 100ms"
                    >
                      <svg
                        data-chevron=""
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        style="display: inline-block; vertical-align: middle; transition: transform 150ms; color: {isLight
                          ? '#2850a0'
                          : '#80b0ff'}"
                      >
                        <polyline
                          points="4,6 8,10 12,6"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </summary>
                    <div style="padding: 8px 16px 10px">
                      <MarkdownContent text={compaction.summary} isStreaming={false} />
                    </div>
                  </details>
                {/if}
              </div>
            {:else}
              <MarkdownContent
                text={textContent}
                isStreaming={bi === blockCount - 1 && msg.isStreaming}
                statusLabel={bi === blockCount - 1 && msg.isStreaming ? streamingStatus : undefined}
                statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
                {onNavigatePreview}
                hideStreamingIndicator
              />
            {/if}
          {:else if block.type === 'verification'}
            <VerificationBadge
              status={block.status}
              output={block.output}
              workspaces={block.workspaces}
              categories={block.categories}
              renderCheckUnavailable={block.renderCheckUnavailable}
            />
          {:else if block.type === 'resource_limit'}
            <ResourceLimitBanner message={block.message} action={buildUpgradeCta?.({})} />
          {:else}
            {@const call = toolCallFor(block)}
            {#if call}
              <div style="margin-top: 4px">
                <ToolCallCard
                  id={call.id}
                  name={call.name}
                  input={call.input}
                  output={call.output}
                  status={call.status}
                  fileDiff={call.fileDiff}
                  isUndone={undoneTcIds?.has(call.id) ?? false}
                  onUndoToggle={handleUndoToggle}
                  {onFileOpen}
                  {onFileDoubleClick}
                  {onFileDiff}
                  onFileRevert={canEdit === false ? undefined : handleFileRevert}
                  onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
                  onSkip={onSkipToolCall}
                  skipDisabledReason={skipToolCallReason ?? null}
                />
              </div>
            {/if}
          {/if}
        {/each}
      {:else if msg.content}
        <MarkdownContent
          text={msg.content}
          isStreaming={msg.isStreaming}
          statusLabel={msg.isStreaming ? streamingStatus : undefined}
          statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
          {onNavigatePreview}
          hideStreamingIndicator
        />
      {/if}

      {#each orphanAskUserCalls as call (call.id)}
        <ToolCallCard
          id={call.id}
          name={call.name}
          input={call.input}
          output={call.output}
          status={call.status}
          fileDiff={call.fileDiff}
          isUndone={undoneTcIds?.has(call.id) ?? false}
          onUndoToggle={handleUndoToggle}
          {onFileOpen}
          {onFileDoubleClick}
          {onFileDiff}
          onFileRevert={canEdit === false ? undefined : handleFileRevert}
          onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
          onSkip={onSkipToolCall}
          skipDisabledReason={skipToolCallReason ?? null}
        />
      {/each}

      {#each looseToolCalls as call (call.id)}
        <ToolCallCard
          id={call.id}
          name={call.name}
          input={call.input}
          output={call.output}
          status={call.status}
          fileDiff={call.fileDiff}
          isUndone={undoneTcIds?.has(call.id) ?? false}
          onUndoToggle={handleUndoToggle}
          {onFileOpen}
          {onFileDoubleClick}
          {onFileDiff}
          onFileRevert={canEdit === false ? undefined : handleFileRevert}
          onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
          onSkip={onSkipToolCall}
          skipDisabledReason={skipToolCallReason ?? null}
        />
      {/each}

      {#if msg.aborted}
        <span
          class={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style="display: block; margin-top: 4px; font-style: italic"
        >
          {t('ide.chat.responseStopped', undefined, {
            defaultValue: 'Response stopped',
          })}
        </span>
      {/if}

      {#if showLoopLimit}
        <div
          style="margin-top: 8px; border-radius: 8px; border: 1px solid {borderClr}; background: {isLight
            ? '#f6f8fa'
            : 'rgba(255,255,255,0.04)'}; overflow: hidden"
        >
          <div
            style="padding: 10px 12px; font-size: 13px; font-weight: 600; border-bottom: 1px solid {borderClr}"
          >
            {t(
              'ide.chat.loopLimitReached',
              { max: loopLimit },
              { defaultValue: 'Reached the maximum of {{max}} tool iterations.' },
            )}
          </div>
          {#each loopActions as action, i (i)}
            {#if i === 0}
              <button
                type="button"
                disabled={isLoading}
                onclick={action.run}
                onmouseenter={() => (hoveredLoop = i)}
                onmouseleave={() => {
                  if (hoveredLoop === i) hoveredLoop = null
                }}
                use:styleAttribute={loopRowStyle(i)}
              >
                <span style={chipStyle}>{String.fromCharCode(65 + i)}</span>
                <span>{action.label}</span>
              </button>
            {:else}
              <button
                type="button"
                onclick={action.run}
                onmouseenter={() => (hoveredLoop = i)}
                onmouseleave={() => {
                  if (hoveredLoop === i) hoveredLoop = null
                }}
                style={loopRowStyle(i)}
              >
                <span style={chipStyle}>{String.fromCharCode(65 + i)}</span>
                <span>{action.label}</span>
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
