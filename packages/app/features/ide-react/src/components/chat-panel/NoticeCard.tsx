/**
 * NoticeCard — the one shared tone-accented notice treatment, plus the
 * resource-limit upgrade banner built on it and the card-body segment renderer.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import type { IconName } from '@molecule/app-icons'
import type {
  ChatEventCardAction,
  ChatEventCardCode,
  ChatEventCardSegment,
} from '@molecule/app-ide-panel-logic'
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

import { Icon } from '../Icon.js'
import { isAllowedLinkHref } from '../MarkdownContent.js'

/**
 * Render one composable card-body segment: a plain string, an inline monospace
 * {@link ChatEventCardCode} span, or a {@link ChatEventCardAction} (link/button,
 * optionally monospace via `code`). Shared by the tip (toned) and default system cards.
 *
 * @param seg - The segment to render.
 * @param key - React list key.
 * @returns The rendered node.
 */
export function renderCardSegment(seg: ChatEventCardSegment, key: number): ReactNode {
  if (typeof seg === 'string') return <span key={key}>{seg}</span>
  if ('code' in seg && !('label' in seg)) {
    return (
      <code key={key} style={CHAT_CARD_CODE_STYLE}>
        {(seg as ChatEventCardCode).code}
      </code>
    )
  }
  const act = seg as ChatEventCardAction
  const linkStyle: React.CSSProperties = act.code
    ? { ...CHAT_CARD_CODE_STYLE, color: CHAT_CARD_LINK_STYLE.color, cursor: 'pointer' }
    : CHAT_CARD_LINK_STYLE
  // An unapproved scheme (`javascript:`, `data:` …) never becomes an anchor —
  // the label renders as inert text, same policy as markdown links.
  return act.href ? (
    isAllowedLinkHref(act.href) ? (
      <a key={key} href={act.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
        {act.label}
      </a>
    ) : (
      <span key={key} style={linkStyle}>
        {act.label}
      </span>
    )
  ) : (
    <button
      /* mol-bespoke-button: inline mid-sentence card link — a <button> reset to plain link text so an action can sit inside a sentence, not a standalone CTA */
      key={key}
      type="button"
      onClick={act.onClick}
      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', ...linkStyle }}
    >
      {act.label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// NoticeCard — the ONE shared tone-accented notice treatment
// ---------------------------------------------------------------------------

/**
 * The single shared notice-card treatment: a matched-weight accent {@link Icon},
 * an optional composable body (or plain text), and a left-aligned row of
 * design-system action buttons (`cm.button`, `sm`) whose semantic colour comes
 * from the action or, failing that, the tone. EVERY inline notice renders through this — the system
 * tip/notice cards AND the resource-limit / upgrade banners (see
 * {@link ResourceLimitBanner}) — so their icon + buttons can never drift apart
 * again. The host owns the button routes/copy; it passes them in as `action`.
 *
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered notice card.
 */
export function NoticeCard({
  tone,
  text,
  content,
  action,
  icon: iconOverride,
}: {
  tone: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  text?: string
  content?: ChatEventCardSegment[]
  action?: ChatEventCardAction | ChatEventCardAction[] | null
  icon?: IconName
}): JSX.Element {
  const cm = getClassMap()
  const { accent, icon: defaultIcon } = NOTICE_TONE[tone]
  const icon = iconOverride ?? defaultIcon
  const actions = action ? (Array.isArray(action) ? action : [action]) : []
  const multiLine = (text ?? '').includes('\n')
  // The semantic colour an action takes when the host did not name one, so every
  // action on the card renders the same design-system button.
  const defaultActionColor = NOTICE_TONE_BUTTON_COLOR[tone]
  return (
    <div
      data-mol-id="chat-notice-card"
      data-tone={tone}
      className={cm.textSize('xs')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: TIMELINE_ITEM_GAP,
        ...chatCardStyle(accent),
        lineHeight: 1.5,
      }}
    >
      <Icon
        name={icon}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: 1, color: accent }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {content ? (
          content.map((seg, i) => renderCardSegment(seg, i))
        ) : (
          <span style={multiLine ? { whiteSpace: 'pre-wrap' } : undefined}>{text}</span>
        )}
        {!content && actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {actions.map((act, i) => {
              // EVERY action is a REAL design-system button (`cm.button`, sm) so the
              // same CTA looks identical wherever the app shows it (auth page,
              // banners, chat cards) — and so two actions on the SAME card can't
              // render two different box models. The host names the semantic colour
              // when it has one; otherwise the tone supplies it. No inline colors —
              // the ClassMap owns the look, including hover/active/focus states.
              // touchTargetCompact (36px), not the full 44px touchTarget — these sit
              // inside a dense chat card (the floor agreed for its actions).
              const className = cm.cn(
                cm.button({ color: act.color ?? defaultActionColor, size: 'sm' }),
                cm.touchTargetCompact,
              )
              const actionStyle: React.CSSProperties = {
                textDecoration: 'none',
                fontFamily: act.code ? 'var(--mol-font-mono, monospace)' : 'inherit',
              }
              // An unapproved scheme (`javascript:`, `data:` …) never becomes an
              // anchor — the label renders as inert text, same policy as the
              // markdown link allowlist. A protocol-relative href (`//host`)
              // carries no scheme either, but the browser resolves it against
              // the page's protocol to ANOTHER origin — so it opens like an
              // http(s) link: new tab, `noopener noreferrer`, never a same-tab
              // navigation off-origin.
              const externalHref =
                !!act.href && (/^https?:\/\//i.test(act.href) || act.href.startsWith('//'))
              return act.href ? (
                isAllowedLinkHref(act.href) ? (
                  <a
                    key={i}
                    href={act.href}
                    target={externalHref ? '_blank' : undefined}
                    rel={externalHref ? 'noopener noreferrer' : undefined}
                    className={className}
                    style={actionStyle}
                  >
                    {act.label}
                  </a>
                ) : (
                  <span key={i} className={className} style={actionStyle}>
                    {act.label}
                  </span>
                )
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={act.onClick}
                  className={className}
                  style={actionStyle}
                >
                  {act.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ResourceLimitBanner — upgrade prompt when sandbox runs out of memory / a limit hits
// ---------------------------------------------------------------------------

/**
 * Inline banner shown when the sandbox runs out of memory (or another usage limit
 * is hit), prompting the user to upgrade. Renders through the shared
 * {@link NoticeCard} so it has the SAME matched-weight icon + accent button row as
 * every other upgrade notice — no bespoke icon, no single-link special case. The
 * host supplies the sign-in / upgrade buttons via `buildUpgradeCta` → `action`.
 *
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered upgrade banner element.
 */
export function ResourceLimitBanner({
  message,
  action,
}: {
  message: string
  action?: ChatEventCardAction | ChatEventCardAction[] | null
}): JSX.Element {
  return <NoticeCard tone="upgrade" text={message} action={action} />
}
