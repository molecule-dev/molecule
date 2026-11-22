/**
 * The ONE shared tone-accented notice treatment.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `NoticeCard` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. A matched-weight accent icon, an
 * optional composable body (or plain text), and a left-aligned row of
 * design-system action buttons whose semantic colour comes from the action or,
 * failing that, the tone. Every inline notice renders through this — the
 * system notice cards AND the resource-limit / upgrade banners (see
 * {@link ResourceLimitBanner}) — so their icon + buttons can never drift
 * apart. The host owns the button routes/copy; it passes them in as `action`.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * The host element IS React's single root `div` (an attribute selector), so its
 * own attributes, ClassMap class and inline chrome sit on it through host
 * bindings and the port adds no node. The composable body renders through
 * {@link CardSegment} (React's `renderCardSegment`). Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are the layout and the
 * shared card chrome (`chatCardStyle`) the ClassMap can't express, serialized
 * through `styleText`. All user-facing text comes from the caller already
 * localized.
 *
 * @module
 */

import { Component } from '@angular/core'

import type { IconName } from '@molecule/app-icons'
import type { ChatEventCardAction, ChatEventCardSegment } from '@molecule/app-ide-panel-logic'
import {
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
  NOTICE_TONE,
  NOTICE_TONE_BUTTON_COLOR,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from '../components/icon.component.js'
import { CardSegment } from './card-segment.component.js'
import { isAllowedLinkHref } from './markdown-content.component.js'

/** Props for {@link NoticeCard} — the React prop names, React's own contract. */
export interface NoticeCardProps {
  /** The card's tone: its accent colour and default icon. */
  tone: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  /** The plain body text (used when `content` is absent). */
  text?: string
  /** A composable body: text, inline monospace code and inline actions, in order. */
  content?: ChatEventCardSegment[]
  /** The card's actions (one, several, or none). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null
  /** An icon-name override (defaults to the tone's icon). */
  icon?: IconName
}

/**
 * Whether an href is protocol-relative (`//host`) — an approved external shape.
 *
 * @param href - The action's href.
 * @returns True when it points at another host without a scheme.
 */
function isProtocolRelative(href: string): boolean {
  return href.startsWith('//')
}

/**
 * The single shared notice-card treatment: a tone accent, an optional
 * composable body (or plain text), and a left-aligned row of design-system
 * action buttons.
 */
@Component({
  selector: 'div[mol-notice-card]',
  standalone: true,
  imports: [CardSegment, Icon],
  inputs: ['tone', 'text', 'content', 'action', 'icon'],
  host: {
    'data-mol-id': 'chat-notice-card',
    '[attr.data-tone]': 'tone',
    '[class]': 'rootClass()',
    '[style.display]': "'flex'",
    '[style.align-items]': "'flex-start'",
    '[style.gap]': "'10px'",
    '[style.margin-bottom]': 'marginBottomText()',
    '[style.padding]': 'cardChrome().padding',
    '[style.border-radius]': 'borderRadiusText()',
    '[style.border]': 'cardChrome().border',
    '[style.background]': 'cardChrome().background',
    '[style.line-height]': "'1.5'",
  },
  // prettier-ignore
  template: `<svg mol-icon [name]="iconName()" [size]="iconSize" aria-hidden="true" [attr.style]="iconStyle()"></svg>
  <div [attr.style]="bodyStyle">
    @if (content) {
      @for (segment of content; track $index) {<div mol-card-segment [segment]="segment"></div>}
    } @else {
      <span [attr.style]="textStyle()">{{ text }}</span>
    }
    @if (!content && actions().length > 0) {
      <div [attr.style]="actionRowStyle">
        @for (actionItem of actions(); track $index) {
          @if (!actionItem.href) {<button type="button" [class]="actionClass(actionItem)" [attr.style]="actionStyle(actionItem)" (click)="clickAction(actionItem, $event)">{{ actionItem.label }}</button>}
          @else if (allowedHref(actionItem.href)) {<a [attr.href]="actionItem.href" [attr.target]="isExternal(actionItem.href) ? '_blank' : null" [attr.rel]="isExternal(actionItem.href) ? 'noopener noreferrer' : null" [class]="actionClass(actionItem)" [attr.style]="actionStyle(actionItem)">{{ actionItem.label }}</a>}
          @else {<span [class]="actionClass(actionItem)" [attr.style]="actionStyle(actionItem)">{{ actionItem.label }}</span>}
        }
      </div>
    }
  </div>`,
})
export class NoticeCard {
  /** The card's tone: its accent colour and default icon. */
  tone: NoticeCardProps['tone'] = 'info'

  /** The plain body text (used when `content` is absent). */
  text?: string

  /** A composable body: text, inline monospace code and inline actions, in order. */
  content?: ChatEventCardSegment[]

  /** The card's actions (one, several, or none). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null

  /** An icon-name override (defaults to the tone's icon). */
  icon?: IconName

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The accent icon's pixel size. */
  protected readonly iconSize = CHAT_CARD_ICON_SIZE

  /** The card body's flex column. */
  protected readonly bodyStyle = styleText({ flex: '1', minWidth: 0 })

  /** The action row's layout. */
  protected readonly actionRowStyle = styleText({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  })

  /**
   * The host's class list (the shared xs text size).
   *
   * @returns The class string.
   */
  protected rootClass(): string {
    return this.cm.textSize('xs')
  }

  /**
   * The card's chrome values from the shared `chatCardStyle`, so each one is
   * written through its own style binding (React sets them as separate CSSOM
   * properties; writing the whole `style` attribute would serialize a
   * `background` shorthand differently in jsdom).
   *
   * @returns The tone's padding, radius, border and background.
   */
  protected cardChrome(): ReturnType<typeof chatCardStyle> {
    return chatCardStyle(NOTICE_TONE[this.tone].accent)
  }

  /**
   * The card's bottom margin, React's numeric `TIMELINE_ITEM_GAP`.
   *
   * @returns The margin in pixels.
   */
  protected marginBottomText(): string {
    return `${TIMELINE_ITEM_GAP}px`
  }

  /**
   * The card's corner radius, as React's numeric value wrote it.
   *
   * @returns The radius in pixels.
   */
  protected borderRadiusText(): string {
    return `${this.cardChrome().borderRadius}px`
  }

  /**
   * The accent icon: the tone's colour, matching the card's weight.
   *
   * @returns The style attribute text.
   */
  protected iconStyle(): string | null {
    return styleText({
      flexShrink: 0,
      marginTop: 1,
      color: NOTICE_TONE[this.tone].accent,
    })
  }

  /**
   * The body's white-space when the plain text is multi-line.
   *
   * @returns The style attribute text, or null.
   */
  protected textStyle(): string | null {
    return (this.text ?? '').includes('\n') ? styleText({ whiteSpace: 'pre-wrap' }) : null
  }

  /**
   * The icon to render: the caller's override, else the tone's.
   *
   * @returns The icon name.
   */
  protected iconName(): IconName {
    return this.icon ?? NOTICE_TONE[this.tone].icon
  }

  /**
   * The actions as a list.
   *
   * @returns The card's actions.
   */
  protected actions(): ChatEventCardAction[] {
    if (!this.action) return []
    return Array.isArray(this.action) ? this.action : [this.action]
  }

  /**
   * The action button's class list — the SAME design-system button
   * (`cm.button`, `sm`, compact touch target) the rest of the app shows.
   *
   * @param action - The action.
   * @returns The class string.
   */
  protected actionClass(action: ChatEventCardAction): string {
    return this.cm.cn(
      this.cm.button({ color: action.color ?? NOTICE_TONE_BUTTON_COLOR[this.tone], size: 'sm' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The action button's inline style.
   *
   * @param action - The action.
   * @returns The style attribute text.
   */
  protected actionStyle(action: ChatEventCardAction): string | null {
    return styleText({
      textDecoration: 'none',
      fontFamily: action.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
    })
  }

  /**
   * Runs an action button's click, handing it the DOM event as React's
   * `onClick={action.onClick}` does.
   *
   * @param action - The action.
   * @param event - The click's DOM event.
   */
  protected clickAction(action: ChatEventCardAction, event: Event): void {
    const handler: ((event?: Event) => void) | undefined = action.onClick
    handler?.(event)
  }

  /**
   * Whether an href points at another host (so the anchor opens a new tab).
   *
   * @param href - The href.
   * @returns True for an external (or protocol-relative) link.
   */
  protected isExternal(href: string): boolean {
    return /^https?:\/\//i.test(href) || isProtocolRelative(href)
  }

  /**
   * Whether an action's href is an allowed link target.
   *
   * @param href - The href.
   * @returns True when the link may become an anchor.
   */
  protected allowedHref(href: string): boolean {
    return isAllowedLinkHref(href)
  }
}

/** Props for {@link ResourceLimitBanner} — the React prop names. */
export interface ResourceLimitBannerProps {
  /** The backend's message for the hit limit. */
  message: string
  /** The host's CTA buttons (from its `buildUpgradeCta`). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null
}

/**
 * Inline banner shown when the sandbox runs out of memory (or another usage
 * limit is hit), prompting the user to upgrade. Renders through the shared
 * {@link NoticeCard} so it has the SAME matched-weight icon + accent button row
 * as every other upgrade notice — no bespoke icon, no single-link special case.
 *
 * React's root here is the notice card's own root `div`, so the host is a
 * `display: contents` wrapper marked `data-parity-unwrap`, which the
 * conformance normalizer drops.
 */
@Component({
  selector: 'div[mol-resource-limit-banner]',
  standalone: true,
  imports: [NoticeCard],
  inputs: ['message', 'action'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<div mol-notice-card [tone]="'upgrade'" [text]="message" [action]="action"></div>`,
})
export class ResourceLimitBanner {
  /** The backend's message for the hit limit. */
  message = ''

  /** The host's CTA buttons (from its `buildUpgradeCta`). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null
}
