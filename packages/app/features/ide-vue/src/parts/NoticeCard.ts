/**
 * The ONE shared tone-accented notice treatment.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `NoticeCard` (see that file for
 * the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. A matched-weight accent {@link Icon}, an optional
 * composable body (or plain text), and a left-aligned row of design-system
 * action buttons (`cm.button`, `sm`) whose semantic colour comes from the
 * action or, failing that, the tone. EVERY inline notice renders through this —
 * the system tip/notice cards AND the resource-limit / upgrade banners (see
 * {@link ResourceLimitBanner}) — so their icon + buttons can never drift apart.
 * The host owns the button routes/copy; it passes them in as `action`.
 *
 * {@link renderCardSegment} renders one segment of a composable card body — the
 * same node React's `renderCardSegment` returns, list key included — for the
 * notice card here and the timeline's custom cards.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the layout
 * and the shared card chrome (`chatCardStyle`) the ClassMap can't express, in
 * Vue's kebab-case style form. All user-facing text goes through `t()` — this
 * card only renders text the caller already localized.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'
import {
  CHAT_CARD_CODE_STYLE,
  CHAT_CARD_ICON_SIZE,
  CHAT_CARD_LINK_STYLE,
  chatCardStyle,
  type ChatEventCardAction,
  type ChatEventCardCode,
  type ChatEventCardSegment,
  NOTICE_TONE,
  NOTICE_TONE_BUTTON_COLOR,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../components/Icon.js'
import { isAllowedLinkHref } from './MarkdownContent.js'

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

/** The card body's inline code style, in Vue's kebab-case style form. */
const CODE_STYLE: Record<string, string> = {
  'font-family': CHAT_CARD_CODE_STYLE.fontFamily,
  'font-size': CHAT_CARD_CODE_STYLE.fontSize,
  padding: CHAT_CARD_CODE_STYLE.padding,
  'border-radius': `${CHAT_CARD_CODE_STYLE.borderRadius}px`,
  background: CHAT_CARD_CODE_STYLE.background,
  border: CHAT_CARD_CODE_STYLE.border,
  'white-space': CHAT_CARD_CODE_STYLE.whiteSpace,
}

/** The card body's inline link style, in Vue's kebab-case style form. */
const LINK_STYLE: Record<string, string> = {
  color: CHAT_CARD_LINK_STYLE.color,
  'text-decoration': CHAT_CARD_LINK_STYLE.textDecoration,
  cursor: CHAT_CARD_LINK_STYLE.cursor,
}

/** The plain-link reset an inline `<button>` action carries under its link style. */
const BUTTON_RESET_STYLE: Record<string, string> = {
  background: 'none',
  border: 'none',
  padding: '0px',
  font: 'inherit',
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
 * Renders one composable card-body segment: a plain string, an inline monospace
 * {@link ChatEventCardCode} span, or a {@link ChatEventCardAction} (link/button,
 * optionally monospace via `code`). Shared by the tip (toned) and default system
 * cards.
 *
 * @param segment - The segment to render.
 * @param key - The list key (React's `key={(seg, i) => i}`).
 * @returns The rendered node.
 */
export function renderCardSegment(segment: ChatEventCardSegment, key: number): VNodeChild {
  if (typeof segment === 'string') return h('span', { key }, segment)
  if ('code' in segment && !('label' in segment)) {
    return h('code', { key, style: CODE_STYLE }, (segment as ChatEventCardCode).code)
  }
  const action = segment as ChatEventCardAction
  // A clickable command reads as code but keeps the link's colour + cursor.
  const linkStyle: Record<string, string> = action.code
    ? { ...CODE_STYLE, color: CHAT_CARD_LINK_STYLE.color, cursor: 'pointer' }
    : LINK_STYLE
  // An unapproved scheme (`javascript:`, `data:` …) never becomes an anchor —
  // the label renders as inert text, same policy as markdown links.
  if (!action.href) {
    return h(
      'button',
      {
        key,
        type: 'button',
        onClick: action.onClick,
        style: { ...BUTTON_RESET_STYLE, ...linkStyle },
      },
      action.label,
    )
  }
  if (!isAllowedLinkHref(action.href)) {
    return h('span', { key, style: linkStyle }, action.label)
  }
  return h(
    'a',
    { key, href: action.href, target: '_blank', rel: 'noopener noreferrer', style: linkStyle },
    action.label,
  )
}

/**
 * The single shared notice-card treatment: a tone accent, an optional
 * composable body (or plain text), and a left-aligned row of design-system
 * action buttons.
 *
 * @param props - See {@link NoticeCardProps}.
 * @returns The rendered notice card.
 */
export const NoticeCard = defineComponent({
  name: 'NoticeCard',
  props: {
    /** The card's tone: its accent colour and default icon. */
    tone: {
      type: String as PropType<NoticeCardProps['tone']>,
      required: true,
    },
    /** The plain body text (used when `content` is absent). */
    text: { type: String, required: false, default: undefined },
    /** A composable body: text, inline monospace code and inline actions, in order. */
    content: {
      type: Array as PropType<ChatEventCardSegment[]>,
      required: false,
      default: undefined,
    },
    /** The card's actions (one, several, or none). */
    action: {
      type: [Object, Array] as PropType<ChatEventCardAction | ChatEventCardAction[] | null>,
      required: false,
      default: undefined,
    },
    /** An icon-name override (defaults to the tone's icon). */
    icon: { type: String as PropType<IconName>, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * Renders the card.
     *
     * @returns The rendered notice card.
     */
    return (): VNodeChild => {
      const accent = NOTICE_TONE[props.tone].accent
      const icon = props.icon ?? NOTICE_TONE[props.tone].icon
      const actions = !props.action
        ? []
        : Array.isArray(props.action)
          ? props.action
          : [props.action]
      const multiline = (props.text ?? '').includes('\n')
      const chrome = chatCardStyle(accent)
      const cardStyle: Record<string, string> = {
        display: 'flex',
        'align-items': 'flex-start',
        gap: '10px',
        'margin-bottom': `${TIMELINE_ITEM_GAP}px`,
        padding: chrome.padding,
        'border-radius': `${chrome.borderRadius}px`,
        border: chrome.border,
        background: chrome.background,
        'line-height': '1.5',
      }
      const body = props.content
        ? props.content.map((segment, i) => renderCardSegment(segment, i))
        : h('span', multiline ? { style: { 'white-space': 'pre-wrap' } } : null, props.text)
      const actionRow =
        !props.content && actions.length > 0
          ? h(
              'div',
              { style: { display: 'flex', 'flex-wrap': 'wrap', gap: '8px', 'margin-top': '8px' } },
              actions.map((action, i) => {
                const className = cm.cn(
                  cm.button({
                    color: action.color ?? NOTICE_TONE_BUTTON_COLOR[props.tone],
                    size: 'sm',
                  }),
                  cm.touchTargetCompact,
                )
                const actionStyle: Record<string, string> = {
                  'text-decoration': 'none',
                  'font-family': action.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
                }
                const external =
                  !!action.href &&
                  (/^https?:\/\//i.test(action.href) || isProtocolRelative(action.href))
                if (!action.href) {
                  return h(
                    'button',
                    {
                      key: i,
                      type: 'button',
                      onClick: action.onClick,
                      class: className,
                      style: actionStyle,
                    },
                    action.label,
                  )
                }
                if (!isAllowedLinkHref(action.href)) {
                  return h('span', { key: i, class: className, style: actionStyle }, action.label)
                }
                return h(
                  'a',
                  {
                    key: i,
                    href: action.href,
                    target: external ? '_blank' : undefined,
                    rel: external ? 'noopener noreferrer' : undefined,
                    class: className,
                    style: actionStyle,
                  },
                  action.label,
                )
              }),
            )
          : null
      return h(
        'div',
        {
          'data-mol-id': 'chat-notice-card',
          'data-tone': props.tone,
          class: cm.textSize('xs'),
          style: cardStyle,
        },
        [
          h(Icon, {
            name: icon,
            size: CHAT_CARD_ICON_SIZE,
            'aria-hidden': 'true',
            style: { 'flex-shrink': '0', 'margin-top': '1px', color: accent },
          }),
          h('div', { style: { flex: '1', 'min-width': '0' } }, [body, actionRow]),
        ],
      )
    }
  },
})

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
export const ResourceLimitBanner = defineComponent({
  name: 'ResourceLimitBanner',
  props: {
    /** The backend's message for the hit limit. */
    message: { type: String, required: true },
    /** The host's CTA buttons (from its `buildUpgradeCta`). */
    action: {
      type: [Object, Array] as PropType<ChatEventCardAction | ChatEventCardAction[] | null>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    /**
     * Renders the banner through the shared notice card.
     *
     * @returns The rendered upgrade banner.
     */
    return (): VNodeChild =>
      h(NoticeCard, { tone: 'upgrade', text: props.message, action: props.action })
  },
})
