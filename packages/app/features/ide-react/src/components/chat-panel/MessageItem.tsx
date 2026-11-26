/**
 * MessageItem — one memoized message row in the chat timeline, its props
 * contract, and the clickable author-name button it renders.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { memo, useState } from 'react'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { ChatUserIdentity } from '@molecule/app-ide-panel-logic'
import {
  AUTO_SENT_ACCENT,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  formatSize,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
  TIMELINE_ITEM_GAP_DISCOVERY,
} from '@molecule/app-ide-panel-logic'
import type { ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { useThemeMode, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ChatPanelProps } from '../../types.js'
import { ChatTimestamp } from '../ChatTimestamp.js'
import { Icon } from '../Icon.js'
import { MarkdownContent } from '../MarkdownContent.js'
import { ToolCallCard } from '../ToolCallCard.js'
import { UserAvatar } from '../UserAvatar.js'
import { CollapsibleUserMessage } from './CollapsibleUserMessage.js'
import { ResourceLimitBanner } from './NoticeCard.js'
import { ThinkingBlock } from './ThinkingBlock.js'
import { VerificationBadge } from './VerificationBadge.js'

/**
 * The clickable author-name in a message header (C5) — a reset button that
 * renders exactly like the bold name span it replaces, with an underline on
 * hover/focus as the affordance, and opens the author's profile like their
 * avatar does. Its own component so the hover state never re-renders the
 * (memoized, heavy) message row.
 *
 * @param props - Click handler + the name text.
 * @param props.onClick - Opens the author's profile.
 * @param props.children - The author's display name.
 * @returns The name button.
 */
function AuthorNameButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  const [hover, setHover] = useState(false)
  return (
    <button
      /* mol-bespoke-button: author name — a full <button> reset so the name renders byte-identical to the bold span it replaced; hover underline is the only affordance */
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      data-mol-id="chat-user-name-button"
      // Full button reset so it is byte-identical to the former bold span at
      // rest — the underline affordance is the only visual change on hover.
      style={{
        padding: 0,
        margin: 0,
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: hover ? 'underline' : 'none',
      }}
    >
      {children}
    </button>
  )
}

AuthorNameButton.displayName = 'AuthorNameButton'

// ---------------------------------------------------------------------------
// MessageItem — memo'd to avoid re-rendering all messages when one changes
// ---------------------------------------------------------------------------

/** Props for the memoized per-message timeline row (see {@link MessageItem}). */
export interface MessageItemProps {
  msg: ChatMessage
  sendMessage: (msg: string) => void
  handleAskUserResponse: (response: string) => void
  isLoading: boolean
  /**
   * Transient background-phase label (e.g. "Type-checking the API") shown in the
   * streaming spinner in place of the generic rotating messages; null when idle.
   */
  streamingStatus: string | null
  /** Navigates the preview to a route path when a `[label](/route)` link in a message is clicked. */
  onNavigatePreview?: (path: string) => void
  undoneTcIds: Set<string>
  handleUndoToggle: (tcId: string, undone: boolean) => void
  onFileOpen?: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  handleFileRevert: (path: string, content: string) => Promise<void>
  setInputAndCursorEnd: (val: string) => void
  setModelPicker: React.Dispatch<React.SetStateAction<ModelPicker | null>>
  /**
   * The live conversation mode (discovery maps to 'plan') — scopes the
   * loop-limit banner's "Change model" picker so the pick lands on the mode the
   * user is actually in.
   */
  chatMode: 'plan' | 'execute'
  /** Signed-in user's avatar shown beside their own messages (SOC1); icon fallback when absent/unsafe. */
  userAvatar?: string | null
  /**
   * When set, the author's avatar AND name become clickable and fire this with
   * the clicked AUTHOR's identity — a teammate's message opens THEIR profile,
   * the signed-in user's own opens theirs (C5). See {@link ChatPanelProps.onProfileClick}.
   */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** Signed-in user's id — stamps the identity for author-less rows (the local echo, legacy solo rows). */
  currentUserId?: string
  /** Discovery phase — gives consecutive question/answer cards roomier, uncollapsed spacing (B3). */
  discovery?: boolean
  /**
   * Host-supplied upgrade/sign-in CTA builder — used to give the in-message
   * resource-limit (OOM) banner its sign-in/upgrade buttons. See
   * {@link ChatPanelProps.buildUpgradeCta}.
   */
  buildUpgradeCta?: ChatPanelProps['buildUpgradeCta']
  /** Agent display name — used in the team-only badge tooltip ("{{agentName}} ignores it"). */
  agentName?: string
  /** Whether the user may write shared project state — false hides/inertizes write affordances in the message (revert, ask_user answers). */
  canEdit?: boolean
  /**
   * Skips a tool call that is running right now, without ending the turn.
   * Undefined when the host serves no such route — then no Skip is rendered.
   */
  onSkipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  /** Why this viewer cannot skip, already translated — `null` when they can. */
  skipToolCallReason?: string | null
  /**
   * Whether the header row shows the message's time — decided for the whole
   * timeline by `planChatTimestamps` (a run of identical labels shows it once).
   */
  showTimestamp?: boolean
}

/**
 * Renders a single message (user or assistant) in the chat timeline.
 * Wrapped in React.memo so unchanged messages skip re-rendering when
 * only the streaming message updates.
 * @param props - Message item props.
 * @returns The rendered message item.
 */
export const MessageItem = memo(function MessageItem(props: MessageItemProps): JSX.Element {
  const {
    msg,
    sendMessage,
    handleAskUserResponse,
    isLoading,
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
    userAvatar,
    onProfileClick,
    currentUserId,
    discovery,
    buildUpgradeCta,
    agentName,
    canEdit,
    onSkipToolCall,
    skipToolCallReason,
    showTimestamp,
  } = props

  const { t } = useTranslation()
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isLight = themeMode === 'light'
  const borderClr = isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'

  // A message sent automatically on the user's behalf (e.g. an auto-fix prompt):
  // it has role 'user' but must NOT look like the user typed it (C2).
  const isAutomatic = msg.role === 'user' && !!msg.automatic
  // A human-only team note (side channel, e.g. /teamsay): renders like a user
  // message — author header, time, plain content — but with the gold team-only
  // accent + badge, and never the user message's blue stripe. `role` is 'system'
  // (the model never sees it), so this is checked before isUser.
  const isTeamNote = !!msg.teamOnly
  // A real, user-typed message (the only one styled with the blue border + the
  // user's own avatar).
  const isUser = msg.role === 'user' && !isAutomatic

  // Who this message belongs to — the identity a profile click hands the host.
  // An AUTHORED message is that author's (a teammate's click opens THEIR
  // profile, never the viewer's); an author-less one (the local optimistic
  // echo, legacy solo rows) is the signed-in user's own, stamped with
  // currentUserId + the viewer's avatar so the host still knows who it is.
  const authorIdentity: ChatUserIdentity = msg.author
    ? { id: msg.author.id, name: msg.author.name, avatar: msg.author.avatar ?? null }
    : { id: currentUserId, avatar: userAvatar ?? null }
  // An author whose account is gone keeps its name (the platform rewrites it to
  // a 'Deleted user' marker with no id) and has no profile to open: the name
  // renders as plain text, never as a click that would land on the viewer's own.
  const authorGone = Boolean(msg.author) && !msg.author?.id
  const openAuthorProfile =
    onProfileClick && !authorGone ? (): void => onProfileClick(authorIdentity) : undefined

  // Spacing follows the one timeline convention (see TIMELINE_ITEM_GAP above): a
  // single bottom margin, no top margin, no negatives — so a message can never
  // pull itself up over the previous item's spacing. Discovery is roomier but
  // uses the same bottom-margin-only scheme. The former `sameRoleAsPrev`
  // `marginTop: -12px` run-tightening is gone on purpose: it keyed on the
  // previous *message* (skipping intervening system cards) and so ate the
  // "Now using <model>" card's bottom margin (P4-05).
  const wrapperSpacing: React.CSSProperties = {
    marginBottom: `${discovery ? TIMELINE_ITEM_GAP_DISCOVERY : TIMELINE_ITEM_GAP}px`,
  }
  const blocks = msg.blocks

  return (
    <div style={wrapperSpacing}>
      {isUser || isAutomatic || isTeamNote ? (
        <div
          className={
            // Auto-sent card matches the info cards' `xs` body; a real user message keeps
            // its slightly larger `sm` (it's a different kind of row, not an info card).
            isAutomatic ? cm.textSize('xs') : cm.cn(cm.surfaceSecondary, cm.textSize('sm'))
          }
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            minWidth: 0,
            // A real user message keeps its classic look: a gray surface with the
            // molecule brand's ANIMATED blue gradient stripe (3px) on the left edge,
            // drawn by the `::before` injected via USER_ACCENT_STYLE + gated on the
            // data-mol-id below, PLUS a solid blue outline ring (host-tunable via
            // `--mol-chat-accent-border`) so a sent-to-Synthase message reads bordered
            // the same way a team note does, and the user's full-size avatar. An
            // auto-sent message is instead a green (success) tinted card — same chrome
            // as the info cards — so it's unmistakably agent-sent, not user-typed (C2).
            // A team note keeps the user-message look but swaps the blue chrome (its
            // data-mol-id differs, so USER_ACCENT_STYLE never applies) for the gold
            // team-only border — with its own solid 3px left band (an inset box-shadow,
            // which starts at the border's inner edge exactly like the stripe's
            // `inset: 0` ::before, so the two rows' left accents match in geometry).
            ...(isAutomatic
              ? chatCardStyle(AUTO_SENT_ACCENT)
              : {
                  borderRadius: '4px',
                  paddingLeft: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingRight: '10px',
                  border: isTeamNote
                    ? `1px solid ${NOTICE_TONE.gold.accent}`
                    : '1px solid var(--mol-chat-accent-border, var(--mol-color-primary, #3060c0))',
                  ...(isTeamNote
                    ? { boxShadow: `inset 3px 0 0 0 ${NOTICE_TONE.gold.accent}` }
                    : {}),
                }),
          }}
          data-mol-id={
            isTeamNote
              ? 'chat-team-message'
              : isAutomatic
                ? 'chat-automatic-message'
                : 'chat-user-message'
          }
        >
          {/* A real user message shows the user's full-size profile avatar (SOC1); an
              auto-sent message shows a small `sync` glyph — NOT the molecule logo —
              signalling the agent acted automatically (C2). The user message is its own
              look; the auto-sent card lines up with the other info cards. */}
          {isAutomatic ? (
            <Icon
              name="sync"
              size={CHAT_CARD_ICON_SIZE}
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1, color: AUTO_SENT_ACCENT }}
            />
          ) : (
            <UserAvatar
              // An AUTHORED message shows that author's avatar — or their initial
              // when they have none — NEVER the viewing user's picture (which made
              // a teammate's avatar-less message wear the viewer's own face). Only
              // an author-less message (the local optimistic echo, legacy rows) is
              // the signed-in user's own and uses their avatar. Clicking opens the
              // AUTHOR's profile (own and teammate alike — the host decides which
              // surface from the identity's id).
              userAvatar={authorIdentity.avatar}
              name={msg.author?.name ?? undefined}
              size={36}
              onClick={openAuthorProfile}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, marginTop: 1 }}>
            {isAutomatic ? null : (
              // Slack-style header: the author's username (bold) with the relative time
              // (small, lighter) to its right. The username comes from the per-message
              // `author` (multi-user-ready); a solo conversation falls back to the "You"
              // label. The header lineHeight is tuned against the 36px avatar so the
              // username's top aligns with the avatar's top and the first line of the
              // message beneath aligns with the avatar's bottom.
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  lineHeight: 1.3,
                  marginBottom: 1,
                }}
              >
                {openAuthorProfile ? (
                  // Clickable author name — same bold text, opens the author's
                  // profile exactly like their avatar does. Its visible text is
                  // its accessible name (no aria-label needed).
                  <AuthorNameButton onClick={openAuthorProfile}>
                    {msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' })}
                  </AuthorNameButton>
                ) : (
                  <span style={{ fontWeight: 600 }}>
                    {msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' })}
                  </span>
                )}
                {isTeamNote && (
                  // Gold team-only badge right after the username (left of the time):
                  // this note is a human side channel — every project member sees it,
                  // the agent ignores it. The viewer tip explains this same icon.
                  <span
                    title={t(
                      'ide.chat.teamOnly.badge',
                      { agentName: agentName ?? 'the assistant' },
                      {
                        defaultValue:
                          'Team only — visible to your team; {{agentName}} will ignore it',
                      },
                    )}
                    aria-label={t(
                      'ide.chat.teamOnly.badge',
                      { agentName: agentName ?? 'the assistant' },
                      {
                        defaultValue:
                          'Team only — visible to your team; {{agentName}} will ignore it',
                      },
                    )}
                    // Centered in the header row with a -0.5px optical nudge. Platform
                    // font metrics make a single integer offset impossible: against
                    // plain center, macOS rendered the glyph ~1px low and Ubuntu spot-on
                    // (measured in Brave on both, 2026-08-27), so -0.5 splits the
                    // difference — each platform lands within half a pixel, and retina
                    // displays render the half-pixel crisply. (Baseline alignment was
                    // tried and rode too HIGH: a text-less inline-flex item's
                    // synthesized baseline is its bottom edge.)
                    style={{
                      display: 'inline-flex',
                      alignSelf: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      top: -0.5,
                    }}
                    data-mol-id="chat-team-only-badge"
                    // An icon-only badge is an image with a name (axe
                    // `aria-prohibited-attr`: a plain span may not carry
                    // aria-label), so the badge says what its glyph shows.
                    role="img"
                  >
                    <Icon
                      // 16px so the glyph reads at the username's optical size — the
                      // people glyph has internal viewBox padding, so a nominal 14px
                      // renders visibly smaller than the 14px text next to it.
                      name="people"
                      size={16}
                      aria-hidden="true"
                      style={{ color: NOTICE_TONE.gold.accent }}
                    />
                  </span>
                )}
                {isUser && msg.viaDictation && (
                  // Red mic badge right after the username (left of the time): this
                  // message was composed by voice — the mic button's dictated
                  // transcript was still in the composer at submit. Same inline
                  // mic glyph as the composer's own mic button (no bonded mic
                  // glyph exists; the icon-set `microphone` is a speaker), the
                  // theme's muted danger red — loud enough to spot in a
                  // scroll-back without reading as an error state — and the same
                  // centered-in-header geometry as the team-only badge above.
                  <span
                    title={t('ide.chat.viaDictation.badge', undefined, {
                      defaultValue: 'Dictated by voice',
                    })}
                    aria-label={t('ide.chat.viaDictation.badge', undefined, {
                      defaultValue: 'Dictated by voice',
                    })}
                    style={{
                      display: 'inline-flex',
                      alignSelf: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      top: -0.5,
                    }}
                    data-mol-id="chat-dictated-badge"
                    // An icon-only badge is an image with a name (axe
                    // `aria-prohibited-attr`: a plain span may not carry
                    // aria-label), so the badge says what its glyph shows.
                    role="img"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      style={{ display: 'block', color: isLight ? '#cf222e' : '#f85149' }}
                      aria-hidden="true"
                    >
                      <rect x="6" y="1" width="4" height="8" rx="2" fill="currentColor" />
                      <path
                        d="M4 7v1a4 4 0 008 0V7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                      <line
                        x1="8"
                        y1="12"
                        x2="8"
                        y2="15"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                      <line
                        x1="6"
                        y1="15"
                        x2="10"
                        y2="15"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                )}
                {showTimestamp && typeof msg.timestamp === 'number' && (
                  <ChatTimestamp timestamp={msg.timestamp} />
                )}
              </div>
            )}
            <CollapsibleUserMessage content={msg.content} isLight={isLight} />
            {msg.attachments && msg.attachments.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {msg.attachments.map((att, ai) => (
                  <span
                    key={ai}
                    className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
                  >
                    {att.mediaType.startsWith('image/')
                      ? '\uD83D\uDDBC\uFE0F'
                      : att.mediaType.startsWith('audio/')
                        ? '\uD83C\uDFB5'
                        : att.mediaType.startsWith('video/')
                          ? '\uD83C\uDFA5'
                          : '\uD83D\uDCC4'}{' '}
                    {att.filename}
                    <span style={{ fontSize: 10, opacity: 0.7 }}>({formatSize(att.size)})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {blocks && blocks.length > 0 ? (
            blocks.map((block, bi) => {
              const isLast = bi === blocks.length - 1

              if (block.type === 'thinking') {
                return (
                  <ThinkingBlock
                    key={bi}
                    content={block.content}
                    durationMs={
                      'durationMs' in block && typeof block.durationMs === 'number'
                        ? block.durationMs
                        : undefined
                    }
                    isStreaming={msg.isStreaming && isLast}
                  />
                )
              }

              if (block.type === 'text') {
                const textContent = block.content
                const isCompaction =
                  textContent.startsWith('**Context compacted**') ||
                  textContent.startsWith('> **Context compacted**')
                if (isCompaction) {
                  // Split into headline (first line) and optional summary (rest)
                  const nlIdx = textContent.indexOf('\n\n')
                  const headline = (nlIdx > -1 ? textContent.slice(0, nlIdx) : textContent).replace(
                    /^>\s*/,
                    '',
                  ) // strip leading blockquote
                  const summary = nlIdx > -1 ? textContent.slice(nlIdx + 2) : ''
                  return (
                    <div
                      key={bi}
                      className={cm.textSize('sm')}
                      style={{
                        padding: '10px 16px',
                        // Same blue-box treatment as the emphasized system card →
                        // same timeline rhythm: bottom margin only (TIMELINE_ITEM_GAP).
                        marginBottom: TIMELINE_ITEM_GAP,
                        background: 'rgba(64,112,224,0.10)',
                        border: '1px solid rgba(64,112,224,0.25)',
                        borderRadius: 8,
                        color: 'var(--mol-color-text-secondary, #aaa)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      <MarkdownContent text={headline} isStreaming={false} />
                      {summary && (
                        <details
                          style={{ margin: '14px -16px -10px', textAlign: 'left' }}
                          onToggle={(e) => {
                            const svg = e.currentTarget.querySelector(
                              '[data-chevron]',
                            ) as HTMLElement | null
                            if (svg)
                              svg.style.transform = e.currentTarget.open
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)'
                          }}
                        >
                          <summary
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isLight
                                ? 'rgba(64,112,224,0.12)'
                                : 'rgba(64,112,224,0.18)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isLight
                                ? 'rgba(64,112,224,0.05)'
                                : 'rgba(64,112,224,0.08)'
                            }}
                            style={{
                              cursor: 'pointer',
                              textAlign: 'center',
                              listStyle: 'none',
                              padding: '3px 0',
                              borderRadius: '0 0 8px 8px',
                              background: isLight
                                ? 'rgba(64,112,224,0.05)'
                                : 'rgba(64,112,224,0.08)',
                              transition: 'background 100ms',
                            }}
                          >
                            <svg
                              data-chevron=""
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              width="14"
                              height="14"
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                transition: 'transform 150ms',
                                color: isLight ? '#2850a0' : '#80b0ff',
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
                          </summary>
                          <div style={{ padding: '8px 16px 10px' }}>
                            <MarkdownContent text={summary} isStreaming={false} />
                          </div>
                        </details>
                      )}
                    </div>
                  )
                }
                return (
                  <MarkdownContent
                    key={bi}
                    text={textContent}
                    isStreaming={isLast && msg.isStreaming}
                    statusLabel={isLast && msg.isStreaming ? streamingStatus : undefined}
                    statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
                    onNavigatePreview={onNavigatePreview}
                    hideStreamingIndicator
                  />
                )
              }

              if (block.type === 'verification') {
                return (
                  <VerificationBadge
                    key={`verification-${bi}`}
                    status={block.status}
                    output={block.output}
                    workspaces={block.workspaces}
                    categories={block.categories}
                    renderCheckUnavailable={block.renderCheckUnavailable}
                  />
                )
              }

              if (block.type === 'resource_limit') {
                return (
                  <ResourceLimitBanner
                    key={`resource-limit-${bi}`}
                    message={block.message}
                    action={buildUpgradeCta?.({})}
                  />
                )
              }

              const tc = msg.toolCalls?.find((c) => c.id === block.id)
              if (!tc) return null
              return (
                <div key={tc.id} style={{ marginTop: '4px' }}>
                  <ToolCallCard
                    id={tc.id}
                    name={tc.name}
                    input={tc.input}
                    output={tc.output}
                    status={tc.status}
                    fileDiff={tc.fileDiff}
                    isUndone={undoneTcIds.has(tc.id)}
                    onUndoToggle={handleUndoToggle}
                    onFileOpen={onFileOpen}
                    onFileDoubleClick={onFileDoubleClick}
                    onFileDiff={onFileDiff}
                    onFileRevert={canEdit === false ? undefined : handleFileRevert}
                    onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
                    onSkip={onSkipToolCall}
                    skipDisabledReason={skipToolCallReason ?? null}
                  />
                </div>
              )
            })
          ) : msg.content ? (
            <MarkdownContent
              text={msg.content}
              isStreaming={msg.isStreaming}
              statusLabel={msg.isStreaming ? streamingStatus : undefined}
              statusStartedAt={typeof msg.timestamp === 'number' ? msg.timestamp : undefined}
              onNavigatePreview={onNavigatePreview}
              hideStreamingIndicator
            />
          ) : null}

          {/* A pending ask_user whose tool_call block was never persisted still
              renders (G55): the record is the truth — a card the user cannot
              see parks the whole turn with no way forward. This catches any
              awaiting ask_user with no matching block, live or after reload. */}
          {msg.toolCalls &&
            msg.blocks &&
            msg.blocks.length > 0 &&
            msg.toolCalls
              .filter(
                (tc) =>
                  tc.name === 'ask_user' &&
                  (tc.output as { status?: string } | string | undefined | null) !== null &&
                  typeof tc.output === 'object' &&
                  (tc.output as { status?: string }).status === 'awaiting_response' &&
                  !msg.blocks!.some(
                    (b) =>
                      (b as { type?: string; id?: string }).type === 'tool_call' &&
                      (b as { id?: string }).id === tc.id,
                  ),
              )
              .map((tc) => (
                <ToolCallCard
                  key={`orphan-ask-${tc.id}`}
                  id={tc.id}
                  name={tc.name}
                  input={tc.input}
                  output={tc.output}
                  status={tc.status}
                  fileDiff={tc.fileDiff}
                  isUndone={undoneTcIds.has(tc.id)}
                  onUndoToggle={handleUndoToggle}
                  onFileOpen={onFileOpen}
                  onFileDoubleClick={onFileDoubleClick}
                  onFileDiff={onFileDiff}
                  onFileRevert={canEdit === false ? undefined : handleFileRevert}
                  onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
                  onSkip={onSkipToolCall}
                  skipDisabledReason={skipToolCallReason ?? null}
                />
              ))}

          {msg.toolCalls &&
            msg.toolCalls.length > 0 &&
            (!msg.blocks || msg.blocks.length === 0) &&
            msg.toolCalls.map((tc) => (
              <ToolCallCard
                key={tc.id}
                id={tc.id}
                name={tc.name}
                input={tc.input}
                output={tc.output}
                status={tc.status}
                fileDiff={tc.fileDiff}
                isUndone={undoneTcIds.has(tc.id)}
                onUndoToggle={handleUndoToggle}
                onFileOpen={onFileOpen}
                onFileDoubleClick={onFileDoubleClick}
                onFileDiff={onFileDiff}
                onFileRevert={canEdit === false ? undefined : handleFileRevert}
                onAskUserResponse={canEdit === false ? undefined : handleAskUserResponse}
                onSkip={onSkipToolCall}
                skipDisabledReason={skipToolCallReason ?? null}
              />
            ))}

          {msg.aborted && (
            <span
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}
            >
              {t('ide.chat.responseStopped', undefined, {
                defaultValue: 'Response stopped',
              })}
            </span>
          )}

          {msg.loopLimitReached &&
            !msg.isStreaming &&
            (() => {
              const loopActions: Array<{ label: string; action: () => void }> = [
                {
                  label: t('ide.chat.changeModel', undefined, {
                    defaultValue: 'Change model',
                  }),
                  action: () => {
                    setInputAndCursorEnd('/model ')
                    setModelPicker({ selectedIdx: -1, mode: chatMode, text: '/model ' })
                  },
                },
                {
                  label: t('ide.chat.increaseLoops', undefined, {
                    defaultValue: 'Increase max loops',
                  }),
                  action: () => {
                    setInputAndCursorEnd('/maxloops ')
                  },
                },
                {
                  label: t('ide.chat.continueButton', undefined, {
                    defaultValue: 'Continue',
                  }),
                  action: () => {
                    void sendMessage(
                      t('ide.chat.continuePrompt', undefined, {
                        defaultValue: 'Continue implementing from where you left off.',
                      }),
                    )
                  },
                },
              ]
              return (
                <div
                  style={{
                    marginTop: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${borderClr}`,
                    background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderBottom: `1px solid ${borderClr}`,
                    }}
                  >
                    {t(
                      'ide.chat.loopLimitReached',
                      { max: msg.loopLimitReached },
                      { defaultValue: 'Reached the maximum of {{max}} tool iterations.' },
                    )}
                  </div>
                  {loopActions.map((opt, i) => (
                    <button
                      /* mol-bespoke-button: loop-limit choice row — a full-width menu row with a letter chip, one of a list */
                      key={i}
                      type="button"
                      disabled={i === 0 && isLoading}
                      onClick={opt.action}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isLight
                          ? '#eaeef2'
                          : 'rgba(255,255,255,0.06)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        transition: 'background 80ms',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '5px',
                          border: `1px solid ${borderClr}`,
                          background: isLight ? '#fff' : 'rgba(255,255,255,0.08)',
                          color: isLight ? '#57606a' : '#848d97',
                          fontSize: '11px',
                          fontWeight: 600,
                          flexShrink: 0,
                          fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
        </div>
      )}
    </div>
  )
})
