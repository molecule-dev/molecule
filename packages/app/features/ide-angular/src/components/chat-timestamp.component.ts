/**
 * The one timestamp treatment for every chat timeline item — user and team
 * message headers, Synthase replies, and event cards. A small muted relative
 * time ("5 minutes ago") that advances with the clock, whose tooltip carries
 * the exact date and time.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ChatTimestamp` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input. Presentational only: WHETHER an item shows its
 * time is decided once for the whole timeline by `planChatTimestamps`.
 *
 * React's root is a fragment (the tooltip's trigger wrapper plus its portal)
 * for `inline` and the line `<div>` for `line`, so the template's nodes render
 * in front of the host (`placeContentBefore`) and the host leaves the DOM: the
 * rendered tree is React's, with no wrapper element around it. The shared UI
 * Tooltip renders the same way for its own trigger.
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express, serialized through `styleText` the way React
 * writes numbers (`11` → `11px`, `lineHeight: 1.3` stays unitless).
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useLocale,
  usePlacement,
} from '@molecule/app-angular'
import { formatChatFullTime, formatChatRelativeTime } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'

/** Props for `ChatTimestamp` — the React prop names, React's own contract. */
export interface ChatTimestampProps {
  /** Epoch milliseconds of the message or event. */
  timestamp: number
  /**
   * `inline` sits inside an existing header row (the user message's name
   * line); `line` is its own row above a reply or card, aligned with that
   * item's content.
   */
  variant?: 'inline' | 'line'
  /** Horizontal alignment for the `line` variant (centered notices center their time). */
  align?: 'left' | 'center'
}

/**
 * The component's inline-style texts that never change, serialized once with
 * `styleText` (the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The `<time>` label: small, muted, one line. */
  label: styleText({ fontSize: 11, whiteSpace: 'nowrap', cursor: 'default' }),
} as const

/**
 * A chat item's timestamp, or nothing for an invalid time. React renders it
 * under the React name `ChatTimestamp` (this class's name).
 */
@Component({
  selector: 'div[mol-chat-timestamp]',
  standalone: true,
  imports: [Tooltip],
  inputs: ['timestamp', 'variant', 'align'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (renderable()) {@if (variant === 'line') {<div [attr.style]="lineStyle()"><mol-tooltip placement="top"><time [attr.datetime]="dateTime()" [class]="cm.textMuted" [attr.style]="s.label" data-mol-id="chat-timestamp">{{ label() }}</time><ng-container ngProjectAs="[slot=content]">{{ exactTime() }}</ng-container></mol-tooltip></div>} @else {<mol-tooltip placement="top"><time [attr.datetime]="dateTime()" [class]="cm.textMuted" [attr.style]="s.label" data-mol-id="chat-timestamp">{{ label() }}</time><ng-container ngProjectAs="[slot=content]">{{ exactTime() }}</ng-container></mol-tooltip>}}`,
})
export class ChatTimestamp {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the template's nodes in front of the host and keeps the host out of
   * the DOM: React's root is the fragment (or the line `<div>`) itself.
   */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** Epoch milliseconds of the message or event. */
  timestamp = Number.NaN

  /**
   * `inline` sits inside an existing header row (the user message's name
   * line); `line` is its own row above a reply or card, aligned with that
   * item's content.
   */
  variant: 'inline' | 'line' = 'inline'

  /** Horizontal alignment for the `line` variant (centered notices center their time). */
  align: 'left' | 'center' = 'left'

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The current locale — re-renders on a locale switch, label and tooltip together. */
  private readonly language = useLocale()

  /** The shared minute clock (React's `useMinuteNow`). */
  private readonly minuteNow = useMinuteNow()

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * Whether the timestamp is a real time (React's `Number.isFinite` guard).
   * @returns False for `NaN` and the infinities.
   */
  protected renderable(): boolean {
    return Number.isFinite(this.timestamp)
  }

  /**
   * The label's ISO instant (React's `dateTime` attribute).
   * @returns The ISO string.
   */
  protected dateTime(): string {
    return new Date(this.timestamp).toISOString()
  }

  /**
   * The relative label (React's `formatChatRelativeTime`).
   * @returns The translated-by-Intl text.
   */
  protected label(): string {
    // The clock can lag a fresh item by up to a minute; never show a future time.
    return formatChatRelativeTime(
      this.timestamp,
      Math.max(this.minuteNow(), this.timestamp),
      this.language(),
    )
  }

  /**
   * The tooltip's exact date and time (React's `formatChatFullTime`).
   * @returns The translated-by-Intl text.
   */
  protected exactTime(): string {
    return formatChatFullTime(this.timestamp, this.language())
  }

  /**
   * The `line` variant's wrapper style: a flex row aligned per `align`
   * (React's inline style, serialized as text).
   * @returns The `style` attribute text.
   */
  protected lineStyle(): string | null {
    return styleText({
      display: 'flex',
      justifyContent: this.align === 'center' ? 'center' : 'flex-start',
      lineHeight: 1.3,
      marginBottom: 2,
    })
  }
}
