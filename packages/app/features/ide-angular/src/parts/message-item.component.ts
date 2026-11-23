/**
 * One chat timeline message's rows: the user-facing rows (the real user
 * message, the auto-sent card and the team note) and the assistant reply row.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `MessageItem` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The three user-row kinds keep their
 * documented looks — a real user message with the user's avatar, the blue
 * accent ring and the Slack-style header; an auto-sent message as a green
 * (`success`) tinted card with the `sync` glyph and no header; a team note with
 * the gold badge and the team-note id. A `viaDictation` user message carries
 * the red mic badge, an icon-only badge is an `img` with a name, and a `hidden`
 * message never reaches the DOM (the timeline derivation filters it, as React's
 * does).
 *
 * The assistant reply row (unit U2) renders its blocks in React's order —
 * thinking, text or the context-compaction card, verification, the
 * resource-limit banner, a tool-call card — then the plain content when there
 * are no blocks, the orphan pending `ask_user` cards, a block-less message's
 * tool calls, the aborted note and the loop-limit card. The block data is
 * derived into a small typed view model so the template needs no casts.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`. React's root is a single `<div>`, so that
 * element renders in front of the host (`placeElementBefore`) and the host
 * leaves the DOM: the rendered tree is React's, with no wrapper element of its
 * own. Styling uses `getClassMap()` (`cm.*`); the
 * inline styles are written through `[attr.style]`, whose text lands in the DOM
 * as is, so every declaration is pre-serialized the way React's CSSOM writes it
 * (`flex: 1 1 0%`, `padding: 10px 10px 10px 12px`, `border: medium`, spaced
 * `rgb()`/`rgba()`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import type { ChatMessage, MessageBlock, ToolCall } from '@molecule/app-ai-chat'
import {
  DEFAULT_AGENT_NAME,
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useThemeMode,
  useTranslation,
} from '@molecule/app-angular'
import type { ChatEventCardAction, ChatUserIdentity } from '@molecule/app-ide-panel-logic'
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
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatTimestamp } from '../components/chat-timestamp.component.js'
import { Icon } from '../components/icon.component.js'
import { ToolCallCard } from '../components/tool-call-card.component.js'
import { UserAvatar } from '../components/user-avatar.component.js'
import { AuthorNameButton } from './author-name-button.component.js'
import { CollapsibleUserMessage } from './collapsible-user-message.component.js'
import { MarkdownContent } from './markdown-content.component.js'
import { ResourceLimitBanner } from './notice-card.component.js'
import { ThinkingBlock } from './thinking-block.component.js'
import { VerificationBadge } from './verification-badge.component.js'

export type { ChatUserIdentity }

/**
 * The host's upgrade/sign-in CTA builder context (React's `buildUpgradeCta`
 * argument).
 */
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

/** Sets the model picker's state (React's `Dispatch<SetStateAction<ModelPicker | null>>`). */
export type ChatModelPickerSetter = (
  value: ModelPicker | null | ((previous: ModelPicker | null) => ModelPicker | null),
) => void

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
  setModelPicker: ChatModelPickerSetter
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

/** One rendered row of an assistant reply, derived from the message's blocks. */
type AssistantRow =
  | { kind: 'thinking'; key: string; content: string; durationMs?: number; isStreaming: boolean }
  | { kind: 'compaction'; key: string; headline: string; summary: string }
  | {
      kind: 'text'
      key: string
      text: string
      isStreaming: boolean
      statusLabel: string | null | undefined
      statusStartedAt: number | undefined
    }
  | {
      kind: 'verification'
      key: string
      status: 'ok' | 'error'
      output?: string
      workspaces: string[]
      categories?: string[]
      renderCheckUnavailable?: boolean
    }
  | { kind: 'resourceLimit'; key: string; message: string }
  | { kind: 'toolCall'; key: string; toolCall: ToolCall }

/** One row of the loop-limit card: its label and the action it runs. */
interface LoopAction {
  /** The button's translated label. */
  label: string
  /** What a click runs. */
  action: () => void
}

/**
 * How long a thinking block took, when the stream recorded it: the block type
 * carries no `durationMs`, but the streaming session attaches one.
 *
 * @param block - The thinking block, narrowed to its own union member.
 * @returns The recorded duration, or undefined.
 */
function thinkingDuration(block: Extract<MessageBlock, { type: 'thinking' }>): number | undefined {
  if (!('durationMs' in block)) return undefined
  const value = block.durationMs
  return typeof value === 'number' ? value : undefined
}

/** The component's static inline styles, serialized once the way React's CSSOM writes them. */
const STYLES = {
  /** The row wrapper's bottom rhythm (React's wrapper `<div>`). */
  wrapper: styleText({ marginBottom: `${TIMELINE_ITEM_GAP}px` }),
  /** The messages' body column. */
  bodyColumn: styleText({ flex: '1 1 0%', minWidth: 0, marginTop: 1 }),
  /** The Slack-style header row. */
  header: styleText({
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    lineHeight: 1.3,
    marginBottom: 1,
  }),
  /** A plain (non-clickable) author name. */
  authorName: styleText({ fontWeight: 600 }),
  /** An inline icon-only badge (team-only / dictation) placement. */
  inlineBadge: styleText({
    display: 'inline-flex',
    alignSelf: 'center',
    flexShrink: 0,
    position: 'relative',
    top: -0.5,
  }),
  /** The auto-sent card's `sync` glyph placement. */
  autoIcon: styleText({ flexShrink: 0, marginTop: 1, color: AUTO_SENT_ACCENT }),
  /** The attachments row. */
  attachments: styleText({ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }),
  /** One attachment chip. */
  attachmentChip: styleText({ display: 'inline-flex', alignItems: 'center', gap: 2 }),
  /** The attachment size suffix. */
  attachmentSize: styleText({ fontSize: 10, opacity: 0.7 }),
  /** The context-compaction card's blue-box chrome. */
  compaction: styleText({
    padding: '10px 16px',
    marginBottom: `${TIMELINE_ITEM_GAP}px`,
    background: 'rgba(64, 112, 224, 0.1)',
    border: '1px solid rgba(64, 112, 224, 0.25)',
    borderRadius: '8px',
    color: 'var(--mol-color-text-secondary, #aaa)',
    textAlign: 'center',
    lineHeight: '1.5',
  }),
  /** The compaction disclosure's pull out to the card's edges. */
  compactionDetails: styleText({ margin: '14px -16px -10px', textAlign: 'left' }),
  /** The compaction summary body's inset. */
  compactionBody: styleText({ padding: '8px 16px 10px' }),
  /** The tool-call card's top gap. */
  toolCallWrapper: styleText({ marginTop: '4px' }),
  /** The aborted-turn note. */
  aborted: styleText({ display: 'block', marginTop: 4, fontStyle: 'italic' }),
} as const

/**
 * Serializes a colour the way the CSSOM records it: a six-digit hex becomes the
 * spaced `rgb()` form React's rendered style attribute carries, any other value
 * (a CSS variable, a functional colour) passes through unchanged.
 *
 * @param value - The colour as the shared constants spell it.
 * @returns The colour as the serialized style attribute spells it.
 */
function cssColor(value: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(value)
  if (!match) return value
  const packed = Number.parseInt(match[1], 16)
  return `rgb(${(packed >> 16) & 255}, ${(packed >> 8) & 255}, ${packed & 255})`
}

/**
 * Renders a single message's row (a user-facing row or the assistant reply).
 */
@Component({
  selector: 'div[mol-message-item]',
  standalone: true,
  imports: [
    AuthorNameButton,
    ChatTimestamp,
    CollapsibleUserMessage,
    Icon,
    MarkdownContent,
    ResourceLimitBanner,
    ThinkingBlock,
    ToolCallCard,
    UserAvatar,
    VerificationBadge,
  ],
  inputs: [
    'msg',
    'sendMessage',
    'handleAskUserResponse',
    'isLoading',
    'streamingStatus',
    'onNavigatePreview',
    'undoneTcIds',
    'handleUndoToggle',
    'onFileOpen',
    'onFileDoubleClick',
    'onFileDiff',
    'handleFileRevert',
    'setInputAndCursorEnd',
    'setModelPicker',
    'chatMode',
    'userAvatar',
    'onProfileClick',
    'currentUserId',
    'discovery',
    'buildUpgradeCta',
    'agentName',
    'canEdit',
    'onSkipToolCall',
    'skipToolCallReason',
    'showTimestamp',
  ],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div #root [attr.style]="wrapperStyle()">@if (isUserRow()) {<div [attr.data-mol-id]="rowId()" [class]="rowClass()" [attr.style]="rowStyle()">@if (isAutomatic()) {<svg mol-icon [name]="'sync'" [size]="iconSize" aria-hidden="true" [attr.style]="s.autoIcon"></svg>} @else {<div mol-user-avatar [userAvatar]="authorAvatar()" [name]="authorName()" [size]="36" [onClick]="profileHandler()"></div>}<div [attr.style]="s.bodyColumn">@if (!isAutomatic()) {<div [attr.style]="s.header">@if (profileHandler()) {<button mol-author-name-button [onClick]="openProfile">{{ headerName() }}</button>} @else {<span [attr.style]="s.authorName">{{ headerName() }}</span>}@if (isTeamNote()) {<span [attr.data-mol-id]="'chat-team-only-badge'" role="img" [attr.title]="teamOnlyTip()" [attr.aria-label]="teamOnlyTip()" [attr.style]="s.inlineBadge"><svg mol-icon [name]="'people'" [size]="16" aria-hidden="true" [attr.style]="goldIconStyle()"></svg></span>}@if (isUser() && msg.viaDictation) {<span [attr.data-mol-id]="'chat-dictated-badge'" role="img" [attr.title]="dictatedTip()" [attr.aria-label]="dictatedTip()" [attr.style]="s.inlineBadge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" [attr.style]="micStyle()" aria-hidden="true"><rect x="6" y="1" width="4" height="8" rx="2" fill="currentColor"></rect><path d="M4 7v1a4 4 0 008 0V7" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></line><line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></line></svg></span>}@if (showTimestamp && hasTimestamp()) {<div mol-chat-timestamp [timestamp]="msg.timestamp" variant="inline"></div>}</div>}<div mol-collapsible-user-message [content]="msg.content" [isLight]="isLight()"></div>@if (hasAttachments()) {<div [attr.style]="s.attachments">@for (attachment of msg.attachments ?? []; track $index) {<span [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.attachmentChip">{{ attachmentIcon(attachment.mediaType) }} {{ attachment.filename }}<span [attr.style]="s.attachmentSize">({{ formattedSize(attachment.size) }})</span></span>}</div>}</div></div>} @else {<div>@if (hasBlocks()) {@for (row of assistantRows(); track row.key) {@if (row.kind === 'thinking') {<div mol-thinking-block [content]="row.content" [durationMs]="row.durationMs" [isStreaming]="row.isStreaming"></div>} @else if (row.kind === 'compaction') {<div [class]="cm.textSize('sm')" [attr.style]="s.compaction"><div mol-markdown-content [text]="row.headline" [isStreaming]="false"></div>@if (row.summary) {<details [attr.style]="s.compactionDetails" (toggle)="compactionToggle($event)"><summary (mouseenter)="compactionSummaryEnter($event)" (mouseleave)="compactionSummaryLeave($event)" [attr.style]="compactionSummaryStyle()"><svg data-chevron="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.style]="compactionChevronStyle()"><polyline points="4,6 8,10 12,6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></summary><div [attr.style]="s.compactionBody"><div mol-markdown-content [text]="row.summary" [isStreaming]="false"></div></div></details>}</div>} @else if (row.kind === 'text') {<div mol-markdown-content [text]="row.text" [isStreaming]="row.isStreaming" [statusLabel]="row.statusLabel" [statusStartedAt]="row.statusStartedAt" [onNavigatePreview]="onNavigatePreview" [hideStreamingIndicator]="true"></div>} @else if (row.kind === 'verification') {<div mol-verification-badge [status]="row.status" [output]="row.output" [workspaces]="row.workspaces" [categories]="row.categories" [renderCheckUnavailable]="row.renderCheckUnavailable === true"></div>} @else if (row.kind === 'resourceLimit') {<div mol-resource-limit-banner [message]="row.message" [action]="resourceLimitAction()"></div>} @else {<div [attr.style]="s.toolCallWrapper"><div mol-tool-call-card [id]="row.toolCall.id" [name]="row.toolCall.name" [input]="row.toolCall.input" [output]="row.toolCall.output" [status]="row.toolCall.status" [fileDiff]="row.toolCall.fileDiff" [isUndone]="undoneTcIds.has(row.toolCall.id)" [onUndoToggle]="handleUndoToggle" [onFileOpen]="onFileOpen" [onFileDoubleClick]="onFileDoubleClick" [onFileDiff]="onFileDiff" [onFileRevert]="canEdit === false ? undefined : handleFileRevert" [onAskUserResponse]="canEdit === false ? undefined : handleAskUserResponse" [onSkip]="onSkipToolCall" [skipDisabledReason]="skipToolCallReason ?? null"></div></div>}}} @else if (msg.content) {<div mol-markdown-content [text]="msg.content" [isStreaming]="msg.isStreaming === true" [statusLabel]="msg.isStreaming === true ? streamingStatus : undefined" [statusStartedAt]="statusStartedAt()" [onNavigatePreview]="onNavigatePreview" [hideStreamingIndicator]="true"></div>}@for (tc of orphanAskCalls(); track tc.id) {<div mol-tool-call-card [id]="tc.id" [name]="tc.name" [input]="tc.input" [output]="tc.output" [status]="tc.status" [fileDiff]="tc.fileDiff" [isUndone]="undoneTcIds.has(tc.id)" [onUndoToggle]="handleUndoToggle" [onFileOpen]="onFileOpen" [onFileDoubleClick]="onFileDoubleClick" [onFileDiff]="onFileDiff" [onFileRevert]="canEdit === false ? undefined : handleFileRevert" [onAskUserResponse]="canEdit === false ? undefined : handleAskUserResponse" [onSkip]="onSkipToolCall" [skipDisabledReason]="skipToolCallReason ?? null"></div>}@for (tc of plainToolCalls(); track tc.id) {<div mol-tool-call-card [id]="tc.id" [name]="tc.name" [input]="tc.input" [output]="tc.output" [status]="tc.status" [fileDiff]="tc.fileDiff" [isUndone]="undoneTcIds.has(tc.id)" [onUndoToggle]="handleUndoToggle" [onFileOpen]="onFileOpen" [onFileDoubleClick]="onFileDoubleClick" [onFileDiff]="onFileDiff" [onFileRevert]="canEdit === false ? undefined : handleFileRevert" [onAskUserResponse]="canEdit === false ? undefined : handleAskUserResponse" [onSkip]="onSkipToolCall" [skipDisabledReason]="skipToolCallReason ?? null"></div>}@if (msg.aborted) {<span [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.aborted">{{ abortedText() }}</span>}@if (showLoopLimit()) {<div [attr.style]="loopCardStyle()"><div [attr.style]="loopHeaderStyle()">{{ loopLimitText() }}</div>@for (opt of loopActions(); track $index; let i = $index) {<button type="button" [disabled]="i === 0 && isLoading" (click)="opt.action()" (mouseenter)="loopEnter(i)" (mouseleave)="loopLeave(i)" [attr.style]="loopButtonStyle(i)"><span [attr.style]="loopChipStyle()">{{ loopChip(i) }}</span><span>{{ opt.label }}</span></button>}</div>}</div>}</div>`,
})
export class MessageItem {
  /** The root `<div>` React renders. */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the root in front of the host and keeps the host out of the DOM. */
  constructor() {
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /** The message to render. */
  msg!: ChatMessage

  /** Sends a message (the loop-limit card's Continue action). */
  sendMessage: MessageItemProps['sendMessage'] = () => undefined

  /** Answers a pending `ask_user` question. */
  handleAskUserResponse: MessageItemProps['handleAskUserResponse'] = () => undefined

  /** Whether a turn is running. */
  isLoading = false

  /** Transient background-phase label shown by the streaming indicator. */
  streamingStatus: string | null = null

  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: MessageItemProps['onNavigatePreview']

  /** The tool calls whose effect is undone. */
  undoneTcIds: Set<string> = new Set()

  /** Undoes or redoes one tool call's effect. */
  handleUndoToggle: MessageItemProps['handleUndoToggle'] = () => undefined

  /** Opens a file as a preview tab. */
  onFileOpen?: MessageItemProps['onFileOpen']

  /** Pins a file's tab. */
  onFileDoubleClick?: MessageItemProps['onFileDoubleClick']

  /** Opens a changed file's diff. */
  onFileDiff?: MessageItemProps['onFileDiff']

  /** Writes a file back. */
  handleFileRevert: MessageItemProps['handleFileRevert'] = () => Promise.resolve()

  /** Replaces the composer input and moves the cursor to its end. */
  setInputAndCursorEnd: MessageItemProps['setInputAndCursorEnd'] = () => undefined

  /** Opens the model picker on a chosen entry. */
  setModelPicker: MessageItemProps['setModelPicker'] = () => undefined

  /** The live conversation mode (discovery maps to `plan`). */
  chatMode: 'plan' | 'execute' = 'execute'

  /** The signed-in user's avatar (used only for author-less own messages). */
  userAvatar?: string | null

  /** Opens the clicked author's profile. */
  onProfileClick?: (user: ChatUserIdentity) => void

  /** The signed-in user's id (author-less messages belong to them). */
  currentUserId?: string

  /** Discovery phase — roomier spacing between cards. */
  discovery = false

  /** Host-supplied upgrade/sign-in CTA builder (resource-limit banners). */
  buildUpgradeCta?: MessageItemProps['buildUpgradeCta']

  /** Agent display name, interpolated into the team-only badge tip. */
  agentName?: string

  /** Whether the user may write shared project state. */
  canEdit?: boolean

  /** Skips a tool call that is running right now. */
  onSkipToolCall?: MessageItemProps['onSkipToolCall']

  /** Why this viewer cannot skip, already translated — `null` when they can. */
  skipToolCallReason?: string | null

  /** Whether the header row shows the message's time. */
  showTimestamp = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The leading glyph's pixel size. */
  protected readonly iconSize = CHAT_CARD_ICON_SIZE

  /** The static style texts. */
  protected readonly s = STYLES

  /** The reactive translation handle (locale-reactive). */
  private readonly i18n = useTranslation()

  /** The bonded theme mode, read at render the way React reads it. */
  private readonly mode = useThemeMode()

  /** The name opener the author-name button calls (React's `openAuthorProfile`). */
  protected readonly openProfile = (): void => {
    this.profileHandler()?.()
  }

  /**
   * Whether the host theme is light (the tinted rows and the mic glyph).
   * @returns True for the light theme.
   */
  protected isLight(): boolean {
    return this.mode() === 'light'
  }

  /**
   * A message sent automatically on the user's behalf.
   * @returns True for the auto-sent card.
   */
  protected isAutomatic(): boolean {
    return this.msg.role === 'user' && Boolean(this.msg.automatic)
  }

  /**
   * A human-only team note.
   * @returns True for the gold team-note row.
   */
  protected isTeamNote(): boolean {
    return Boolean(this.msg.teamOnly)
  }

  /**
   * A real, user-typed message.
   * @returns True for the user message that is not automatic.
   */
  protected isUser(): boolean {
    return this.msg.role === 'user' && !this.isAutomatic()
  }

  /**
   * Whether the user-facing row renders at all (U1's three kinds).
   * @returns True for a user, auto-sent or team-note message.
   */
  protected isUserRow(): boolean {
    return this.isUser() || this.isAutomatic() || this.isTeamNote()
  }

  /**
   * The row's `data-mol-id`.
   * @returns The row id.
   */
  protected rowId(): string {
    if (this.isTeamNote()) return 'chat-team-message'
    if (this.isAutomatic()) return 'chat-automatic-message'
    return 'chat-user-message'
  }

  /**
   * The row's class list: the small auto card, else the classic user card.
   * @returns The class string.
   */
  protected rowClass(): string {
    return this.isAutomatic()
      ? this.cm.textSize('xs')
      : this.cm.cn(this.cm.surfaceSecondary, this.cm.textSize('sm'))
  }

  /**
   * The row's bottom rhythm (React's `wrapperSpacing`).
   * @returns The style attribute text.
   */
  protected wrapperStyle(): string | null {
    return this.discovery
      ? styleText({ marginBottom: `${TIMELINE_ITEM_GAP_DISCOVERY}px` })
      : this.s.wrapper
  }

  /**
   * The row's inline chrome (the auto tint or the user / team frame).
   * @returns The style attribute text.
   */
  protected rowStyle(): string | null {
    const layout = { display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }
    if (this.isAutomatic()) {
      const { padding, border, background, borderRadius } = chatCardStyle(AUTO_SENT_ACCENT)
      return styleText({ ...layout, padding, border, background, borderRadius })
    }
    const teamNote = this.isTeamNote()
    return styleText({
      ...layout,
      borderRadius: '4px',
      padding: '10px 10px 10px 12px',
      border: teamNote
        ? `1px solid ${cssColor(NOTICE_TONE.gold.accent)}`
        : '1px solid var(--mol-chat-accent-border, var(--mol-color-primary, #3060c0))',
      ...(teamNote ? { boxShadow: `inset 3px 0 0 0 ${NOTICE_TONE.gold.accent}` } : {}),
    })
  }

  /**
   * The author's avatar: the message author's own, else the signed-in user's.
   * @returns The avatar value, or null.
   */
  protected authorAvatar(): string | null {
    return this.msg.author ? (this.msg.author.avatar ?? null) : (this.userAvatar ?? null)
  }

  /**
   * The author's display name for the avatar's accessible label.
   * @returns The name, or undefined for an author-less row.
   */
  protected authorName(): string | undefined {
    return this.msg.author?.name
  }

  /**
   * The header's author label.
   * @returns The author's name, or the translated "You".
   */
  protected headerName(): string {
    return this.msg.author?.name ?? this.i18n.t('ide.chat.you', undefined, { defaultValue: 'You' })
  }

  /**
   * The team-only badge's tip, naming the agent.
   * @returns The translated tip.
   */
  protected teamOnlyTip(): string {
    return this.i18n.t(
      'ide.chat.teamOnly.badge',
      { agentName: this.agentName ?? DEFAULT_AGENT_NAME },
      { defaultValue: 'Team only — visible to your team; {{agentName}} will ignore it' },
    )
  }

  /**
   * The dictated badge's tip.
   * @returns The translated tip.
   */
  protected dictatedTip(): string {
    return this.i18n.t('ide.chat.viaDictation.badge', undefined, {
      defaultValue: 'Dictated by voice',
    })
  }

  /**
   * The team-only badge icon's colour, as the CSSOM serializes it.
   * @returns The style attribute text.
   */
  protected goldIconStyle(): string | null {
    return styleText({ color: cssColor(NOTICE_TONE.gold.accent) })
  }

  /**
   * The mic glyph's colour (React's theme-dependent danger red).
   * @returns The style attribute text.
   */
  protected micStyle(): string | null {
    return styleText({ display: 'block', color: cssColor(this.isLight() ? '#cf222e' : '#f85149') })
  }

  /**
   * Whether the message carries a numeric timestamp.
   * @returns True when the time may render.
   */
  protected hasTimestamp(): boolean {
    return typeof this.msg.timestamp === 'number'
  }

  /**
   * Whether the message carries attachments.
   * @returns True when at least one chip renders.
   */
  protected hasAttachments(): boolean {
    return (this.msg.attachments?.length ?? 0) > 0
  }

  /**
   * The profile-click handler, when the host wires one and the author is known
   * (an author whose account is gone has no profile to open).
   * @returns The handler, or undefined.
   */
  protected profileHandler(): (() => void) | undefined {
    if (!this.onProfileClick) return undefined
    if (this.msg.author && !this.msg.author.id) return undefined
    return () => this.onProfileClick?.(this.authorIdentity())
  }

  /**
   * The author's identity for the profile click (an author-less row is the
   * signed-in user's own).
   * @returns The identity.
   */
  private authorIdentity(): ChatUserIdentity {
    return this.msg.author
      ? {
          id: this.msg.author.id,
          name: this.msg.author.name,
          avatar: this.msg.author.avatar ?? null,
        }
      : { id: this.currentUserId, avatar: this.userAvatar ?? null }
  }

  /**
   * The glyph for an attachment's media type.
   * @param mediaType - The attachment's MIME type.
   * @returns The emoji glyph.
   */
  protected attachmentIcon(mediaType: string): string {
    if (mediaType.startsWith('image/')) return '🖼️'
    if (mediaType.startsWith('audio/')) return '🎵'
    if (mediaType.startsWith('video/')) return '🎥'
    return '📄'
  }

  /**
   * A human file size (the shared `formatSize`).
   * @param size - The byte count.
   * @returns The formatted size.
   */
  protected formattedSize(size: number): string {
    return formatSize(size)
  }

  /**
   * Whether the message carries content blocks (it renders them instead of the
   * plain content).
   * @returns True when at least one block renders.
   */
  protected hasBlocks(): boolean {
    return (this.msg.blocks?.length ?? 0) > 0
  }

  /**
   * Whether a text block is the context-compaction summary React cards.
   * @param text - The block's raw text.
   * @returns True for the compaction headline (plain or blockquoted).
   */
  private isCompaction(text: string): boolean {
    return text.startsWith('**Context compacted**') || text.startsWith('> **Context compacted**')
  }

  /**
   * The assistant reply's block rows, in React's render order.
   * @returns One row per block that renders (a tool-call block with no call is
   * dropped, as React returns null for it).
   */
  protected assistantRows(): AssistantRow[] {
    const blocks = this.msg.blocks ?? []
    const streaming = this.msg.isStreaming === true
    const startedAt = this.statusStartedAt()
    const rows: AssistantRow[] = []
    blocks.forEach((block, bi) => {
      const isLast = bi === blocks.length - 1
      const key = `block-${bi}`
      if (block.type === 'thinking') {
        rows.push({
          kind: 'thinking',
          key,
          content: block.content,
          durationMs: thinkingDuration(block),
          isStreaming: streaming && isLast,
        })
        return
      }
      if (block.type === 'text') {
        if (this.isCompaction(block.content)) {
          const nlIdx = block.content.indexOf('\n\n')
          const headline = (nlIdx > -1 ? block.content.slice(0, nlIdx) : block.content).replace(
            /^>\s*/,
            '',
          )
          const summary = nlIdx > -1 ? block.content.slice(nlIdx + 2) : ''
          rows.push({ kind: 'compaction', key, headline, summary })
          return
        }
        rows.push({
          kind: 'text',
          key,
          text: block.content,
          isStreaming: isLast && streaming,
          statusLabel: isLast && streaming ? this.streamingStatus : undefined,
          statusStartedAt: startedAt,
        })
        return
      }
      if (block.type === 'verification') {
        rows.push({
          kind: 'verification',
          key,
          status: block.status,
          output: block.output,
          workspaces: block.workspaces,
          categories: block.categories,
          renderCheckUnavailable: block.renderCheckUnavailable,
        })
        return
      }
      if (block.type === 'resource_limit') {
        rows.push({ kind: 'resourceLimit', key, message: block.message })
        return
      }
      const toolCall = this.msg.toolCalls?.find((call) => call.id === block.id)
      if (!toolCall) return
      rows.push({ kind: 'toolCall', key, toolCall })
    })
    return rows
  }

  /**
   * A pending `ask_user` whose tool_call block was never persisted still
   * renders (G55): the record is the truth — a card the user cannot see parks
   * the whole turn with no way forward.
   * @returns The orphan cards, in the message's tool-call order.
   */
  protected orphanAskCalls(): ToolCall[] {
    const blocks = this.msg.blocks
    const toolCalls = this.msg.toolCalls
    if (!blocks || blocks.length === 0 || !toolCalls) return []
    return toolCalls.filter(
      (tc) =>
        tc.name === 'ask_user' &&
        tc.output !== null &&
        typeof tc.output === 'object' &&
        'status' in tc.output &&
        tc.output.status === 'awaiting_response' &&
        !blocks.some((block) => block.type === 'tool_call' && block.id === tc.id),
    )
  }

  /**
   * The tool-call cards of a message that has no blocks at all.
   * @returns The cards, or an empty list when the message has blocks.
   */
  protected plainToolCalls(): ToolCall[] {
    const toolCalls = this.msg.toolCalls
    if (!toolCalls || toolCalls.length === 0 || (this.msg.blocks?.length ?? 0) > 0) return []
    return toolCalls
  }

  /**
   * The turn's start for the streaming indicator's elapsed timer.
   * @returns The message timestamp, or undefined when it is not numeric.
   */
  protected statusStartedAt(): number | undefined {
    return typeof this.msg.timestamp === 'number' ? this.msg.timestamp : undefined
  }

  /**
   * The aborted-turn note's text.
   * @returns The translated note.
   */
  protected abortedText(): string {
    return this.i18n.t('ide.chat.responseStopped', undefined, { defaultValue: 'Response stopped' })
  }

  /**
   * Whether the loop-limit card renders (the cap was hit and the turn ended).
   * @returns True when `loopLimitReached` is set and the reply is not streaming.
   */
  protected showLoopLimit(): boolean {
    return Boolean(this.msg.loopLimitReached) && !this.msg.isStreaming
  }

  /**
   * The loop-limit card's heading.
   * @returns The translated heading with the cap interpolated.
   */
  protected loopLimitText(): string {
    return this.i18n.t(
      'ide.chat.loopLimitReached',
      { max: this.msg.loopLimitReached ?? 0 },
      { defaultValue: 'Reached the maximum of {{max}} tool iterations.' },
    )
  }

  /**
   * The loop-limit card's actions: switch model, raise the cap, or continue.
   * @returns The labeled actions, in React's order.
   */
  protected loopActions(): LoopAction[] {
    const t = this.i18n.t
    return [
      {
        label: t('ide.chat.changeModel', undefined, { defaultValue: 'Change model' }),
        action: () => {
          this.setInputAndCursorEnd('/model ')
          this.setModelPicker({ selectedIdx: -1, mode: this.chatMode, text: '/model ' })
        },
      },
      {
        label: t('ide.chat.increaseLoops', undefined, { defaultValue: 'Increase max loops' }),
        action: () => {
          this.setInputAndCursorEnd('/maxloops ')
        },
      },
      {
        label: t('ide.chat.continueButton', undefined, { defaultValue: 'Continue' }),
        action: () => {
          this.sendMessage(
            t('ide.chat.continuePrompt', undefined, {
              defaultValue: 'Continue implementing from where you left off.',
            }),
          )
        },
      },
    ]
  }

  /**
   * A loop-limit row's letter chip.
   * @param index - The action's position (0 = A).
   * @returns The chip's letter.
   */
  protected loopChip(index: number): string {
    return String.fromCharCode(65 + index)
  }

  /**
   * The host's CTA buttons for a resource-limit banner (React calls
   * `buildUpgradeCta?.({})`).
   * @returns The built actions.
   */
  protected resourceLimitAction(): ChatEventCardAction | ChatEventCardAction[] | null | undefined {
    return this.buildUpgradeCta?.({})
  }

  /**
   * The compaction disclosure's summary chrome.
   * @returns The style attribute text.
   */
  protected compactionSummaryStyle(): string | null {
    return styleText({
      cursor: 'pointer',
      textAlign: 'center',
      listStyle: 'none',
      padding: '3px 0px',
      borderRadius: '0 0 8px 8px',
      background: this.isLight() ? 'rgba(64, 112, 224, 0.05)' : 'rgba(64, 112, 224, 0.08)',
      transition: 'background 100ms',
    })
  }

  /**
   * The compaction chevron's colour and motion.
   * @returns The style attribute text.
   */
  protected compactionChevronStyle(): string | null {
    return styleText({
      display: 'inline-block',
      verticalAlign: 'middle',
      transition: 'transform 150ms',
      color: this.isLight() ? 'rgb(40, 80, 160)' : 'rgb(128, 176, 255)',
    })
  }

  /**
   * React's `details` `onToggle`: rotate the summary's chevron to follow the
   * open state.
   * @param event - The toggle event on the `<details>` element.
   */
  protected compactionToggle(event: Event): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLDetailsElement)) return
    const chevron = element.querySelector('[data-chevron]')
    if (chevron instanceof HTMLElement) {
      chevron.style.transform = element.open ? 'rotate(180deg)' : 'rotate(0deg)'
    }
  }

  /**
   * The compaction summary's hover background (React's `onMouseEnter`).
   * @param event - The mouse event.
   */
  protected compactionSummaryEnter(event: Event): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLElement)) return
    element.style.background = this.isLight()
      ? 'rgba(64, 112, 224, 0.12)'
      : 'rgba(64, 112, 224, 0.18)'
  }

  /**
   * The compaction summary's resting background (React's `onMouseLeave`).
   * @param event - The mouse event.
   */
  protected compactionSummaryLeave(event: Event): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLElement)) return
    element.style.background = this.isLight()
      ? 'rgba(64, 112, 224, 0.05)'
      : 'rgba(64, 112, 224, 0.08)'
  }

  /**
   * The loop-limit card's frame.
   * @returns The style attribute text.
   */
  protected loopCardStyle(): string | null {
    return styleText({
      marginTop: '8px',
      borderRadius: '8px',
      border: `1px solid ${this.borderColor()}`,
      background: this.isLight() ? 'rgb(246, 248, 250)' : 'rgba(255, 255, 255, 0.04)',
      overflow: 'hidden',
    })
  }

  /**
   * The loop-limit card's heading divider.
   * @returns The style attribute text.
   */
  protected loopHeaderStyle(): string | null {
    return styleText({
      padding: '10px 12px',
      fontSize: '13px',
      fontWeight: 600,
      borderBottom: `1px solid ${this.borderColor()}`,
    })
  }

  /** The loop-limit row the pointer is over (React tints it in `onMouseEnter`). */
  protected hoveredLoop: number | null = null

  /**
   * One loop-limit action row's chrome. React sets `border` and then
   * `borderTop`, which the CSSOM serializes as the longhand triple. The hovered
   * row carries the hover tint.
   * @param index - The action's position (the first row draws no top border).
   * @returns The style attribute text.
   */
  protected loopButtonStyle(index: number): string | null {
    const common = {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      padding: '8px 12px',
      background: this.hoveredLoop === index ? this.loopHoverBackground() : 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '13px',
      transition: 'background 80ms',
    }
    if (index === 0) {
      return styleText({
        ...common,
        borderWidth: 'medium',
        borderStyle: 'none',
        borderColor: 'currentcolor',
        borderImage: 'none',
      })
    }
    return styleText({
      ...common,
      borderWidth: '1px medium medium',
      borderStyle: 'solid none none',
      borderColor: `${this.borderColor()} currentcolor currentcolor`,
      borderImage: 'none',
    })
  }

  /**
   * A loop-limit row's letter chip.
   * @returns The style attribute text.
   */
  protected loopChipStyle(): string | null {
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: '5px',
      border: `1px solid ${this.borderColor()}`,
      background: this.isLight() ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.08)',
      color: this.isLight() ? 'rgb(87, 96, 106)' : 'rgb(132, 141, 151)',
      fontSize: '11px',
      fontWeight: 600,
      flexShrink: 0,
      fontFamily: '"SF Mono", Menlo, Consolas, monospace',
    })
  }

  /**
   * The loop-limit card's frame colour, as the CSSOM serializes it.
   * @returns The border colour.
   */
  private borderColor(): string {
    return this.isLight() ? 'rgb(209, 217, 224)' : 'rgba(255, 255, 255, 0.1)'
  }

  /**
   * A loop-limit row's hover tint, as the CSSOM serializes it.
   * @returns The background colour.
   */
  private loopHoverBackground(): string {
    return this.isLight() ? 'rgb(234, 238, 242)' : 'rgba(255, 255, 255, 0.06)'
  }

  /**
   * Tints a loop-limit row (React's `onMouseEnter`). The tint is rendered into
   * the row's style text rather than written through the CSSOM: a CSSOM write
   * to a style parsed from text re-serializes the whole declaration, which
   * React's CSSOM-built row never does.
   * @param index - The row's position.
   */
  protected loopEnter(index: number): void {
    this.hoveredLoop = index
  }

  /**
   * Returns a loop-limit row to its resting background (React's `onMouseLeave`).
   * @param index - The row's position.
   */
  protected loopLeave(index: number): void {
    if (this.hoveredLoop === index) this.hoveredLoop = null
  }
}
