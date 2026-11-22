/**
 * Auto-tip card — a dismissable, non-interrupting info card surfaced on a
 * fresh conversation and periodically thereafter. It is NOT a chat message —
 * it never triggers the model and never blocks the input; the user dismisses
 * it with the close button.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `TipCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. The tip text is split on its `/` and `@`
 * tokens, which render as inline monospace code; the accent recolours the
 * card's tint and the leading icon together; the dismiss mark brightens on
 * hover. The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/`. React keys the text segments
 * `key={i}`, so the segments are re-created from the split on every text
 * change the way React's re-render rebuilds them.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { CHAT_CARD_ICON_SIZE, chatCardStyle } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../components/Icon.jsx'

/**
 * Inline monospace code style for command/`@file` tokens in a tip (mvp #10).
 */
const TIP_CODE_STYLE: Record<string, string> = {
  'font-family': 'var(--mol-font-mono, monospace)',
  'font-size': '0.92em',
  padding: '1px 5px',
  'border-radius': '4px',
  background: 'rgba(128,128,128,0.16)',
  border: '1px solid rgba(128,128,128,0.18)',
  'white-space': 'nowrap',
}

/** Matches a slash-command or `@file` token (`/plan`, `@filename`, or a bare `/` or `@`). */
const TIP_TOKEN_RE = /([@/][\w-]*)/g

/** The neutral icon accent when the tip carries no semantic one. */
const NEUTRAL_ACCENT = 'var(--mol-color-primary, #6366f1)'

/**
 * The dismiss mark's inline style: the IDE's shared icon-only ✕ dismiss (18px
 * box, 4px radius, 0.6 resting opacity) — mol-bespoke-button, on the compact
 * 36px floor these dense cards use.
 */
const DISMISS_STYLE: Record<string, string> = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  width: '18px',
  height: '18px',
  'border-radius': '4px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  opacity: '0.6',
  transition: 'opacity 100ms, background 100ms',
}

/** Props for {@link TipCard} — the React prop names, React's own contract. */
export interface TipCardProps {
  /** The (already-localized) tip text. */
  text: string
  /** Dismisses the tip — the host removes it from the timeline. */
  onDismiss: () => void
  /**
   * Recolours the card tint + icon for a semantic tip (e.g. the gold viewer
   * tip that explains the team-only message treatment).
   */
  accent?: string
  /** Overrides the leading glyph (default `lightbulb`). */
  icon?: IconName
}

/**
 * Brightens the dismiss mark while the pointer is over it (React's
 * `onMouseEnter`).
 *
 * @param event - The native mouse event.
 */
function onMouseEnter(event: MouseEvent): void {
  const el = event.currentTarget as HTMLElement
  el.style.opacity = '1'
  el.style.background = 'rgba(128,128,128,0.2)'
}

/**
 * Restores the dismiss mark's resting opacity when the pointer leaves
 * (React's `onMouseLeave`).
 *
 * @param event - The native mouse event.
 */
function onMouseLeave(event: MouseEvent): void {
  const el = event.currentTarget as HTMLElement
  el.style.opacity = '0.6'
  el.style.background = 'transparent'
}

/**
 * Renders a single dismissable onboarding tip.
 *
 * @param props - See {@link TipCardProps}.
 * @returns The rendered tip card.
 */
export function TipCard(props: TipCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="chat-tip-card"
      class={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style={{
        display: 'flex',
        'align-items': 'flex-start',
        gap: '8px',
        // One chat-timeline rhythm: bottom margin only, never a top margin
        // (matches ChatPanel's TIMELINE_ITEM_GAP so adjacent items never
        // collide — P4-05).
        'margin-bottom': '16px',
        // Shared card chrome: subtle accent tint + a uniform 1px border on all
        // sides. One source of truth with the other chat info cards
        // (chat-card-style).
        ...cardStyle(props.accent),
        'line-height': '1.5',
      }}
    >
      <Icon
        name={props.icon ?? 'lightbulb'}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{
          'flex-shrink': '0',
          'margin-top': '1px',
          color: props.accent ?? NEUTRAL_ACCENT,
        }}
      />
      <span style={{ flex: '1 1 0%' }}>
        {props.text
          .split(TIP_TOKEN_RE)
          .map((part) =>
            part && /^[@/]/.test(part) ? (
              <code style={TIP_CODE_STYLE}>{part}</code>
            ) : (
              <span>{part}</span>
            ),
          )}
      </span>
      <button
        type="button"
        data-mol-id="chat-tip-dismiss"
        onClick={props.onDismiss}
        aria-label={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
        title={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
        class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
        style={DISMISS_STYLE}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * The chat cards' shared container chrome, with the radius written as `px`
 * (the neutral helper returns a unitless number, a React-ism this framework's
 * style objects do not take).
 *
 * @param accent - Tint/border source colour; `undefined` is the theme primary.
 * @returns The container's inline style fields.
 */
function cardStyle(accent: string | undefined): Record<string, string> {
  const { padding, border, background } = chatCardStyle(accent)
  return { padding, 'border-radius': '8px', border, background }
}
