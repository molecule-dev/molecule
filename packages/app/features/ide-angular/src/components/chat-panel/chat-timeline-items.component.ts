/**
 * React's section “Every item renders inside its own boundary” (ChatPanel.tsx
 * lines 5301–5589) — the per-item timeline dispatch and the live error banner
 * that sits between the transcript and the persistent activity slot.
 *
 * Each timeline item kind renders to its own row or card — a commit card, an
 * activity card, a tip card, one of the system-card variants, or a message row
 * (a persisted commit record renders as a commit card) — and every one is
 * wrapped in its own {@link ChatItemBoundary}, so one malformed model-authored
 * payload costs one inline notice, never the whole IDE. A line-placed timestamp
 * renders above the item, inside the same boundary, from the timeline slice's
 * decision.
 *
 * The banner shows the resource-limit upgrade card (with the host's CTA built
 * from the backend's whole refusal), the calm gold view-only notice for a
 * read-only viewer's access denial, or the plain error line — React's branch
 * order.
 *
 * React's root here is a set of siblings, so the host holds only its children:
 * they render in its place and the host leaves the page (`placeContentBefore` +
 * `setElementPresent`), React's fragment DOM exactly — as `ChatTimestamp` does
 * for a fragment root.
 *
 * @module
 */

import { Component, computed, ElementRef, inject } from '@angular/core'

import type { ChatErrorMeta, ChatMessage } from '@molecule/app-ai-chat'
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_PRODUCT_NAME,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { Activity, ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import {
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import type {
  ActivityCardEntry,
  ChatTimelineItem,
  CommitCard,
  PlainSystemCard,
  SystemCard,
  TipCardEntry,
} from '@molecule/app-ide-panel-logic/panels'
import { tipText, upgradeContextFromError } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ActivityCard } from '../../components/activity-card.component.js'
import { ChatTimestamp } from '../../components/chat-timestamp.component.js'
import { Icon } from '../../components/icon.component.js'
import { CardSegment } from '../../parts/card-segment.component.js'
import { ChatItemBoundary } from '../../parts/chat-item-boundary.component.js'
import { CommitCardItem } from '../../parts/commit-card-item.component.js'
import { HelpCard } from '../../parts/help-card.component.js'
import { MessageItem } from '../../parts/message-item.component.js'
import { NoticeCard, ResourceLimitBanner } from '../../parts/notice-card.component.js'
import { TipCard } from '../../parts/tip-card.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatGit } from './chat-git.slice.js'
import type { ChatInnerProps } from './chat-inner-state.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import type { ChatTimelineTimestampLine } from './chat-timeline.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'
import { ChatTips } from './chat-tips.slice.js'
import { ChatUndo } from './chat-undo.slice.js'

/** The skills-loaded notice's wrapper: centered, with the timeline's row gap. */
const SKILLS_LOADED_WRAP_STYLE = styleText({
  textAlign: 'center',
  marginBottom: TIMELINE_ITEM_GAP,
})

/**
 * The skills-loaded notice's button reset: plain text like the build-phase
 * notice — no border, fill or pill.
 */
const SKILLS_LOADED_BUTTON_STYLE = styleText({
  background: 'none',
  border: 'none',
  margin: 0,
  padding: '6px 0',
  fontFamily: 'inherit',
  cursor: 'pointer',
})

/** The viewer-denied notice's icon: fixed size, gold, nudged to the first line. */
const VIEWER_NOTICE_ICON_STYLE = styleText({
  flexShrink: 0,
  marginTop: 1,
  color: NOTICE_TONE.gold.accent,
})

/** The viewer-denied notice's text column. */
const VIEWER_NOTICE_TEXT_STYLE = styleText({ flex: 1 })

/** The plain error line's only inline style. */
const ERROR_STYLE = styleText({ borderRadius: '6px' })

/** The `/help` card's host-supplied upgrade section. */
type HelpUpgradeSection = NonNullable<
  ReturnType<NonNullable<ChatInnerProps['buildHelpUpgradeSection']>>
>

/**
 * Renders React's “Every item renders inside its own boundary” section: the
 * timeline's visible items, each inside its own boundary, then the live error
 * banner.
 */
@Component({
  selector: 'div[mol-chat-timeline-items]',
  standalone: true,
  imports: [
    ActivityCard,
    CardSegment,
    ChatItemBoundary,
    ChatTimestamp,
    CommitCardItem,
    HelpCard,
    Icon,
    MessageItem,
    NoticeCard,
    ResourceLimitBanner,
    TipCard,
  ],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@for (item of items(); track itemKey(item)) {
  <ng-template #row>
    @if (timestampLine(item); as stamp) {<div mol-chat-timestamp [timestamp]="stamp.timestamp" variant="line" [align]="stamp.align"></div>}
    @if (commitCard(item); as card) {<div mol-commit-card-item [card]="card" [onRevert]="revertHandler()"></div>}
    @if (activityEntry(item); as entry) {<button mol-activity-card [activity]="entry.activity" [onActivityClick]="activityClick()"></button>}
    @if (tipEntry(item); as entry) {<div mol-tip-card [text]="tipLine(entry)" [accent]="entry.accent" [icon]="entry.icon" [onDismiss]="dismiss(entry.id)"></div>}
    @if (systemCard(item); as card) {
      @if (card.variant === 'help') {<div mol-help-card [isLight]="isLight()" [agentName]="agentName()" [productName]="productName()" [upgradeLines]="helpLines()" [upgradeAction]="helpAction()"></div>}
      @else if (card.variant === 'skillsLoaded') {<div [attr.style]="skillsWrapStyle"><button type="button" data-mol-id="chat-skills-loaded" [attr.class]="skillsButtonClass" [attr.style]="skillsButtonStyle" (click)="openSkills()" (mouseenter)="underline($event)" (mouseleave)="ununderline($event)">{{ card.text }}</button></div>}
      @else {
        @if (plainCard(card); as plain) {
          @if (tipTone(plain); as tone) {<div mol-notice-card [tone]="tone" [text]="plain.text" [content]="plain.content" [action]="plain.action" [icon]="plain.icon"></div>}
          @else {<div [attr.class]="plainNoticeClass" [attr.style]="plainNoticeStyle(plain)">@if (plain.content; as content) {@for (segment of content; track $index) {<div mol-card-segment [segment]="segment"></div>}} @else {{{ plain.text }}}</div>}
        }
      }
    }
    @if (message(item); as msg) {
      @if (commitRecordCard(msg); as card) {<div mol-commit-card-item [card]="card" [onRevert]="revertHandler()"></div>}
      @else {<div mol-message-item [msg]="msg" [sendMessage]="sendMessage" [handleAskUserResponse]="handleAskUserResponse" [isLoading]="isLoading()" [streamingStatus]="streamingStatus()" [onNavigatePreview]="onNavigatePreview()" [undoneTcIds]="undoneTcIds()" [handleUndoToggle]="undoToggle" [onFileOpen]="onFileOpen()" [onFileDoubleClick]="onFileDoubleClick()" [onFileDiff]="onFileDiff()" [handleFileRevert]="fileRevert" [setInputAndCursorEnd]="setInputAndCursorEnd" [setModelPicker]="setModelPicker" [chatMode]="chatMode()" [userAvatar]="userAvatar()" [onProfileClick]="onProfileClick()" [currentUserId]="currentUserId()" [showTimestamp]="shownTimestampIds().has(msg.id)" [discovery]="discovery()" [buildUpgradeCta]="buildUpgradeCta()" [agentName]="agentName()" [canEdit]="canEdit()" [onSkipToolCall]="onSkipToolCall()" [skipToolCallReason]="skipToolCallReason()"></div>}
    }
  </ng-template>
  <mol-chat-item-boundary [render]="row" [onError]="renderError()"></mol-chat-item-boundary>
}
@if (bannerText(); as errorText) {
  @if (errorMeta()?.limitType) {<div mol-resource-limit-banner [message]="errorText" [action]="upgradeAction()"></div>}
  @else if (viewerDenied()) {
    @if (viewerDeniedFlash()) {<div data-mol-id="chat-viewer-denied-notice" [attr.class]="viewerNoticeClass" [attr.style]="viewerNoticeStyle"><svg mol-icon [name]="'people'" [size]="iconSize" aria-hidden="true" [attr.style]="viewerNoticeIconStyle"></svg><span [attr.style]="viewerNoticeTextStyle">{{ viewerNoticeText() }}</span></div>}
  }
  @else {<div [attr.class]="errorClass" [attr.style]="errorStyle">{{ errorText }}</div>}
}`,
})
export class ChatTimelineItems {
  /** The shared state, read for the props (the host callbacks and the gates). */
  private readonly state = inject(ChatInnerState)

  /** The timeline slice: the rendered page, the timestamp plan and the banner gates. */
  private readonly timeline = inject(ChatTimeline)

  /** The chat session: the transcript's live status, the error and the sender. */
  private readonly chat = inject(ChatChat)

  /** The tips slice: dismissing one tip card. */
  private readonly tips = inject(ChatTips)

  /** The git slice: reverting a commit card. */
  private readonly git = inject(ChatGit)

  /** The overlay slice: opening the `/skills` browser from the loaded-skills notice. */
  private readonly overlay = inject(ChatOverlay)

  /** The undo slice: the undone tool calls and their toggle. */
  private readonly undo = inject(ChatUndo)

  /** The input slice: the composer setter a message row's link hands back. */
  private readonly input = inject(ChatInput)

  /** The composer slice: the model-picker setter a message row opens. */
  private readonly composer = inject(ChatComposer)

  /** The tests slice: skipping a running tool call. */
  private readonly tests = inject(ChatTests)

  /** The component's host element (React's fragment: it renders nothing). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The rendered page of the timeline (React's `renderedTimeline`). */
  protected readonly items = computed<ChatTimelineItem[]>(() => this.timeline.renderedTimeline())

  /** The gold notice's icon size. */
  protected readonly iconSize = CHAT_CARD_ICON_SIZE

  /** The skills-loaded notice's wrapper style. */
  protected readonly skillsWrapStyle = SKILLS_LOADED_WRAP_STYLE

  /** The skills-loaded notice's button reset. */
  protected readonly skillsButtonStyle = SKILLS_LOADED_BUTTON_STYLE

  /** The viewer-denied notice's icon style. */
  protected readonly viewerNoticeIconStyle = VIEWER_NOTICE_ICON_STYLE

  /** The viewer-denied notice's text-column style. */
  protected readonly viewerNoticeTextStyle = VIEWER_NOTICE_TEXT_STYLE

  /** The plain error line's inline style. */
  protected readonly errorStyle = ERROR_STYLE

  /** The skills-loaded notice's ClassMap classes. */
  protected readonly skillsButtonClass: string

  /** The plain notice's ClassMap classes. */
  protected readonly plainNoticeClass: string

  /** The viewer-denied notice's ClassMap classes. */
  protected readonly viewerNoticeClass: string

  /** The plain error line's ClassMap classes. */
  protected readonly errorClass: string

  /** The viewer-denied notice's inline chrome. */
  protected readonly viewerNoticeStyle: string | null

  /** React's `sendMessage`, as the message rows receive it. */
  protected readonly sendMessage = this.chat.sendMessage

  /** React's `handleAskUserResponse`, as the message rows receive it. */
  protected readonly handleAskUserResponse = this.chat.handleAskUserResponse

  /** React's stable `handleRevertCommit`, as the commit cards receive it. */
  private readonly revert = (hash: string): Promise<string | undefined> =>
    this.git.handleRevertCommit(hash)

  /** React's `handleUndoToggle`, bound to the undo slice. */
  protected readonly undoToggle = (toolCallId: string, undone: boolean): void =>
    this.undo.handleUndoToggle(toolCallId, undone)

  /** React's `handleFileRevert`, bound to the git slice. */
  protected readonly fileRevert = (path: string, content: string): Promise<void> =>
    this.git.handleFileRevert(path, content)

  /** React's `setInputAndCursorEnd`, bound to the input slice. */
  protected readonly setInputAndCursorEnd = (value: string): void =>
    this.input.setInputAndCursorEnd(value)

  /** React's `setModelPicker`, bound to the composer slice. */
  protected readonly setModelPicker: ChatComposer['setModelPicker'] = (next) =>
    this.composer.setModelPicker(next)

  /** React's `handleSkipToolCall`, as the message rows receive it. */
  private readonly skipToolCall = (toolCallId: string): Promise<boolean | void> =>
    this.tests.handleSkipToolCall(toolCallId)

  /** The `/help` card's host-supplied upgrade section, read once per props change. */
  private readonly helpSection = computed<HelpUpgradeSection | null>(
    () => this.state.props().buildHelpUpgradeSection?.() ?? null,
  )

  /** The resource-limit banner's host CTA, built once per refusal. */
  private readonly limitAction = computed<
    ChatEventCardAction | ChatEventCardAction[] | null | undefined
  >(() => {
    const meta = this.chat.errorMeta()
    if (!meta) return undefined
    return this.state.props().buildUpgradeCta?.(upgradeContextFromError(meta)) ?? undefined
  })

  /** One dismiss handler per tip id, so a row's callback identity never churns. */
  private readonly dismissers = new Map<string, () => void>()

  /** One commit card per persisted commit-record message, by message identity. */
  private readonly recordCards = new WeakMap<ChatMessage, CommitCard>()

  /** Composes the ClassMap class strings and the viewer notice's chrome once; the host renders its children in its place. */
  constructor() {
    this.skillsButtonClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.plainNoticeClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.viewerNoticeClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.errorClass = this.cm.cn(
      this.cm.textSize('sm'),
      this.cm.sp('p', 2),
      this.cm.sp('mb', 2),
      this.cm.bgErrorSubtle,
      this.cm.textError,
    )
    this.viewerNoticeStyle = styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
      ...chatCardStyle(NOTICE_TONE.gold.accent),
      lineHeight: 1.5,
    })
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * React's key for one timeline item: a message's id, or the card's id.
   *
   * @param item - The timeline item.
   * @returns Its stable id.
   */
  protected itemKey(item: ChatTimelineItem): string {
    return item.kind === 'message' ? item.msg.id : item.card.id
  }

  /**
   * The timestamp line to render above the item, or null for none. React wraps
   * the item's node only when it is not null, so an unrecognized system-card
   * variant carries no line.
   *
   * @param item - The timeline item being rendered.
   * @returns The line to render above the item, or null.
   */
  protected timestampLine(item: ChatTimelineItem): ChatTimelineTimestampLine | null {
    if (item.kind === 'system') {
      const variant = item.card.variant
      if (variant !== undefined && variant !== 'help' && variant !== 'skillsLoaded') return null
    }
    return this.timeline.withTimelineTimestamp(item)
  }

  /**
   * The item's commit card, when it is one.
   *
   * @param item - The timeline item.
   * @returns The commit card, or null for another kind.
   */
  protected commitCard(item: ChatTimelineItem): CommitCard | null {
    return item.kind === 'commit' ? item.card : null
  }

  /**
   * The item's activity-card entry, when it is one.
   *
   * @param item - The timeline item.
   * @returns The entry, or null for another kind.
   */
  protected activityEntry(item: ChatTimelineItem): ActivityCardEntry | null {
    return item.kind === 'activity' ? item.card : null
  }

  /**
   * The item's tip-card entry, when it is one.
   *
   * @param item - The timeline item.
   * @returns The entry, or null for another kind.
   */
  protected tipEntry(item: ChatTimelineItem): TipCardEntry | null {
    return item.kind === 'tip' ? item.card : null
  }

  /**
   * The item's system card, when it is one.
   *
   * @param item - The timeline item.
   * @returns The card, or null for another kind.
   */
  protected systemCard(item: ChatTimelineItem): SystemCard | null {
    return item.kind === 'system' ? item.card : null
  }

  /**
   * The system card narrowed to the plain (unvariant) kind, which is the only
   * one left after the `/help` and loaded-skills branches.
   *
   * @param card - The system card.
   * @returns The plain card, or null for an unrecognized variant.
   */
  protected plainCard(card: SystemCard): PlainSystemCard | null {
    return card.variant === undefined ? card : null
  }

  /**
   * The item's message, when it is one.
   *
   * @param item - The timeline item.
   * @returns The message, or null for another kind.
   */
  protected message(item: ChatTimelineItem): ChatMessage | null {
    return item.kind === 'message' ? item.msg : null
  }

  /**
   * The commit card a persisted commit record renders as, kept per message so
   * its identity (and the card row's state) survives change detection.
   *
   * @param msg - The message.
   * @returns The commit card, or null when the message carries no record.
   */
  protected commitRecordCard(msg: ChatMessage): CommitCard | null {
    const record = msg.commitRecord
    if (!record) return null
    const existing = this.recordCards.get(msg)
    if (existing) return existing
    const card: CommitCard = {
      id: msg.id,
      message: record.message,
      files: [...record.files],
      timestamp: msg.timestamp,
      status: 'done',
      hash: record.hash,
    }
    this.recordCards.set(msg, card)
    return card
  }

  /**
   * The tone a plain notice renders with: its own, or `info` when it is
   * emphasized or carries an action; null keeps it a plain muted line.
   *
   * @param card - The plain system card.
   * @returns The notice tone, or null.
   */
  protected tipTone(
    card: PlainSystemCard,
  ): 'info' | 'gold' | 'upgrade' | 'success' | 'signup' | null {
    return card.tone ?? (card.emphasized || card.action ? 'info' : null)
  }

  /**
   * The plain notice's inline layout: centered for a one-liner, left-aligned
   * monospace for a multi-line body.
   *
   * @param card - The plain system card.
   * @returns React's style object as text.
   */
  protected plainNoticeStyle(card: PlainSystemCard): string | null {
    const isMultiLine = card.text.includes('\n')
    return styleText({
      textAlign: isMultiLine ? 'left' : 'center',
      padding: isMultiLine ? '8px 12px' : '6px 0',
      marginBottom: TIMELINE_ITEM_GAP,
      whiteSpace: isMultiLine ? 'pre-wrap' : undefined,
      fontFamily: isMultiLine ? 'var(--mol-font-mono, monospace)' : undefined,
      lineHeight: isMultiLine ? 1.5 : undefined,
    })
  }

  /**
   * The tip's sentence, translated at render so a locale switch re-translates
   * it (the `/` and `@` code segments come from the translated sentence).
   *
   * @param entry - The tip card.
   * @returns The translated sentence.
   */
  protected tipLine(entry: TipCardEntry): string {
    return tipText(this.state.env.t, entry.tip, { agentName: this.agentName() })
  }

  /**
   * The dismiss handler for one tip card, cached so its identity is stable.
   *
   * @param id - The tip card's id.
   * @returns The handler TipCard calls.
   */
  protected dismiss(id: string): () => void {
    const existing = this.dismissers.get(id)
    if (existing) return existing
    const handler = (): void => this.tips.dismissTip(id)
    this.dismissers.set(id, handler)
    return handler
  }

  /** Opens the `/skills` browser overlay, as typing `/skills` does. */
  protected openSkills(): void {
    this.overlay.openPanelOverlay('skills')
  }

  /**
   * Underlines the loaded-skills button while hovered (its only clickability
   * hint).
   *
   * @param event - The mouse event.
   */
  protected underline(event: MouseEvent): void {
    const element = event.currentTarget
    if (element instanceof HTMLElement) element.style.textDecoration = 'underline'
  }

  /**
   * Restores the loaded-skills button's plain look when the pointer leaves.
   *
   * @param event - The mouse event.
   */
  protected ununderline(event: MouseEvent): void {
    const element = event.currentTarget
    if (element instanceof HTMLElement) element.style.textDecoration = 'none'
  }

  /** Whether the theme is light (React's `isLight`). */
  protected isLight(): boolean {
    return this.state.env.isLight()
  }

  /** The agent's display name (React's resolved `agentName`). */
  protected agentName(): string {
    return this.state.props().agentName ?? DEFAULT_AGENT_NAME
  }

  /** The host product's display name (React's resolved `productName`). */
  protected productName(): string {
    return this.state.props().productName ?? DEFAULT_PRODUCT_NAME
  }

  /**
   * The `/help` card's host-supplied upgrade lines, read at render time.
   *
   * @returns The lines, or undefined when the host supplies none.
   */
  protected helpLines(): string[] | undefined {
    return this.helpSection()?.lines
  }

  /**
   * The `/help` card's host-supplied upgrade action, read at render time.
   *
   * @returns The action, or undefined when the host supplies none.
   */
  protected helpAction(): ChatEventCardAction | ChatEventCardAction[] | undefined {
    return this.helpSection()?.action ?? undefined
  }

  /**
   * The host's CTA for the resource-limit banner, built from the backend's
   * whole refusal.
   *
   * @returns The action(s), or undefined when the host supplies none.
   */
  protected upgradeAction(): ChatEventCardAction | ChatEventCardAction[] | null | undefined {
    return this.limitAction()
  }

  /** The commit cards' revert handler, or undefined for a read-only viewer. */
  protected revertHandler(): ((hash: string) => Promise<string | undefined>) | undefined {
    return this.state.props().canEdit === false ? undefined : this.revert
  }

  /** The activity cards' click handler. */
  protected activityClick(): ((activity: Activity) => void) | undefined {
    return this.state.props().onActivityClick
  }

  /** The render-error reporter every boundary forwards to. */
  protected renderError(): ChatInnerProps['onRenderError'] {
    return this.state.props().onRenderError
  }

  /** The live error text the banner states, or null when it stays silent. */
  protected bannerText(): string | null {
    const error = this.chat.error()
    if (!error || this.timeline.staleAnonymousLimit()) return null
    return error
  }

  /** The live error's limit metadata. */
  protected errorMeta(): ChatErrorMeta | null {
    return this.chat.errorMeta()
  }

  /** Whether the error is a read-only viewer's access denial. */
  protected viewerDenied(): boolean {
    return this.timeline.isViewerAccessDenied()
  }

  /** Whether the brief view-only notice still shows. */
  protected viewerDeniedFlash(): boolean {
    return this.timeline.viewerDeniedFlash()
  }

  /** The viewer-denied notice's sentence. */
  protected viewerNoticeText(): string {
    return this.state.env.t('ide.chat.viewerReadOnly', undefined, {
      defaultValue:
        "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
    })
  }

  /** Whether a turn is running. */
  protected isLoading(): boolean {
    return this.chat.isLoading()
  }

  /** The transient background-phase label a streaming reply shows. */
  protected streamingStatus(): string | null {
    return this.chat.streamingStatus()
  }

  /** The host's preview-navigation callback. */
  protected onNavigatePreview(): ((path: string) => void) | undefined {
    return this.state.props().onNavigatePreview
  }

  /** The tool calls whose effect is undone. */
  protected undoneTcIds(): Set<string> {
    return this.undo.undoneTcIds()
  }

  /** The host's file-open callback. */
  protected onFileOpen(): ((path: string, opts?: { focus?: boolean }) => void) | undefined {
    return this.state.props().onFileOpen
  }

  /** The host's file double-click callback. */
  protected onFileDoubleClick(): ((path: string) => void) | undefined {
    return this.state.props().onFileDoubleClick
  }

  /** The host's diff-view callback. */
  protected onFileDiff():
    ((path: string, diff?: { original: string; modified: string }) => void) | undefined {
    return this.state.props().onFileDiff
  }

  /** The live conversation mode a message row renders in. */
  protected chatMode(): 'plan' | 'execute' {
    return this.chat.liveModelMode()
  }

  /** The signed-in user's avatar. */
  protected userAvatar(): string | null | undefined {
    return this.state.props().userAvatar
  }

  /** The host's profile-open callback. */
  protected onProfileClick(): ChatInnerProps['onProfileClick'] {
    return this.state.props().onProfileClick
  }

  /** The signed-in user's id. */
  protected currentUserId(): string | undefined {
    return this.state.props().currentUserId
  }

  /** Whether the item lives in the initial discovery phase. */
  protected discovery(): boolean {
    return this.state.props().discovery === true
  }

  /** The host's upgrade/sign-in CTA builder. */
  protected buildUpgradeCta(): ChatInnerProps['buildUpgradeCta'] {
    return this.state.props().buildUpgradeCta
  }

  /** Whether the viewer may write shared project state. */
  protected canEdit(): boolean | undefined {
    return this.state.props().canEdit
  }

  /** The ids whose timestamp line the plan shows. */
  protected shownTimestampIds(): ReadonlySet<string> {
    return this.timeline.shownTimestampIds()
  }

  /** The skip handler a message row receives, when the host supports it. */
  protected onSkipToolCall(): ((toolCallId: string) => void | Promise<boolean | void>) | undefined {
    return this.state.props().skipToolCall ? this.skipToolCall : undefined
  }

  /** Why this viewer cannot skip a running tool call, or null when they can. */
  protected skipToolCallReason(): string | null {
    return this.state.props().canEdit === false
      ? this.state.env.t('ide.chat.skipToolCallViewer', undefined, {
          defaultValue: 'Only editors can skip this.',
        })
      : null
  }
}
