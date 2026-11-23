/**
 * One inline segment of a composable chat-card body.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `renderCardSegment` (see
 * that file's heading for the design notes): the same DOM for the same input.
 * A plain string renders as a `<span>`; an inline monospace `{ code }` span
 * renders as `<code>`; a `ChatEventCardAction` renders as an inline link
 * (`href`, always a new tab with `noopener noreferrer`), an inert styled
 * `<span>` when its href fails the link allowlist, or a plain-link `<button>`
 * when it carries an onClick instead. A `code: true` action keeps the code
 * chip's type and gains the link colour + pointer cursor.
 *
 * Svelte has no render-a-node API, so React's exported function is a component
 * here; React's root is the segment element itself (a run of one), so the
 * template's element renders in front of the host and the host leaves the DOM
 * (`placeContentBefore` + `setElementPresent`) — the rendered DOM is React's,
 * with no wrapper element around it.
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type {
  ChatEventCardAction,
  ChatEventCardCode,
  ChatEventCardSegment,
} from '@molecule/app-ide-panel-logic'
import { CHAT_CARD_CODE_STYLE, CHAT_CARD_LINK_STYLE } from '@molecule/app-ide-panel-logic'
import { styleText } from '@molecule/app-ui-angular'

import { isAllowedLinkHref } from './markdown-content.component.js'

/** What one card-body segment renders as. */
export type CardSegmentKind = 'text' | 'code' | 'link' | 'inert' | 'button'

/**
 * One resolved segment: its rendered kind, its text, and — for an action — the
 * href, the inline style text and the action itself (for its click handler).
 */
export interface CardSegmentView {
  /** Which element renders this segment. */
  kind: CardSegmentKind
  /** The text the element shows. */
  text: string
  /** The link target, for a `link` segment. */
  href?: string
  /** The segment's inline style text, or null for plain text/code. */
  style?: string | null
  /** The action behind a link, inert span or button segment. */
  action?: ChatEventCardAction
}

/** The inline code chip style, serialized once (React's `CHAT_CARD_CODE_STYLE`). */
const CODE_STYLE = styleText({ ...CHAT_CARD_CODE_STYLE })

/** The inline link style, serialized once (React's `CHAT_CARD_LINK_STYLE`). */
const LINK_STYLE = styleText({ ...CHAT_CARD_LINK_STYLE })

/**
 * A clickable command: React spreads the code chip's style under the link's
 * colour and pointer cursor, and adds no underline.
 */
const CODE_LINK_STYLE = styleText({
  ...CHAT_CARD_CODE_STYLE,
  color: CHAT_CARD_LINK_STYLE.color,
  cursor: CHAT_CARD_LINK_STYLE.cursor,
})

/**
 * A plain inline action: React's button reset under the link style, so an
 * action can sit inside a sentence instead of reading as a standalone CTA.
 */
const BUTTON_STYLE = styleText({
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  ...CHAT_CARD_LINK_STYLE,
})

/**
 * A plain inline action whose label is monospace code: React's button reset
 * under the code chip's own background/border/padding and the link colour +
 * pointer cursor (the explicit keys are the spread's settled values).
 */
const CODE_BUTTON_STYLE = styleText({
  background: CHAT_CARD_CODE_STYLE.background,
  border: CHAT_CARD_CODE_STYLE.border,
  padding: CHAT_CARD_CODE_STYLE.padding,
  font: 'inherit',
  fontFamily: CHAT_CARD_CODE_STYLE.fontFamily,
  fontSize: CHAT_CARD_CODE_STYLE.fontSize,
  borderRadius: CHAT_CARD_CODE_STYLE.borderRadius,
  whiteSpace: CHAT_CARD_CODE_STYLE.whiteSpace,
  color: CHAT_CARD_LINK_STYLE.color,
  cursor: CHAT_CARD_LINK_STYLE.cursor,
})

/**
 * Whether a segment is an inline monospace `{ code }` span — React's
 * `'code' in seg && !('label' in seg)` (an action may carry `code: true`).
 *
 * @param segment - The segment (a string is handled by the caller).
 * @returns True for a code-only segment.
 */
export function isCodeSegment(
  segment: ChatEventCardCode | ChatEventCardAction,
): segment is ChatEventCardCode {
  return 'code' in segment && !('label' in segment)
}

/**
 * Resolves one composable card-body segment to what it renders as, in React's
 * branch order.
 *
 * @param segment - The segment to resolve.
 * @returns The segment's rendered kind, text, href and inline style.
 */
export function resolveCardSegment(segment: ChatEventCardSegment): CardSegmentView {
  if (typeof segment === 'string') return { kind: 'text', text: segment }
  if (isCodeSegment(segment)) return { kind: 'code', text: segment.code }
  const action = segment
  const style = action.code ? CODE_LINK_STYLE : LINK_STYLE
  // An unapproved scheme (`javascript:`, `data:` …) never becomes an anchor —
  // the label renders as inert text, same policy as markdown links.
  if (action.href) {
    return isAllowedLinkHref(action.href)
      ? { kind: 'link', text: action.label, href: action.href, style, action }
      : { kind: 'inert', text: action.label, style, action }
  }
  return {
    kind: 'button',
    text: action.label,
    style: action.code ? CODE_BUTTON_STYLE : BUTTON_STYLE,
    action,
  }
}

/**
 * Renders one composable card-body segment (React's `renderCardSegment`).
 */
@Component({
  selector: 'div[mol-card-segment]',
  standalone: true,
  inputs: ['segment'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (view().kind === 'text') {<span>{{ view().text }}</span>} @else if (view().kind === 'code') {<code [attr.style]="codeStyle">{{ view().text }}</code>} @else if (view().kind === 'link') {<a [attr.href]="view().href" target="_blank" rel="noopener noreferrer" [attr.style]="view().style">{{ view().text }}</a>} @else if (view().kind === 'inert') {<span [attr.style]="view().style">{{ view().text }}</span>} @else {<button type="button" (click)="fireClick($event)" [attr.style]="view().style">{{ view().text }}</button>}`,
})
export class CardSegment {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the segment element in front of the host and keeps the host out of the DOM. */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The segment to render. */
  segment!: ChatEventCardSegment

  /** The inline code chip style. */
  protected readonly codeStyle = CODE_STYLE

  /**
   * The resolved segment the template renders.
   *
   * @returns The segment's rendered kind, text, href and inline style.
   */
  protected view(): CardSegmentView {
    return resolveCardSegment(this.segment)
  }

  /**
   * Runs the segment action's click handler, handing it the DOM event as
   * React's `onClick={action.onClick}` does.
   *
   * @param event - The click's DOM event.
   */
  protected fireClick(event: Event): void {
    const handler: ((event?: Event) => void) | undefined = this.view().action?.onClick
    handler?.(event)
  }
}
