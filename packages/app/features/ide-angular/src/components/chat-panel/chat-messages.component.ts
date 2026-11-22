/**
 * React's section “── Messages ──” (ChatPanel.tsx lines 5236–5300): the scroll
 * port for the transcript, the empty-conversation hint and the scroll sentinel.
 *
 * React nests the per-item dispatch (unit U4) and the persistent activity slot
 * inside this container, before the scroll sentinel, and so does this template.
 *
 * The empty hint renders ONLY when there is literally nothing else to show: no
 * timeline items, no local or remote streaming, no sandbox-boot wait, no error
 * banner — so it can never coexist with content. Its height reserves the 28px
 * always-in-layout activity slot, so an empty conversation never grows a
 * scrollbar.
 *
 * The host element IS React's log port (its `role`, `aria-*`, ClassMap class
 * and inline layout), so the port adds no node.
 *
 * @module
 */

import { type AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../icon.component.js'
import { ChatActivitySlot } from './chat-activity-slot.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'
import { ChatTimelineItems } from './chat-timeline-items.component.js'

/** One element's inline style, in React's style-object shape. */
type StyleObject = Record<string, unknown>

/**
 * React's “── Messages ──” section: the transcript's scroll port.
 */
@Component({
  selector: 'div[mol-chat-messages]',
  standalone: true,
  imports: [Icon, ChatActivitySlot, ChatTimelineItems],
  host: {
    role: 'log',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
    '[attr.aria-label]': 'label()',
    '[class]': 'rootClass()',
    '[style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (showEmptyHint()) {<div data-mol-id="chat-empty-hint" [class]="hintClass" [style]="hintStyle"><svg mol-icon [name]="'logo-mark'" [size]="28" aria-hidden="true" [style.opacity]="'0.5'"></svg><span [style.max-width]="'320px'">{{ emptyText() }}</span></div>}<div mol-chat-timeline-items></div><div mol-chat-activity-slot></div><div #sentinel></div>`,
})
export class ChatMessages implements AfterViewInit {
  /** The shared state, read for the env (the translation) and the props. */
  private readonly state = inject(ChatInnerState)

  /** The scroll slice: the container and sentinel refs. */
  private readonly scroll = inject(ChatScroll)

  /** The timeline slice: whether the transcript holds anything to show. */
  private readonly timeline = inject(ChatTimeline)

  /** The chat session: the loading, streaming and error gates. */
  private readonly chat = inject(ChatChat)

  /** The host element (React's log port). */
  private readonly host = inject(ElementRef<HTMLDivElement>)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The empty hint's ClassMap classes. */
  protected readonly hintClass: string

  /** The empty hint's inline layout. */
  protected readonly hintStyle: StyleObject = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    // Height reserves the 28px always-in-layout activity slot below, so an
    // empty conversation never grows a scrollbar.
    height: 'calc(100% - 28px)',
    minHeight: '120px',
    textAlign: 'center',
  }

  /** The scroll sentinel after the newest message. */
  @ViewChild('sentinel') private sentinel?: ElementRef<HTMLDivElement>

  /** Composes the hint's ClassMap classes once. */
  constructor() {
    this.hintClass = this.cm.cn(this.cm.textSize('sm'), this.cm.textMuted)
  }

  /** React's refs attach during commit, before any effect runs. */
  ngAfterViewInit(): void {
    this.scroll.messagesContainerRef.current = this.host.nativeElement
    this.scroll.messagesEndRef.current = this.sentinel?.nativeElement ?? null
  }

  /**
   * React's root ClassMap class (`cm.sp('p', 3)`).
   *
   * @returns The class string for the host element.
   */
  protected rootClass(): string {
    return this.cm.sp('p', 3)
  }

  /**
   * React's root inline layout: the flexible scroll port, the thin overlay
   * scrollbar and native scroll anchoring off (the panel corrects the offset).
   *
   * @returns React's style object for the host element.
   */
  protected rootStyle(): StyleObject {
    return {
      flex: 1,
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      overflowAnchor: 'none',
    }
  }

  /**
   * The log port's accessible name.
   *
   * @returns The translated label.
   */
  protected label(): string {
    return this.state.env.t('ide.chat.messagesLabel', undefined, {
      defaultValue: 'Conversation messages',
    })
  }

  /**
   * The empty hint's line, reusing the bond's existing key.
   *
   * @returns The translated hint text.
   */
  protected emptyText(): string {
    return this.state.env.t('ide.chat.emptyState', undefined, {
      defaultValue: 'Describe what you want to build...',
    })
  }

  /**
   * Whether the empty hint shows: nothing else in the transcript and no turn in
   * flight.
   *
   * @returns True when the hint renders.
   */
  protected showEmptyHint(): boolean {
    const props = this.state.props()
    return (
      !this.state.env.transcriptOnly() &&
      this.timeline.timeline().length === 0 &&
      !this.chat.isLoading() &&
      !this.chat.isRemoteStreaming() &&
      !props.awaitingSandboxBoot &&
      !this.chat.error()
    )
  }
}
