/**
 * One chat timeline message's user-facing rows: the user row (a real user
 * message, an auto-sent card, or a team note), its collapsible message body and
 * its clickable author-name button.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `MessageItem`,
 * `CollapsibleUserMessage` and `AuthorNameButton` (see those files for the
 * design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. The three row kinds keep their documented looks —
 * a real user message with the user's avatar, the blue accent ring and the
 * Slack-style header; an auto-sent message as a green (`success`) tinted card
 * with the `sync` glyph and no header; a team note with the gold badge and the
 * team-note id. A `viaDictation` user message carries the red mic badge.
 *
 * The assistant reply row renders its blocks in order — thinking (a
 * `ThinkingBlock`), text and compaction summaries (a `MarkdownContent`),
 * verification (a `VerificationBadge`) and resource-limit notices — followed by
 * its tool-call cards, an orphan pending `ask_user` card, the aborted note and
 * the loop-limit card.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes, with every length written as the `px` string the DOM serializes.
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX, Setter } from 'solid-js'
import {
  createComponent,
  createEffect,
  createSignal,
  For,
  Index,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js'

import type { ChatMessage, MessageBlock, ToolCall } from '@molecule/app-ai-chat'
import type { ChatEventCardAction, ChatUserIdentity } from '@molecule/app-ide-panel-logic'
import {
  AUTO_SENT_ACCENT,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  formatSize,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
  TIMELINE_ITEM_GAP_DISCOVERY,
  USER_MSG_COLLAPSE_HEIGHT,
} from '@molecule/app-ide-panel-logic'
import type { ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { ChatTimestamp } from '../components/ChatTimestamp.jsx'
import { Icon } from '../components/Icon.jsx'
import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { UserAvatar } from '../components/UserAvatar.jsx'
import { MarkdownContent } from './MarkdownContent.jsx'
import { ResourceLimitBanner } from './NoticeCard.jsx'
import { ThinkingBlock } from './ThinkingBlock.jsx'
import { VerificationBadge } from './VerificationBadge.jsx'

export type { ChatUserIdentity }

/**
 * The context-compaction card's inline style — a constant rather than an inline
 * object, so Solid writes it through the CSSOM exactly as React does (React
 * normalizes the `rgba()` colours; a literal style attribute would not).
 */
const COMPACTION_CARD_STYLE: Record<string, string> = {
  padding: '10px 16px',
  // Same blue-box treatment as the emphasized system card → same timeline
  // rhythm: bottom margin only (TIMELINE_ITEM_GAP).
  'margin-bottom': `${TIMELINE_ITEM_GAP}px`,
  background: 'rgba(64,112,224,0.10)',
  border: '1px solid rgba(64,112,224,0.25)',
  'border-radius': '8px',
  color: 'var(--mol-color-text-secondary, #aaa)',
  'text-align': 'center',
  'line-height': '1.5',
}

/** The host's upgrade/sign-in CTA builder context (React's `buildUpgradeCta` argument). */
export interface UpgradeCtaContext {
  /** Whether the user must sign up. */
  requiresSignup?: boolean
  /** The limit rule the backend enforced. */
  limitType?: string
  /** The remedy the backend resolved. */
  billingAction?: string
  /** The plan an upgrade would move to, or `null` when there is none. */
  upgradeTier?: string | null
}

/** Props for {@link CollapsibleUserMessage} — the React prop names, React's own contract. */
export interface CollapsibleUserMessageProps {
  /** The raw message text. */
  content: string
  /** Whether the host theme is light (drives the fade colour). */
  isLight: boolean
}

/** Props for {@link AuthorNameButton} — the React prop names, React's own contract. */
export interface AuthorNameButtonProps {
  /** Opens the author's profile. */
  onClick: () => void
  /** The author's display name. */
  children?: JSX.Element
}

/** Props for {@link MessageItem} — the React prop names, React's own contract. */
export interface MessageItemProps {
  /** The message to render. */
  msg: ChatMessage
  /** Sends a message (the loop-limit card's Continue action). */
  sendMessage: (msg: string) => void
  /** Answers a pending `ask_user` question. */
  handleAskUserResponse: (response: string) => void
  /** Whether a turn is running (disables the loop-limit card's first action). */
  isLoading: boolean
  /** Transient background-phase label shown by the streaming indicator. */
  streamingStatus: string | null
  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: (path: string) => void
  /** The tool calls whose effect is undone. */
  undoneTcIds: Set<string>
  /** Undoes or redoes one tool call's effect. */
  handleUndoToggle: (tcId: string, undone: boolean) => void
  /** Opens a file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Pins a file's tab. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Writes a file back. */
  handleFileRevert: (path: string, content: string) => Promise<void>
  /** Replaces the composer input and moves the cursor to its end. */
  setInputAndCursorEnd: (val: string) => void
  /** Opens the model picker on a chosen entry. */
  setModelPicker: Setter<ModelPicker | null>
  /** The live conversation mode (discovery maps to `plan`). */
  chatMode: 'plan' | 'execute'
  /** The signed-in user's avatar (used only for author-less own messages). */
  userAvatar?: string | null
  /** Opens the clicked author's profile. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id (author-less messages belong to them). */
  currentUserId?: string
  /** Discovery phase — roomier, uncollapsed spacing between cards. */
  discovery?: boolean
  /** Host-supplied upgrade/sign-in CTA builder (resource-limit banners). */
  buildUpgradeCta?: (
    context: UpgradeCtaContext,
  ) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /** Agent display name, interpolated into the team-only badge tip. */
  agentName?: string
  /** Whether the user may write shared project state. */
  canEdit?: boolean
  /** Skips a tool call that is running right now. */
  onSkipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  /** Why this viewer cannot skip, already translated — `null` when they can. */
  skipToolCallReason?: string | null
  /** Whether the header row shows the message's time. */
  showTimestamp?: boolean
}

/**
 * The clickable author-name in a message header — a reset button that renders
 * exactly like the bold name span it replaces, with an underline on
 * hover/focus as the affordance, and opens the author's profile like their
 * avatar does. Its own component so the hover state never re-renders the
 * (memoized, heavy) message row.
 *
 * @param props - See {@link AuthorNameButtonProps}.
 * @returns The name button.
 */
export function AuthorNameButton(props: AuthorNameButtonProps): JSX.Element {
  const [hover, setHover] = createSignal(false)

  // React writes this object through the CSSOM, which normalizes the `border`
  // and `font` shorthands. Read as a called expression so Solid takes the same
  // path instead of hoisting it into a literal attribute.
  const buttonStyle = (): Record<string, string> => ({
    padding: '0',
    margin: '0',
    border: 'none',
    background: 'transparent',
    font: 'inherit',
    color: 'inherit',
    'font-weight': '600',
    cursor: 'pointer',
    'text-decoration': hover() ? 'underline' : 'none',
  })

  return (
    <button
      /* mol-bespoke-button: author name — a full <button> reset so the name renders byte-identical to the bold span it replaced; hover underline is the only affordance */
      type="button"
      onClick={() => props.onClick()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      data-mol-id="chat-user-name-button"
      // Full button reset so it is byte-identical to the former bold span at
      // rest — the underline affordance is the only visual change on hover.
      style={buttonStyle()}
    >
      {props.children}
    </button>
  )
}

/**
 * A user message's body, collapsed behind a gradient when it is taller than
 * {@link USER_MSG_COLLAPSE_HEIGHT}.
 *
 * @param props - See {@link CollapsibleUserMessageProps}.
 * @returns The rendered body.
 */
export function CollapsibleUserMessage(props: CollapsibleUserMessageProps): JSX.Element {
  const { t } = useTranslation()
  const [overflows, setOverflows] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  // React's `useRef`: a plain, non-reactive holder the ref callback fills.
  const body: { current: HTMLDivElement | null } = { current: null }

  /** Measures the rendered body, so the fade only appears when it clips. */
  const measure = (): void => {
    if (body.current) setOverflows(body.current.scrollHeight > USER_MSG_COLLAPSE_HEIGHT)
  }

  // React's `useEffect([content])`: the first render and every content change.
  onMount(measure)
  createEffect(
    on(
      () => props.content,
      () => measure(),
      { defer: true },
    ),
  )
  // React clears the ref on unmount.
  onCleanup(() => {
    body.current = null
  })

  /** The strip's own style — read through the CSSOM like React does (see {@link AuthorNameButton}). */
  const stripStyle = (): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '100%',
    padding: '2px 0',
    margin: '2px 0 0',
    background: 'transparent',
    border: 'none',
    'border-radius': '0 0 4px 4px',
    cursor: 'pointer',
    color: 'inherit',
    transition: 'background 100ms',
  })

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={(element: HTMLDivElement) => {
          body.current = element
        }}
        style={{
          'max-height': expanded() ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`,
          overflow: 'hidden',
          'white-space': 'pre-wrap',
        }}
      >
        {props.content}
      </div>
      <Show when={overflows() && !expanded()}>
        <div
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            right: '0px',
            height: '40px',
            background: props.isLight
              ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
              : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))',
            'pointer-events': 'none',
          }}
        />
      </Show>
      <Show when={overflows()}>
        <button
          /* mol-bespoke-button: overflow disclosure strip — full-width chevron that expands a clipped card */
          type="button"
          // The chevron is the strip's only content, so the name comes from aria-label.
          aria-label={
            expanded()
              ? t('ide.chat.collapseMessage', undefined, { defaultValue: 'Show less' })
              : t('ide.chat.expandMessage', undefined, { defaultValue: 'Show more' })
          }
          aria-expanded={expanded()}
          onClick={() => setExpanded((value) => !value)}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = props.isLight
              ? 'rgba(99,102,241,0.12)'
              : 'rgba(99,102,241,0.18)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent'
          }}
          style={stripStyle()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            style={{
              display: 'block',
              opacity: '0.5',
              transform: expanded() ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }}
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
        </button>
      </Show>
    </div>
  )
}

/**
 * Renders a single message (user or assistant) in the chat timeline.
 *
 * User, auto-sent and team-note messages render as a user row; every other
 * message (an assistant reply) renders its blocks, tool calls and turn notes.
 *
 * @param props - See {@link MessageItemProps}.
 * @returns The message row.
 */
export function MessageItem(props: MessageItemProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const mode = useThemeMode()

  /** Whether the host theme is light (the tinted rows and the mic glyph). */
  const isLight = (): boolean => mode() === 'light'
  /** The hairline colour the loop-limit card draws its borders in. */
  const borderClr = (): string => (isLight() ? '#d1d9e0' : 'rgba(255,255,255,0.1)')
  /** A message sent automatically on the user's behalf (`role: 'user'`, `automatic`). */
  const isAutomatic = (): boolean => props.msg.role === 'user' && !!props.msg.automatic
  /** A human-only team note (a `system` message with the gold team accent). */
  const isTeamNote = (): boolean => !!props.msg.teamOnly
  /** A real, user-typed message (the only one with the blue ring and the user's avatar). */
  const isUser = (): boolean => props.msg.role === 'user' && !isAutomatic()

  /** The author's identity: an authored message's, else the signed-in user's. */
  const authorIdentity = (): ChatUserIdentity =>
    props.msg.author
      ? {
          id: props.msg.author.id,
          name: props.msg.author.name,
          avatar: props.msg.author.avatar ?? null,
        }
      : { id: props.currentUserId, avatar: props.userAvatar ?? null }

  /** An author whose account is gone keeps its name but opens no profile. */
  const authorGone = (): boolean => Boolean(props.msg.author) && !props.msg.author?.id

  /** The profile click the avatar and the author name share. */
  const openAuthorProfile = (): (() => void) | undefined =>
    props.onProfileClick && !authorGone()
      ? () => props.onProfileClick?.(authorIdentity())
      : undefined

  /** The auto-sent card's chrome — the success tint, same shape as info cards. */
  const autoChrome = (): Record<string, string> => {
    const { padding, border, background, borderRadius } = chatCardStyle(AUTO_SENT_ACCENT)
    return { padding, border, background, 'border-radius': `${borderRadius}px` }
  }

  /** A real user message / team note's chrome. */
  const userChrome = (): Record<string, string> => ({
    'border-radius': '4px',
    'padding-left': '12px',
    'padding-top': '10px',
    'padding-bottom': '10px',
    'padding-right': '10px',
    border: isTeamNote()
      ? `1px solid ${NOTICE_TONE.gold.accent}`
      : '1px solid var(--mol-chat-accent-border, var(--mol-color-primary, #3060c0))',
    ...(isTeamNote() ? { 'box-shadow': `inset 3px 0 0 0 ${NOTICE_TONE.gold.accent}` } : {}),
  })

  /** The row wrapper's spacing (one timeline rhythm). */
  const wrapperStyle = (): Record<string, string> => ({
    'margin-bottom': `${props.discovery ? TIMELINE_ITEM_GAP_DISCOVERY : TIMELINE_ITEM_GAP}px`,
  })

  /** The Slack-style header: the author's name, the badges and the message's time. */
  const header = (): JSX.Element => {
    const name = (): string =>
      props.msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' })
    return (
      <div
        style={{
          display: 'flex',
          'align-items': 'baseline',
          gap: '8px',
          'line-height': '1.3',
          'margin-bottom': '1px',
        }}
      >
        <Show
          when={openAuthorProfile()}
          fallback={<span style={{ 'font-weight': '600' }}>{name()}</span>}
        >
          <AuthorNameButton onClick={() => openAuthorProfile()?.()}>{name()}</AuthorNameButton>
        </Show>
        <Show when={isTeamNote()}>
          <span
            title={t(
              'ide.chat.teamOnly.badge',
              { agentName: props.agentName ?? 'the assistant' },
              {
                defaultValue: 'Team only — visible to your team; {{agentName}} will ignore it',
              },
            )}
            aria-label={t(
              'ide.chat.teamOnly.badge',
              { agentName: props.agentName ?? 'the assistant' },
              {
                defaultValue: 'Team only — visible to your team; {{agentName}} will ignore it',
              },
            )}
            // Centered in the header row with a -0.5px optical nudge; the
            // glyph's baseline is its bottom edge, so baseline alignment
            // would ride too high.
            style={{
              display: 'inline-flex',
              'align-self': 'center',
              'flex-shrink': '0',
              position: 'relative',
              top: '-0.5px',
            }}
            data-mol-id="chat-team-only-badge"
            // An icon-only badge is an image with a name.
            role="img"
          >
            <Icon
              name="people"
              size={16}
              aria-hidden="true"
              style={{ color: NOTICE_TONE.gold.accent }}
            />
          </span>
        </Show>
        <Show when={isUser() && props.msg.viaDictation}>
          <span
            title={t('ide.chat.viaDictation.badge', undefined, {
              defaultValue: 'Dictated by voice',
            })}
            aria-label={t('ide.chat.viaDictation.badge', undefined, {
              defaultValue: 'Dictated by voice',
            })}
            style={{
              display: 'inline-flex',
              'align-self': 'center',
              'flex-shrink': '0',
              position: 'relative',
              top: '-0.5px',
            }}
            data-mol-id="chat-dictated-badge"
            // An icon-only badge is an image with a name.
            role="img"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              style={{
                display: 'block',
                color: isLight() ? '#cf222e' : '#f85149',
              }}
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
        </Show>
        <Show when={props.showTimestamp && typeof props.msg.timestamp === 'number'}>
          <ChatTimestamp timestamp={props.msg.timestamp} />
        </Show>
      </div>
    )
  }

  /** The attachments row, one chip per attached file. */
  const attachments = (): JSX.Element => (
    <Show when={props.msg.attachments && props.msg.attachments.length > 0}>
      <div style={{ 'margin-top': '4px', display: 'flex', gap: '4px', 'flex-wrap': 'wrap' }}>
        <For each={props.msg.attachments ?? []}>
          {(attachment) => (
            <span
              class={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'inline-flex', 'align-items': 'center', gap: '2px' }}
            >
              {attachment.mediaType.startsWith('image/')
                ? '🖼️'
                : attachment.mediaType.startsWith('audio/')
                  ? '🎵'
                  : attachment.mediaType.startsWith('video/')
                    ? '🎥'
                    : '📄'}{' '}
              {attachment.filename}
              <span style={{ 'font-size': '10px', opacity: '0.7' }}>
                ({formatSize(attachment.size)})
              </span>
            </span>
          )}
        </For>
      </div>
    </Show>
  )

  /** The user / auto-sent / team-note row. */
  const userRow = (): JSX.Element => (
    <div
      // Auto-sent card matches the info cards' `xs` body; a real user message
      // keeps its slightly larger `sm`.
      class={isAutomatic() ? cm.textSize('xs') : cm.cn(cm.surfaceSecondary, cm.textSize('sm'))}
      style={{
        display: 'flex',
        'align-items': 'flex-start',
        gap: '10px',
        'min-width': '0px',
        // A real user message keeps its gray surface and blue ring; an
        // auto-sent message is a green (success) tinted card; a team note
        // keeps the user look with the gold team-only accent instead.
        ...(isAutomatic() ? autoChrome() : userChrome()),
      }}
      data-mol-id={
        isTeamNote()
          ? 'chat-team-message'
          : isAutomatic()
            ? 'chat-automatic-message'
            : 'chat-user-message'
      }
    >
      <Show
        when={isAutomatic()}
        fallback={
          <UserAvatar
            // An AUTHORED message shows that author's avatar — never the
            // viewing user's picture; only an author-less message (the local
            // optimistic echo, legacy rows) is the signed-in user's own.
            userAvatar={authorIdentity().avatar}
            name={props.msg.author?.name ?? undefined}
            size={36}
            onClick={openAuthorProfile()}
          />
        }
      >
        <Icon
          name="sync"
          size={CHAT_CARD_ICON_SIZE}
          aria-hidden="true"
          style={{ 'flex-shrink': '0', 'margin-top': '1px', color: AUTO_SENT_ACCENT }}
        />
      </Show>
      <div style={{ flex: '1 1 0%', 'min-width': '0px', 'margin-top': '1px' }}>
        <Show when={!isAutomatic()}>{header()}</Show>
        <CollapsibleUserMessage content={props.msg.content} isLight={isLight()} />
        {attachments()}
      </div>
    </div>
  )

  /**
   * Whether a text block is the transcript's context-compaction summary.
   *
   * @param text - The block's text.
   * @returns True for the compaction headline form.
   */
  const isCompactionText = (text: string): boolean =>
    text.startsWith('**Context compacted**') || text.startsWith('> **Context compacted**')

  /**
   * The context-compaction card: its headline, with the rest behind a
   * `<details>` chevron whose glyph rotates on toggle.
   *
   * @param text - The compaction summary's text (read reactively).
   * @returns The rendered card.
   */
  const compactionCard = (text: () => string): JSX.Element => {
    // Split into headline (first line) and optional summary (rest), on every
    // read so a streamed compaction summary updates in place.
    const split = (): { headline: string; summary: string } => {
      const value = text()
      const nlIdx = value.indexOf('\n\n')
      return {
        headline: (nlIdx > -1 ? value.slice(0, nlIdx) : value).replace(/^>\s*/, ''),
        summary: nlIdx > -1 ? value.slice(nlIdx + 2) : '',
      }
    }
    /** The disclosure summary strip's resting style. */
    const summaryStyle = (): Record<string, string> => ({
      cursor: 'pointer',
      'text-align': 'center',
      'list-style': 'none',
      padding: '3px 0',
      'border-radius': '0 0 8px 8px',
      background: isLight() ? 'rgba(64,112,224,0.05)' : 'rgba(64,112,224,0.08)',
      transition: 'background 100ms',
    })
    return (
      <div class={cm.textSize('sm')} style={COMPACTION_CARD_STYLE}>
        <MarkdownContent text={split().headline} isStreaming={false} />
        <Show when={split().summary}>
          <details
            style={{ margin: '14px -16px -10px', 'text-align': 'left' }}
            onToggle={(event) => {
              const chevron = event.currentTarget.querySelector('[data-chevron]')
              if (chevron instanceof HTMLElement) {
                chevron.style.transform = event.currentTarget.open
                  ? 'rotate(180deg)'
                  : 'rotate(0deg)'
              }
            }}
          >
            <summary
              onMouseEnter={(event) => {
                event.currentTarget.style.background = isLight()
                  ? 'rgba(64,112,224,0.12)'
                  : 'rgba(64,112,224,0.18)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = isLight()
                  ? 'rgba(64,112,224,0.05)'
                  : 'rgba(64,112,224,0.08)'
              }}
              style={summaryStyle()}
            >
              <svg
                data-chevron=""
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                style={{
                  display: 'inline-block',
                  'vertical-align': 'middle',
                  transition: 'transform 150ms',
                  color: isLight() ? '#2850a0' : '#80b0ff',
                }}
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
            <div style={{ padding: '8px 16px 10px' }}>
              <MarkdownContent text={split().summary} isStreaming={false} />
            </div>
          </details>
        </Show>
      </div>
    )
  }

  /** One tool call's card, wired the way every card in the row is. */
  /**
   * A tool-call card whose props read the live call through the message on
   * every access. The session mutates a streaming tool call in place (its
   * status and output change on the same object), so the card must be driven by
   * the message's identity — React re-renders the same card for the same
   * reason; this keeps the card mounted and updates it in place.
   * @param id - The tool call's id.
   * @returns The rendered card.
   */
  const toolCallCard = (id: string): JSX.Element => {
    const call = (): ToolCall | undefined => props.msg.toolCalls?.find((entry) => entry.id === id)
    return createComponent(ToolCallCard, {
      get id() {
        return id
      },
      get name() {
        return call()?.name ?? ''
      },
      get input() {
        return call()?.input
      },
      get output() {
        return call()?.output
      },
      get status() {
        return call()?.status ?? 'running'
      },
      get fileDiff() {
        return call()?.fileDiff
      },
      get isUndone() {
        return props.undoneTcIds.has(id)
      },
      get onUndoToggle() {
        return props.handleUndoToggle
      },
      get onFileOpen() {
        return props.onFileOpen
      },
      get onFileDoubleClick() {
        return props.onFileDoubleClick
      },
      get onFileDiff() {
        return props.onFileDiff
      },
      get onFileRevert() {
        return props.canEdit === false ? undefined : props.handleFileRevert
      },
      get onAskUserResponse() {
        return props.canEdit === false ? undefined : props.handleAskUserResponse
      },
      get onSkip() {
        return props.onSkipToolCall
      },
      get skipDisabledReason() {
        return props.skipToolCallReason ?? null
      },
    })
  }

  /**
   * One block of an assistant reply, in React's render order.
   *
   * The block arrives as its index accessor, so the branch (`<Switch>`) and
   * every value inside it follow the live block: streamed text and thinking
   * update in place, and a growing block list re-computes which block is last.
   *
   * @param block - The block at this position (the index accessor).
   * @param index - Its position in the message's block list.
   * @returns The rendered node, or nothing for a tool-call block with no call.
   */
  const blockNode = (block: () => MessageBlock, index: number): JSX.Element => {
    /** Whether this position is the message's last block (read reactively). */
    const isLast = (): boolean => index === (props.msg.blocks?.length ?? 0) - 1
    /**
     * The live block at this index. The session mutates a streaming block in
     * place (appending text, changing a tool call's status) while replacing the
     * message object, so every value below is read from the message — React
     * re-renders this row for the same reason — and each wrapper is a fresh
     * object per message identity so the row's props update in place.
     * @returns The block at this position.
     */
    const currentBlock = (): MessageBlock => props.msg.blocks?.[index] ?? block()
    /** The block when it is a thinking block. */
    const thinkingValue = ():
      { value: Extract<MessageBlock, { type: 'thinking' }> } | undefined => {
      const value = currentBlock()
      return value.type === 'thinking' ? { value } : undefined
    }
    /** The block when it is a text block. */
    const textValue = (): { value: Extract<MessageBlock, { type: 'text' }> } | undefined => {
      const value = currentBlock()
      return value.type === 'text' ? { value } : undefined
    }
    /** The block when it is a verification result. */
    const verificationValue = ():
      { value: Extract<MessageBlock, { type: 'verification' }> } | undefined => {
      const value = currentBlock()
      return value.type === 'verification' ? { value } : undefined
    }
    /** The block when it is a resource-limit notice. */
    const resourceLimitValue = ():
      { value: Extract<MessageBlock, { type: 'resource_limit' }> } | undefined => {
      const value = currentBlock()
      return value.type === 'resource_limit' ? { value } : undefined
    }
    /** The block when it is a tool-call reference. */
    const toolCallValue = ():
      { value: Extract<MessageBlock, { type: 'tool_call' }> } | undefined => {
      const value = currentBlock()
      return value.type === 'tool_call' ? { value } : undefined
    }
    /** How long a thinking block thought, when the run recorded it. */
    const thinkingDuration = (
      value: Extract<MessageBlock, { type: 'thinking' }>,
    ): number | undefined => {
      const raw = 'durationMs' in value ? value.durationMs : undefined
      return typeof raw === 'number' ? raw : undefined
    }

    return (
      <Switch>
        <Match when={thinkingValue()}>
          {(item) => (
            <ThinkingBlock
              content={item().value.content}
              durationMs={thinkingDuration(item().value)}
              isStreaming={props.msg.isStreaming && isLast()}
            />
          )}
        </Match>
        <Match when={textValue()}>
          {(item) => (
            <Show
              when={isCompactionText(item().value.content)}
              fallback={
                <MarkdownContent
                  text={item().value.content}
                  isStreaming={isLast() && props.msg.isStreaming}
                  statusLabel={
                    isLast() && props.msg.isStreaming ? props.streamingStatus : undefined
                  }
                  statusStartedAt={
                    typeof props.msg.timestamp === 'number' ? props.msg.timestamp : undefined
                  }
                  onNavigatePreview={props.onNavigatePreview}
                  hideStreamingIndicator
                />
              }
            >
              {compactionCard(() => item().value.content)}
            </Show>
          )}
        </Match>
        <Match when={verificationValue()}>
          {(item) => (
            <VerificationBadge
              status={item().value.status}
              output={item().value.output}
              workspaces={item().value.workspaces}
              categories={item().value.categories}
              renderCheckUnavailable={item().value.renderCheckUnavailable}
            />
          )}
        </Match>
        <Match when={resourceLimitValue()}>
          {(item) => (
            <ResourceLimitBanner
              message={item().value.message}
              action={props.buildUpgradeCta?.({})}
            />
          )}
        </Match>
        <Match when={toolCallValue()}>
          {(item) => <div style={{ 'margin-top': '4px' }}>{toolCallCard(item().value.id)}</div>}
        </Match>
      </Switch>
    )
  }

  /**
   * A pending `ask_user` whose tool_call block was never persisted still renders
   * (G55): the record is the truth — a card the user cannot see parks the whole
   * turn with no way forward.
   *
   * @returns The orphan cards' tool calls, in the message's order.
   */
  const orphanAskUserCalls = (): ToolCall[] => {
    const blocks = props.msg.blocks
    const toolCalls = props.msg.toolCalls
    if (!toolCalls || !blocks || blocks.length === 0) return []
    return toolCalls.filter(
      (call) =>
        call.name === 'ask_user' &&
        typeof call.output === 'object' &&
        call.output !== null &&
        'status' in call.output &&
        call.output.status === 'awaiting_response' &&
        !blocks.some((block) => block.type === 'tool_call' && block.id === call.id),
    )
  }

  /**
   * The tool-call cards of a message that has no blocks at all.
   *
   * @returns The message's tool calls, or an empty list when it has blocks.
   */
  const plainToolCalls = (): ToolCall[] => {
    const toolCalls = props.msg.toolCalls
    if (!toolCalls || toolCalls.length === 0 || (props.msg.blocks?.length ?? 0) > 0) return []
    return toolCalls
  }

  /** The "Response stopped" note React shows after an aborted turn. */
  const abortedNote = (): JSX.Element | null =>
    props.msg.aborted ? (
      <span
        class={cm.cn(cm.textMuted, cm.textSize('xs'))}
        style={{ display: 'block', 'margin-top': '4px', 'font-style': 'italic' }}
      >
        {t('ide.chat.responseStopped', undefined, { defaultValue: 'Response stopped' })}
      </span>
    ) : null

  /**
   * The loop-limit card's actions: switch model, raise the cap, or continue.
   *
   * @returns The labeled actions, in React's order.
   */
  const loopLimitActions = (): Array<{ label: string; action: () => void }> => [
    {
      label: t('ide.chat.changeModel', undefined, { defaultValue: 'Change model' }),
      action: () => {
        props.setInputAndCursorEnd('/model ')
        props.setModelPicker({ selectedIdx: -1, mode: props.chatMode, text: '/model ' })
      },
    },
    {
      label: t('ide.chat.increaseLoops', undefined, { defaultValue: 'Increase max loops' }),
      action: () => {
        props.setInputAndCursorEnd('/maxloops ')
      },
    },
    {
      label: t('ide.chat.continueButton', undefined, { defaultValue: 'Continue' }),
      action: () => {
        void props.sendMessage(
          t('ide.chat.continuePrompt', undefined, {
            defaultValue: 'Continue implementing from where you left off.',
          }),
        )
      },
    },
  ]

  /**
   * One loop-limit choice row's inline style (its first row has no separator).
   *
   * @param index - The row's position in the action list.
   * @returns The row's style.
   */
  const loopButtonStyle = (index: number): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    'border-top': index > 0 ? `1px solid ${borderClr()}` : 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    'text-align': 'left',
    'font-size': '13px',
    transition: 'background 80ms',
  })

  /**
   * The card React shows when the agentic loop hit its iteration cap.
   *
   * @returns The rendered card, or null when the cap was not reached.
   */
  const loopLimitCard = (): JSX.Element | null => {
    const max = props.msg.loopLimitReached
    if (!max || props.msg.isStreaming) return null
    return (
      <div
        style={{
          'margin-top': '8px',
          'border-radius': '8px',
          border: `1px solid ${borderClr()}`,
          background: isLight() ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            'font-size': '13px',
            'font-weight': '600',
            'border-bottom': `1px solid ${borderClr()}`,
          }}
        >
          {t(
            'ide.chat.loopLimitReached',
            { max },
            { defaultValue: 'Reached the maximum of {{max}} tool iterations.' },
          )}
        </div>
        {loopLimitActions().map((option, index) => (
          <button
            /* mol-bespoke-button: loop-limit choice row — a full-width menu row with a letter chip, one of a list */
            type="button"
            disabled={index === 0 && props.isLoading}
            onClick={option.action}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = isLight()
                ? '#eaeef2'
                : 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
            }}
            style={loopButtonStyle(index)}
          >
            <span
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                'justify-content': 'center',
                width: '22px',
                height: '22px',
                'border-radius': '5px',
                border: `1px solid ${borderClr()}`,
                background: isLight() ? '#fff' : 'rgba(255,255,255,0.08)',
                color: isLight() ? '#57606a' : '#848d97',
                'font-size': '11px',
                'font-weight': '600',
                'flex-shrink': '0',
                'font-family': '"SF Mono", Menlo, Consolas, monospace',
              }}
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    )
  }

  /**
   * The assistant reply row: its blocks (or plain content), tool-call cards, the
   * orphan ask card, the aborted note and the loop-limit card.
   *
   * @returns The rendered row.
   */
  const assistantRow = (): JSX.Element => (
    <div>
      <Show
        when={(props.msg.blocks?.length ?? 0) > 0}
        fallback={
          props.msg.content ? (
            <MarkdownContent
              text={props.msg.content}
              isStreaming={props.msg.isStreaming}
              statusLabel={props.msg.isStreaming ? props.streamingStatus : undefined}
              statusStartedAt={
                typeof props.msg.timestamp === 'number' ? props.msg.timestamp : undefined
              }
              onNavigatePreview={props.onNavigatePreview}
              hideStreamingIndicator
            />
          ) : null
        }
      >
        <Index each={props.msg.blocks}>{(block, index) => blockNode(block, index)}</Index>
      </Show>
      <Index each={orphanAskUserCalls()}>{(call) => toolCallCard(call().id)}</Index>
      <Index each={plainToolCalls()}>{(call) => toolCallCard(call().id)}</Index>
      {abortedNote()}
      {loopLimitCard()}
    </div>
  )

  return (
    <div style={wrapperStyle()}>
      {isUser() || isAutomatic() || isTeamNote() ? userRow() : assistantRow()}
    </div>
  )
}
