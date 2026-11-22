/**
 * The ONE shared tone-accented notice treatment, plus the resource-limit
 * upgrade banner built on it and the card-body segment renderer.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `NoticeCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. A matched-weight accent {@link Icon}, an
 * optional composable body (or plain text), and a left-aligned row of
 * design-system action buttons (`cm.button`, `sm`) whose semantic colour comes
 * from the action or, failing that, the tone. EVERY inline notice renders
 * through this — the system tip/notice cards AND the resource-limit / upgrade
 * banners (see {@link ResourceLimitBanner}) — so their icon + buttons can never
 * drift apart. The host owns the button routes/copy; it passes them in as
 * `action`.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the layout
 * and the shared card chrome (`chatCardStyle`) the ClassMap can't express,
 * written in Solid's kebab-case style form with explicit `px` units (React's
 * camelCase object keys, where a unitless number means pixels). All
 * user-facing text goes through `t()` — this card only renders text the
 * caller already localized.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import type { ChatEventCardAction, ChatEventCardSegment } from '@molecule/app-ide-panel-logic'
import {
  CHAT_CARD_CODE_STYLE,
  CHAT_CARD_ICON_SIZE,
  CHAT_CARD_LINK_STYLE,
  chatCardStyle,
  NOTICE_TONE,
  NOTICE_TONE_BUTTON_COLOR,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../components/Icon.jsx'
import { isAllowedLinkHref } from './MarkdownContent.jsx'

/**
 * Solid's style form of {@link CHAT_CARD_CODE_STYLE}: kebab-case keys, with the
 * unitless `borderRadius` written in `px` (React treats the number as pixels).
 */
const CODE_STYLE: Record<string, string> = {
  'font-family': CHAT_CARD_CODE_STYLE.fontFamily,
  'font-size': CHAT_CARD_CODE_STYLE.fontSize,
  padding: CHAT_CARD_CODE_STYLE.padding,
  'border-radius': `${CHAT_CARD_CODE_STYLE.borderRadius}px`,
  background: CHAT_CARD_CODE_STYLE.background,
  border: CHAT_CARD_CODE_STYLE.border,
  'white-space': CHAT_CARD_CODE_STYLE.whiteSpace,
}

/** Solid's style form of {@link CHAT_CARD_LINK_STYLE} (kebab-case keys). */
const LINK_STYLE: Record<string, string> = {
  color: CHAT_CARD_LINK_STYLE.color,
  'text-decoration': CHAT_CARD_LINK_STYLE.textDecoration,
  cursor: CHAT_CARD_LINK_STYLE.cursor,
}

/**
 * Whether an href opens on ANOTHER origin: an `http(s)` URL, or a
 * protocol-relative `//host` the browser resolves against the page's protocol.
 *
 * @param href - The action's href.
 * @returns True when the link must open in a new tab with `noopener noreferrer`.
 */
function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('//')
}

/**
 * Renders one composable card-body segment: a plain string, an inline monospace
 * {@link ChatEventCardCode} span, or a {@link ChatEventCardAction} (link/button,
 * optionally monospace via `code`). Shared by the tip (toned) and default system cards.
 *
 * React's third argument is the list key; Solid needs none (its JSX has no
 * keys), but the parameter is kept so a caller can map the segments exactly as
 * React does.
 *
 * @param segment - The segment to render.
 * @param _key - React's list key, ignored (Solid's JSX carries no keys).
 * @returns The rendered node.
 */
export function renderCardSegment(segment: ChatEventCardSegment, _key?: number): JSX.Element {
  if (typeof segment === 'string') return <span>{segment}</span>
  if ('code' in segment && !('label' in segment)) {
    return <code style={CODE_STYLE}>{segment.code}</code>
  }
  const action = segment as ChatEventCardAction
  const linkStyle: Record<string, string> = action.code
    ? { ...CODE_STYLE, color: CHAT_CARD_LINK_STYLE.color, cursor: 'pointer' }
    : LINK_STYLE
  // An unapproved scheme (`javascript:`, `data:` …) never becomes an anchor —
  // the label renders as inert text, same policy as markdown links. An approved
  // link always opens in a new tab here: a card-body segment is inline prose.
  if (action.href) {
    if (!isAllowedLinkHref(action.href)) return <span style={linkStyle}>{action.label}</span>
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
        {action.label}
      </a>
    )
  }
  return (
    <button
      /* mol-bespoke-button: inline mid-sentence card link — a <button> reset to plain link text so an action can sit inside a sentence, not a standalone CTA */
      type="button"
      onClick={action.onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: '0',
        font: 'inherit',
        ...linkStyle,
      }}
    >
      {action.label}
    </button>
  )
}

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
 * The single shared notice-card treatment: a tone accent, an optional
 * composable body (or plain text), and a left-aligned row of design-system
 * action buttons.
 *
 * @param props - See {@link NoticeCardProps}.
 * @returns The rendered notice card.
 */
export function NoticeCard(props: NoticeCardProps): JSX.Element {
  const cm = getClassMap()
  const accent = (): string => NOTICE_TONE[props.tone].accent
  const icon = (): IconName => props.icon ?? NOTICE_TONE[props.tone].icon
  const actions = (): ChatEventCardAction[] => {
    if (!props.action) return []
    return Array.isArray(props.action) ? props.action : [props.action]
  }
  const multiLine = (): boolean => (props.text ?? '').includes('\n')
  const defaultActionColor = (): ChatEventCardAction['color'] =>
    NOTICE_TONE_BUTTON_COLOR[props.tone]

  /**
   * The card's container style: layout plus the shared chrome
   * ({@link chatCardStyle}) and one timeline rhythm.
   *
   * @returns The card container's inline style fields.
   */
  const cardStyle = (): Record<string, string> => {
    const { padding, border, background } = chatCardStyle(accent())
    return {
      display: 'flex',
      'align-items': 'flex-start',
      gap: '10px',
      'margin-bottom': `${TIMELINE_ITEM_GAP}px`,
      padding,
      border,
      background,
      'border-radius': '8px',
      'line-height': '1.5',
    }
  }

  return (
    <div
      data-mol-id="chat-notice-card"
      data-tone={props.tone}
      class={cm.textSize('xs')}
      style={cardStyle()}
    >
      <Icon
        name={icon()}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{ 'flex-shrink': '0', 'margin-top': '1px', color: accent() }}
      />
      <div style={{ flex: '1', 'min-width': '0' }}>
        <Show
          when={props.content}
          fallback={
            <span style={multiLine() ? { 'white-space': 'pre-wrap' } : undefined}>
              {props.text}
            </span>
          }
        >
          {(segments) => <For each={segments()}>{(segment) => renderCardSegment(segment)}</For>}
        </Show>
        <Show when={!props.content && actions().length > 0}>
          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '8px', 'margin-top': '8px' }}>
            <For each={actions()}>
              {(action) => {
                // EVERY action is a REAL design-system button (`cm.button`, sm) so
                // the same CTA looks identical wherever the app shows it (auth page,
                // banners, chat cards) — and so two actions on the SAME card can't
                // render two different box models. The host names the semantic colour
                // when it has one; otherwise the tone supplies it. No inline colors —
                // the ClassMap owns the look, including hover/active/focus states.
                // touchTargetCompact (36px), not the full 44px touchTarget — these sit
                // inside a dense chat card (the floor agreed for its actions).
                const className = (): string =>
                  cm.cn(
                    cm.button({ color: action.color ?? defaultActionColor(), size: 'sm' }),
                    cm.touchTargetCompact,
                  )
                const actionStyle: Record<string, string> = {
                  'text-decoration': 'none',
                  'font-family': action.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
                }
                return (
                  <Show
                    when={action.href}
                    fallback={
                      <button
                        type="button"
                        onClick={action.onClick}
                        class={className()}
                        style={actionStyle}
                      >
                        {action.label}
                      </button>
                    }
                  >
                    {(href) => (
                      // An unapproved scheme (`javascript:`, `data:` …) never becomes an
                      // anchor — the label renders as inert text, same policy as the
                      // markdown link allowlist. A protocol-relative href (`//host`)
                      // carries no scheme either, but the browser resolves it against
                      // the page's protocol to ANOTHER origin — so it opens like an
                      // http(s) link: new tab, `noopener noreferrer`, never a same-tab
                      // navigation off-origin.
                      <Show
                        when={isAllowedLinkHref(href())}
                        fallback={
                          <span class={className()} style={actionStyle}>
                            {action.label}
                          </span>
                        }
                      >
                        <a
                          href={href()}
                          target={isExternalHref(href()) ? '_blank' : undefined}
                          rel={isExternalHref(href()) ? 'noopener noreferrer' : undefined}
                          class={className()}
                          style={actionStyle}
                        >
                          {action.label}
                        </a>
                      </Show>
                    )}
                  </Show>
                )
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
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
 * @param props - See {@link ResourceLimitBannerProps}.
 * @returns The rendered upgrade banner.
 */
export function ResourceLimitBanner(props: ResourceLimitBannerProps): JSX.Element {
  return <NoticeCard tone="upgrade" text={props.message} action={props.action} />
}
