/**
 * One chat timeline message's user-facing rows: the user row (a real user
 * message, an auto-sent card, or a team note), its collapsible message body and
 * its clickable author-name button.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `MessageItem`,
 * `CollapsibleUserMessage` and `AuthorNameButton` (see those files for the
 * design notes): the same props (React names), the same DOM for the same input,
 * the same callbacks. The three row kinds keep their documented looks — a real
 * user message with the user's avatar, the blue accent ring and the Slack-style
 * header; an auto-sent message as a green (`success`) tinted card with the
 * `sync` glyph and no header; a team note with the gold badge and the
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
 * writes, with every length written as a `px` string (Vue does not add the unit
 * React adds for a number). All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, ref, type VNodeChild, watch } from 'vue'

import type { ChatMessage, MessageBlock, ToolCall } from '@molecule/app-ai-chat'
import {
  AUTO_SENT_ACCENT,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  type ChatEventCardAction,
  type ChatUserIdentity,
  formatSize,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
  TIMELINE_ITEM_GAP_DISCOVERY,
  USER_MSG_COLLAPSE_HEIGHT,
} from '@molecule/app-ide-panel-logic'
import type { ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useThemeMode, useTranslation } from '@molecule/app-vue'

import { ChatTimestamp } from '../components/ChatTimestamp.js'
import { Icon } from '../components/Icon.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import { UserAvatar } from '../components/UserAvatar.js'
import { MarkdownContent } from './MarkdownContent.js'
import { ResourceLimitBanner } from './NoticeCard.js'
import { ThinkingBlock } from './ThinkingBlock.js'
import { VerificationBadge } from './VerificationBadge.js'

export type { ChatUserIdentity }

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
  setModelPicker: (
    value: ModelPicker | null | ((previous: ModelPicker | null) => ModelPicker | null),
  ) => void
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
 * @param slots - The default slot holds the author's display name.
 * @returns The name button.
 */
export const AuthorNameButton = defineComponent({
  name: 'AuthorNameButton',
  props: {
    /** Opens the author's profile. */
    onClick: { type: Function as PropType<() => void>, required: true },
  },
  setup(props, { slots }) {
    const hover = ref(false)

    return (): VNodeChild =>
      h(
        'button',
        {
          type: 'button',
          onClick: () => {
            props.onClick()
          },
          onMouseenter: () => {
            hover.value = true
          },
          onMouseleave: () => {
            hover.value = false
          },
          onFocus: () => {
            hover.value = true
          },
          onBlur: () => {
            hover.value = false
          },
          'data-mol-id': 'chat-user-name-button',
          // Full button reset so it is byte-identical to the former bold span at
          // rest — the underline affordance is the only visual change on hover.
          style: {
            padding: '0',
            margin: '0',
            border: 'none',
            background: 'transparent',
            font: 'inherit',
            color: 'inherit',
            'font-weight': '600',
            cursor: 'pointer',
            'text-decoration': hover.value ? 'underline' : 'none',
          },
        },
        slots.default?.(),
      )
  },
})

/**
 * A user message's body, collapsed behind a gradient when it is taller than
 * {@link USER_MSG_COLLAPSE_HEIGHT}.
 *
 * @param props - See {@link CollapsibleUserMessageProps}.
 * @returns The rendered body.
 */
export const CollapsibleUserMessage = defineComponent({
  name: 'CollapsibleUserMessage',
  props: {
    /** The raw message text. */
    content: { type: String, required: true },
    /** Whether the host theme is light (drives the fade colour). */
    isLight: { type: Boolean, required: true },
  },
  setup(props) {
    const { t } = useTranslation()
    const innerRef = ref<HTMLDivElement | null>(null)
    const overflows = ref(false)
    const expanded = ref(false)

    /**
     * Measures the body after it renders, so the fade only appears when it clips.
     */
    const measure = (): void => {
      const el = innerRef.value
      if (el) overflows.value = el.scrollHeight > USER_MSG_COLLAPSE_HEIGHT
    }

    // React's `useEffect([content])`: the first render and every content change.
    onMounted(measure)
    watch(() => props.content, measure, { flush: 'post' })

    return (): VNodeChild =>
      h('div', { style: { position: 'relative' } }, [
        h(
          'div',
          {
            ref: innerRef,
            style: {
              'max-height': expanded.value ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`,
              overflow: 'hidden',
              'white-space': 'pre-wrap',
            },
          },
          props.content,
        ),
        overflows.value && !expanded.value
          ? h('div', {
              style: {
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '40px',
                background: props.isLight
                  ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
                  : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))',
                'pointer-events': 'none',
              },
            })
          : null,
        overflows.value
          ? h(
              'button',
              {
                type: 'button',
                // The chevron is the strip's only content, so the name comes from aria-label.
                'aria-label': expanded.value
                  ? t('ide.chat.collapseMessage', undefined, { defaultValue: 'Show less' })
                  : t('ide.chat.expandMessage', undefined, { defaultValue: 'Show more' }),
                'aria-expanded': expanded.value,
                onClick: () => {
                  expanded.value = !expanded.value
                },
                onMouseenter: (event: MouseEvent) => {
                  if (event.currentTarget instanceof HTMLElement)
                    event.currentTarget.style.background = props.isLight
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(99,102,241,0.18)'
                },
                onMouseleave: (event: MouseEvent) => {
                  if (event.currentTarget instanceof HTMLElement)
                    event.currentTarget.style.background = 'transparent'
                },
                style: {
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
                },
              },
              [
                h(
                  'svg',
                  {
                    xmlns: 'http://www.w3.org/2000/svg',
                    viewBox: '0 0 16 16',
                    width: '14',
                    height: '14',
                    style: {
                      display: 'block',
                      opacity: '0.5',
                      transform: expanded.value ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 150ms',
                    },
                  },
                  [
                    h('polyline', {
                      points: '4,6 8,10 12,6',
                      fill: 'none',
                      stroke: 'currentColor',
                      'stroke-width': '1.5',
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round',
                    }),
                  ],
                ),
              ],
            )
          : null,
      ])
  },
})

/**
 * The mic glyph the dictated badge renders (a filled capsule + stand).
 *
 * @param isLight - Whether the host theme is light (the glyph's red).
 * @returns The rendered SVG.
 */
function micGlyph(isLight: boolean): VNodeChild {
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 16 16',
      width: '16',
      height: '16',
      style: { display: 'block', color: isLight ? '#cf222e' : '#f85149' },
      'aria-hidden': 'true',
    },
    [
      h('rect', { x: '6', y: '1', width: '4', height: '8', rx: '2', fill: 'currentColor' }),
      h('path', {
        d: 'M4 7v1a4 4 0 008 0V7',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.25',
        'stroke-linecap': 'round',
      }),
      h('line', {
        x1: '8',
        y1: '12',
        x2: '8',
        y2: '15',
        stroke: 'currentColor',
        'stroke-width': '1.25',
        'stroke-linecap': 'round',
      }),
      h('line', {
        x1: '6',
        y1: '15',
        x2: '10',
        y2: '15',
        stroke: 'currentColor',
        'stroke-width': '1.25',
        'stroke-linecap': 'round',
      }),
    ],
  )
}

/**
 * Renders a single message (user or assistant) in the chat timeline.
 *
 * User, auto-sent and team-note rows render the user bubble; every other
 * message renders the assistant reply row.
 *
 * @param props - See {@link MessageItemProps}.
 * @returns The message row.
 */
export const MessageItem = defineComponent({
  name: 'MessageItem',
  props: {
    /** The message to render. */
    msg: { type: Object as PropType<ChatMessage>, required: true },
    /** Sends a message (the loop-limit card's Continue action). */
    sendMessage: {
      type: Function as PropType<(msg: string) => void>,
      required: false,
      default: undefined,
    },
    /** Answers a pending `ask_user` question. */
    handleAskUserResponse: {
      type: Function as PropType<(response: string) => void>,
      required: false,
      default: undefined,
    },
    /** Whether a turn is running. */
    isLoading: { type: Boolean, required: false, default: false },
    /** Transient background-phase label shown by the streaming indicator. */
    streamingStatus: { type: String as PropType<string | null>, required: false, default: null },
    /** Navigates the preview to a route path on a chat link click. */
    onNavigatePreview: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** The tool calls whose effect is undone. */
    undoneTcIds: { type: Object as PropType<Set<string>>, required: false, default: undefined },
    /** Undoes or redoes one tool call's effect. */
    handleUndoToggle: {
      type: Function as PropType<(tcId: string, undone: boolean) => void>,
      required: false,
      default: undefined,
    },
    /** Opens a file as a preview tab. */
    onFileOpen: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Pins a file's tab. */
    onFileDoubleClick: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Opens a changed file's diff. */
    onFileDiff: {
      type: Function as PropType<
        (path: string, diff?: { original: string; modified: string }) => void
      >,
      required: false,
      default: undefined,
    },
    /** Writes a file back. */
    handleFileRevert: {
      type: Function as PropType<(path: string, content: string) => Promise<void>>,
      required: false,
      default: undefined,
    },
    /** Replaces the composer input and moves the cursor to its end. */
    setInputAndCursorEnd: {
      type: Function as PropType<(val: string) => void>,
      required: false,
      default: undefined,
    },
    /** Opens the model picker on a chosen entry. */
    setModelPicker: {
      type: Function as PropType<MessageItemProps['setModelPicker']>,
      required: false,
      default: undefined,
    },
    /** The live conversation mode (discovery maps to `plan`). */
    chatMode: {
      type: String as PropType<'plan' | 'execute'>,
      required: false,
      default: 'execute',
    },
    /** The signed-in user's avatar (used only for author-less own messages). */
    userAvatar: { type: String as PropType<string | null>, required: false, default: undefined },
    /** Opens the clicked author's profile. */
    onProfileClick: {
      type: Function as PropType<(user: ChatUserIdentity) => void>,
      required: false,
      default: undefined,
    },
    /** The signed-in user's id (author-less messages belong to them). */
    currentUserId: { type: String, required: false, default: undefined },
    /** Discovery phase — roomier spacing between cards. */
    discovery: { type: Boolean, required: false, default: undefined },
    /** Host-supplied upgrade/sign-in CTA builder (resource-limit banners). */
    buildUpgradeCta: {
      type: Function as PropType<MessageItemProps['buildUpgradeCta']>,
      required: false,
      default: undefined,
    },
    /** Agent display name, interpolated into the team-only badge tip. */
    agentName: { type: String, required: false, default: undefined },
    /** Whether the user may write shared project state. */
    canEdit: { type: Boolean, required: false, default: undefined },
    /** Skips a tool call that is running right now. */
    onSkipToolCall: {
      type: Function as PropType<MessageItemProps['onSkipToolCall']>,
      required: false,
      default: undefined,
    },
    /** Why this viewer cannot skip, already translated — `null` when they can. */
    skipToolCallReason: { type: String as PropType<string | null>, required: false, default: null },
    /** Whether the header row shows the message's time. */
    showTimestamp: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const themeMode = useThemeMode()

    /** Whether the host theme is light. */
    const isLight = (): boolean => themeMode.value === 'light'

    /** A message sent automatically on the user's behalf (`role: 'user'`, `automatic`). */
    const isAutomatic = (): boolean => props.msg.role === 'user' && !!props.msg.automatic
    /** A human-only team note (a `system` message with the gold team accent). */
    const isTeamNote = (): boolean => !!props.msg.teamOnly
    /** A real, user-typed message (the only one with the blue ring and the user's avatar). */
    const isUser = (): boolean => props.msg.role === 'user' && !isAutomatic()

    /**
     * The author's identity: an authored message's, else the signed-in user's.
     *
     * @returns The identity the avatar and profile click use.
     */
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

    /**
     * The profile click the avatar and the author name share.
     *
     * @returns The click handler, or undefined when no profile can open.
     */
    const openAuthorProfile = (): (() => void) | undefined =>
      props.onProfileClick && !authorGone()
        ? (): void => props.onProfileClick?.(authorIdentity())
        : undefined

    /**
     * The auto-sent card's chrome — the success tint, same shape as info cards.
     *
     * @returns The inline style entries for the card.
     */
    const autoChrome = (): Record<string, string> => {
      const { padding, border, background, borderRadius } = chatCardStyle(AUTO_SENT_ACCENT)
      return {
        padding,
        border,
        background,
        'border-radius': `${borderRadius}px`,
      }
    }

    /**
     * A real user message / team note's chrome.
     *
     * @returns The inline style entries for the card.
     */
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

    /**
     * The Slack-style header: the author's name (or their clickable name), the
     * team-only and dictated badges, and the message's time.
     *
     * @returns The rendered header.
     */
    const header = (): VNodeChild => {
      const authorName =
        props.msg.author?.name ?? t('ide.chat.you', undefined, { defaultValue: 'You' })
      const openProfile = openAuthorProfile()
      return h(
        'div',
        {
          style: {
            display: 'flex',
            'align-items': 'baseline',
            gap: '8px',
            'line-height': '1.3',
            'margin-bottom': '1px',
          },
        },
        [
          openProfile
            ? h(AuthorNameButton, { onClick: openProfile }, () => authorName)
            : h('span', { style: { 'font-weight': '600' } }, authorName),
          isTeamNote()
            ? h(
                'span',
                {
                  title: t(
                    'ide.chat.teamOnly.badge',
                    { agentName: props.agentName ?? 'the assistant' },
                    {
                      defaultValue:
                        'Team only — visible to your team; {{agentName}} will ignore it',
                    },
                  ),
                  'aria-label': t(
                    'ide.chat.teamOnly.badge',
                    { agentName: props.agentName ?? 'the assistant' },
                    {
                      defaultValue:
                        'Team only — visible to your team; {{agentName}} will ignore it',
                    },
                  ),
                  // Centered in the header row with a -0.5px optical nudge; the
                  // glyph's baseline is its bottom edge, so baseline alignment
                  // would ride too high.
                  style: {
                    display: 'inline-flex',
                    'align-self': 'center',
                    'flex-shrink': '0',
                    position: 'relative',
                    top: '-0.5px',
                  },
                  'data-mol-id': 'chat-team-only-badge',
                  // An icon-only badge is an image with a name.
                  role: 'img',
                },
                [
                  h(Icon, {
                    name: 'people',
                    size: 16,
                    'aria-hidden': 'true',
                    style: { color: NOTICE_TONE.gold.accent },
                  }),
                ],
              )
            : null,
          isUser() && props.msg.viaDictation
            ? h(
                'span',
                {
                  title: t('ide.chat.viaDictation.badge', undefined, {
                    defaultValue: 'Dictated by voice',
                  }),
                  'aria-label': t('ide.chat.viaDictation.badge', undefined, {
                    defaultValue: 'Dictated by voice',
                  }),
                  style: {
                    display: 'inline-flex',
                    'align-self': 'center',
                    'flex-shrink': '0',
                    position: 'relative',
                    top: '-0.5px',
                  },
                  'data-mol-id': 'chat-dictated-badge',
                  // An icon-only badge is an image with a name.
                  role: 'img',
                },
                [micGlyph(isLight())],
              )
            : null,
          props.showTimestamp && typeof props.msg.timestamp === 'number'
            ? h(ChatTimestamp, { timestamp: props.msg.timestamp })
            : null,
        ],
      )
    }

    /**
     * The attachments row, one chip per attached file.
     *
     * @returns The rendered row, or null when the message has no attachments.
     */
    const attachments = (): VNodeChild => {
      const list = props.msg.attachments
      if (!list || list.length === 0) return null
      return h(
        'div',
        { style: { 'margin-top': '4px', display: 'flex', gap: '4px', 'flex-wrap': 'wrap' } },
        list.map((att, ai) =>
          h(
            'span',
            {
              key: ai,
              class: cm.cn(cm.textMuted, cm.textSize('xs')),
              style: { display: 'inline-flex', 'align-items': 'center', gap: '2px' },
            },
            [
              att.mediaType.startsWith('image/')
                ? '🖼️'
                : att.mediaType.startsWith('audio/')
                  ? '🎵'
                  : att.mediaType.startsWith('video/')
                    ? '🎥'
                    : '📄',
              ' ',
              att.filename,
              h('span', { style: { 'font-size': '10px', opacity: '0.7' } }, [
                `(${formatSize(att.size)})`,
              ]),
            ],
          ),
        ),
      )
    }

    /**
     * The user / auto-sent / team-note row.
     *
     * @returns The rendered row.
     */
    const userRow = (): VNodeChild =>
      h(
        'div',
        {
          // Auto-sent card matches the info cards' `xs` body; a real user message
          // keeps its slightly larger `sm`.
          class: isAutomatic() ? cm.textSize('xs') : cm.cn(cm.surfaceSecondary, cm.textSize('sm')),
          style: {
            display: 'flex',
            'align-items': 'flex-start',
            gap: '10px',
            'min-width': '0',
            // A real user message keeps its gray surface and blue ring; an
            // auto-sent message is a green (success) tinted card; a team note
            // keeps the user look with the gold team-only accent instead.
            ...(isAutomatic() ? autoChrome() : userChrome()),
          },
          'data-mol-id': isTeamNote()
            ? 'chat-team-message'
            : isAutomatic()
              ? 'chat-automatic-message'
              : 'chat-user-message',
        },
        [
          isAutomatic()
            ? h(Icon, {
                name: 'sync',
                size: CHAT_CARD_ICON_SIZE,
                'aria-hidden': 'true',
                style: { 'flex-shrink': '0', 'margin-top': '1px', color: AUTO_SENT_ACCENT },
              })
            : h(UserAvatar, {
                // An AUTHORED message shows that author's avatar — never the
                // viewing user's picture; only an author-less message (the local
                // optimistic echo, legacy rows) is the signed-in user's own.
                userAvatar: authorIdentity().avatar,
                name: props.msg.author?.name ?? undefined,
                size: 36,
                onClick: openAuthorProfile(),
              }),
          h('div', { style: { flex: '1', 'min-width': '0', 'margin-top': '1px' } }, [
            isAutomatic() ? null : header(),
            h(CollapsibleUserMessage, { content: props.msg.content, isLight: isLight() }),
            attachments(),
          ]),
        ],
      )

    /** The hairline React uses for the loop-limit card's borders, by theme. */
    const borderClr = (): string => (isLight() ? '#d1d9e0' : 'rgba(255,255,255,0.1)')

    /**
     * Whether a text block is the context-compaction summary React cards.
     *
     * @param text - The block's raw text.
     * @returns True for the compaction headline (plain or blockquoted).
     */
    const isCompactionText = (text: string): boolean =>
      text.startsWith('**Context compacted**') || text.startsWith('> **Context compacted**')

    /**
     * One tool call's card, with this row's callbacks and undo state.
     *
     * @param tc - The tool call to render.
     * @param key - The list key for the card.
     * @returns The rendered card.
     */
    const toolCallCard = (tc: ToolCall, key: string): VNodeChild =>
      h(ToolCallCard, {
        key,
        id: tc.id,
        name: tc.name,
        input: tc.input,
        output: tc.output,
        status: tc.status,
        fileDiff: tc.fileDiff,
        isUndone: props.undoneTcIds?.has(tc.id) ?? false,
        onUndoToggle: props.handleUndoToggle,
        onFileOpen: props.onFileOpen,
        onFileDoubleClick: props.onFileDoubleClick,
        onFileDiff: props.onFileDiff,
        onFileRevert: props.canEdit === false ? undefined : props.handleFileRevert,
        onAskUserResponse: props.canEdit === false ? undefined : props.handleAskUserResponse,
        onSkip: props.onSkipToolCall,
        skipDisabledReason: props.skipToolCallReason ?? null,
      })

    /**
     * The "Context compacted" card: the headline plus an optional summary
     * behind a disclosure whose chevron follows the open state.
     *
     * @param text - The block's raw text.
     * @param key - The list key.
     * @returns The rendered card.
     */
    const compactionCard = (text: string, key: number): VNodeChild => {
      // Split into headline (first line) and optional summary (rest).
      const nlIdx = text.indexOf('\n\n')
      const headline = (nlIdx > -1 ? text.slice(0, nlIdx) : text).replace(/^>\s*/, '')
      const summary = nlIdx > -1 ? text.slice(nlIdx + 2) : ''
      return h(
        'div',
        {
          key,
          class: cm.textSize('sm'),
          style: {
            padding: '10px 16px',
            // Same blue-box treatment as the emphasized system card → same
            // timeline rhythm: bottom margin only (TIMELINE_ITEM_GAP).
            'margin-bottom': `${TIMELINE_ITEM_GAP}px`,
            background: 'rgba(64,112,224,0.10)',
            border: '1px solid rgba(64,112,224,0.25)',
            'border-radius': '8px',
            color: 'var(--mol-color-text-secondary, #aaa)',
            'text-align': 'center',
            'line-height': '1.5',
          },
        },
        [
          h(MarkdownContent, { text: headline, isStreaming: false }),
          summary
            ? h(
                'details',
                {
                  style: { margin: '14px -16px -10px', 'text-align': 'left' },
                  onToggle: (event: Event) => {
                    const el = event.currentTarget
                    if (!(el instanceof HTMLDetailsElement)) return
                    const chevron = el.querySelector('[data-chevron]')
                    if (chevron instanceof HTMLElement)
                      chevron.style.transform = el.open ? 'rotate(180deg)' : 'rotate(0deg)'
                  },
                },
                [
                  h(
                    'summary',
                    {
                      onMouseenter: (event: MouseEvent) => {
                        if (event.currentTarget instanceof HTMLElement)
                          event.currentTarget.style.background = isLight()
                            ? 'rgba(64,112,224,0.12)'
                            : 'rgba(64,112,224,0.18)'
                      },
                      onMouseleave: (event: MouseEvent) => {
                        if (event.currentTarget instanceof HTMLElement)
                          event.currentTarget.style.background = isLight()
                            ? 'rgba(64,112,224,0.05)'
                            : 'rgba(64,112,224,0.08)'
                      },
                      style: {
                        cursor: 'pointer',
                        'text-align': 'center',
                        'list-style': 'none',
                        padding: '3px 0',
                        'border-radius': '0 0 8px 8px',
                        background: isLight() ? 'rgba(64,112,224,0.05)' : 'rgba(64,112,224,0.08)',
                        transition: 'background 100ms',
                      },
                    },
                    [
                      h(
                        'svg',
                        {
                          'data-chevron': '',
                          xmlns: 'http://www.w3.org/2000/svg',
                          viewBox: '0 0 16 16',
                          width: '14',
                          height: '14',
                          style: {
                            display: 'inline-block',
                            'vertical-align': 'middle',
                            transition: 'transform 150ms',
                            color: isLight() ? '#2850a0' : '#80b0ff',
                          },
                        },
                        [
                          h('polyline', {
                            points: '4,6 8,10 12,6',
                            fill: 'none',
                            stroke: 'currentColor',
                            'stroke-width': '1.5',
                            'stroke-linecap': 'round',
                            'stroke-linejoin': 'round',
                          }),
                        ],
                      ),
                    ],
                  ),
                  h('div', { style: { padding: '8px 16px 10px' } }, [
                    h(MarkdownContent, { text: summary, isStreaming: false }),
                  ]),
                ],
              )
            : null,
        ],
      )
    }

    /**
     * One block of an assistant reply, in React's render order.
     *
     * @param block - The block to render.
     * @param index - Its position in the message's block list.
     * @returns The rendered node, or `null` for a tool-call block with no call.
     */
    const renderBlock = (block: MessageBlock, index: number): VNodeChild => {
      const isLast = index === (props.msg.blocks?.length ?? 0) - 1
      if (block.type === 'thinking') {
        const durationMs =
          'durationMs' in block && typeof block.durationMs === 'number'
            ? block.durationMs
            : undefined
        return h(ThinkingBlock, {
          key: index,
          content: block.content,
          durationMs,
          isStreaming: props.msg.isStreaming && isLast,
        })
      }
      if (block.type === 'text') {
        if (isCompactionText(block.content)) return compactionCard(block.content, index)
        return h(MarkdownContent, {
          key: index,
          text: block.content,
          isStreaming: isLast && props.msg.isStreaming,
          statusLabel: isLast && props.msg.isStreaming ? props.streamingStatus : undefined,
          statusStartedAt:
            typeof props.msg.timestamp === 'number' ? props.msg.timestamp : undefined,
          onNavigatePreview: props.onNavigatePreview,
          hideStreamingIndicator: true,
        })
      }
      if (block.type === 'verification') {
        return h(VerificationBadge, {
          key: `verification-${index}`,
          status: block.status,
          output: block.output,
          workspaces: block.workspaces,
          categories: block.categories,
          renderCheckUnavailable: block.renderCheckUnavailable,
        })
      }
      if (block.type === 'resource_limit') {
        return h(ResourceLimitBanner, {
          key: `resource-limit-${index}`,
          message: block.message,
          action: props.buildUpgradeCta?.({}),
        })
      }
      const tc = props.msg.toolCalls?.find((call) => call.id === block.id)
      if (!tc) return null
      return h('div', { key: tc.id, style: { marginTop: '4px' } }, [toolCallCard(tc, tc.id)])
    }

    /**
     * A pending `ask_user` whose tool_call block was never persisted still
     * renders (G55): the record is the truth — a card the user cannot see parks
     * the whole turn with no way forward.
     *
     * @returns The orphan cards in the message's tool-call order, or null.
     */
    const orphanAskUserCards = (): VNodeChild => {
      const blocks = props.msg.blocks
      const toolCalls = props.msg.toolCalls
      if (!toolCalls || !blocks || blocks.length === 0) return null
      return toolCalls
        .filter(
          (tc) =>
            tc.name === 'ask_user' &&
            typeof tc.output === 'object' &&
            tc.output !== null &&
            'status' in tc.output &&
            tc.output.status === 'awaiting_response' &&
            !blocks.some((block) => block.type === 'tool_call' && block.id === tc.id),
        )
        .map((tc) => toolCallCard(tc, `orphan-ask-${tc.id}`))
    }

    /**
     * The tool-call cards of a message that has no blocks at all.
     *
     * @returns The cards, or null when the message has blocks or no calls.
     */
    const plainToolCallCards = (): VNodeChild => {
      const toolCalls = props.msg.toolCalls
      if (!toolCalls || toolCalls.length === 0 || (props.msg.blocks?.length ?? 0) > 0) return null
      return toolCalls.map((tc) => toolCallCard(tc, tc.id))
    }

    /** The "Response stopped" note React shows after an aborted turn. */
    const abortedNote = (): VNodeChild =>
      props.msg.aborted
        ? h(
            'span',
            {
              class: cm.cn(cm.textMuted, cm.textSize('xs')),
              style: { display: 'block', 'margin-top': '4px', 'font-style': 'italic' },
            },
            t('ide.chat.responseStopped', undefined, { defaultValue: 'Response stopped' }),
          )
        : null

    /**
     * The loop-limit card's actions: switch model, raise the cap, or continue.
     *
     * @returns The labeled actions, in React's order.
     */
    const loopLimitActions = (): Array<{ label: string; action: () => void }> => [
      {
        label: t('ide.chat.changeModel', undefined, { defaultValue: 'Change model' }),
        action: () => {
          props.setInputAndCursorEnd?.('/model ')
          props.setModelPicker?.({ selectedIdx: -1, mode: props.chatMode, text: '/model ' })
        },
      },
      {
        label: t('ide.chat.increaseLoops', undefined, { defaultValue: 'Increase max loops' }),
        action: () => {
          props.setInputAndCursorEnd?.('/maxloops ')
        },
      },
      {
        label: t('ide.chat.continueButton', undefined, { defaultValue: 'Continue' }),
        action: () => {
          props.sendMessage?.(
            t('ide.chat.continuePrompt', undefined, {
              defaultValue: 'Continue implementing from where you left off.',
            }),
          )
        },
      },
    ]

    /**
     * The card React shows when the agentic loop hit its iteration cap.
     *
     * @returns The rendered card, or null when the cap was not reached.
     */
    const loopLimitCard = (): VNodeChild => {
      const max = props.msg.loopLimitReached
      if (!max || props.msg.isStreaming) return null
      return h(
        'div',
        {
          style: {
            'margin-top': '8px',
            'border-radius': '8px',
            border: `1px solid ${borderClr()}`,
            background: isLight() ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
            overflow: 'hidden',
          },
        },
        [
          h(
            'div',
            {
              style: {
                padding: '10px 12px',
                'font-size': '13px',
                'font-weight': '600',
                borderBottom: `1px solid ${borderClr()}`,
              },
            },
            t(
              'ide.chat.loopLimitReached',
              { max },
              { defaultValue: 'Reached the maximum of {{max}} tool iterations.' },
            ),
          ),
          ...loopLimitActions().map((opt, i) =>
            h(
              'button',
              {
                key: i,
                type: 'button',
                disabled: i === 0 && props.isLoading,
                onClick: opt.action,
                onMouseenter: (event: MouseEvent) => {
                  if (event.currentTarget instanceof HTMLElement)
                    event.currentTarget.style.background = isLight()
                      ? '#eaeef2'
                      : 'rgba(255,255,255,0.06)'
                },
                onMouseleave: (event: MouseEvent) => {
                  if (event.currentTarget instanceof HTMLElement)
                    event.currentTarget.style.background = 'transparent'
                },
                style: {
                  display: 'flex',
                  'align-items': 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderTop: i > 0 ? `1px solid ${borderClr()}` : 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  'text-align': 'left',
                  'font-size': '13px',
                  transition: 'background 80ms',
                },
              },
              [
                h(
                  'span',
                  {
                    style: {
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
                    },
                  },
                  String.fromCharCode(65 + i),
                ),
                h('span', null, opt.label),
              ],
            ),
          ),
        ],
      )
    }

    /**
     * The assistant reply row: its blocks (or plain content), tool-call cards,
     * the orphan ask card, the aborted note and the loop-limit card.
     *
     * @returns The rendered row.
     */
    const assistantRow = (): VNodeChild => {
      const blocks = props.msg.blocks ?? []
      return h('div', null, [
        blocks.length > 0
          ? blocks.map((block, index) => renderBlock(block, index))
          : props.msg.content
            ? h(MarkdownContent, {
                text: props.msg.content,
                isStreaming: props.msg.isStreaming,
                statusLabel: props.msg.isStreaming ? props.streamingStatus : undefined,
                statusStartedAt:
                  typeof props.msg.timestamp === 'number' ? props.msg.timestamp : undefined,
                onNavigatePreview: props.onNavigatePreview,
                hideStreamingIndicator: true,
              })
            : null,
        orphanAskUserCards(),
        plainToolCallCards(),
        abortedNote(),
        loopLimitCard(),
      ])
    }

    return (): VNodeChild =>
      h(
        'div',
        {
          style: {
            'margin-bottom': `${props.discovery ? TIMELINE_ITEM_GAP_DISCOVERY : TIMELINE_ITEM_GAP}px`,
          },
        },
        [isUser() || isAutomatic() || isTeamNote() ? userRow() : assistantRow()],
      )
  },
})
