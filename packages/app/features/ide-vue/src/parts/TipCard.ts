/**
 * Auto-tip card — a dismissable, non-interrupting info card surfaced on a
 * fresh conversation and periodically thereafter. It is NOT a chat message —
 * it never triggers the model and never blocks the input; the user dismisses
 * it with the close button.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `TipCard` (see that file for
 * the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. The tip text is split on its `/` and `@`
 * tokens, which render as inline monospace code; the accent recolours the
 * card's tint and the leading icon together; the dismiss mark brightens on
 * hover. The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { CHAT_CARD_ICON_SIZE, chatCardStyle } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from '../components/Icon.js'

/**
 * Inline monospace code style for command/`@file` tokens in a tip (mvp #10),
 * with the radius written as `px` the way the DOM takes it here.
 */
const TIP_CODE_STYLE: Record<string, string> = {
  fontFamily: 'var(--mol-font-mono, monospace)',
  fontSize: '0.92em',
  padding: '1px 5px',
  borderRadius: '4px',
  background: 'rgba(128,128,128,0.16)',
  border: '1px solid rgba(128,128,128,0.18)',
  whiteSpace: 'nowrap',
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
  alignItems: 'center',
  justifyContent: 'center',
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  opacity: '0.6',
  transition: 'opacity 100ms, background 100ms',
}

/**
 * Render tip text with command / `@file` tokens as inline monospace code so
 * they stand out (mvp #10) — e.g. "type `/` to browse, or `@filename` to
 * attach".
 *
 * @param text - The (already-localized) tip text.
 * @returns The text split into plain spans + monospace code tokens.
 */
function renderTipText(text: string): VNodeChild[] {
  return text
    .split(TIP_TOKEN_RE)
    .map((part, i) =>
      part && /^[@/]/.test(part)
        ? h('code', { key: i, style: TIP_CODE_STYLE }, [part])
        : h('span', { key: i }, [part]),
    )
}

/**
 * Brightens the dismiss mark while the pointer is over it (React's
 * `onMouseEnter`).
 *
 * @param event - The native mouse event.
 */
function onEnter(event: MouseEvent): void {
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
function onLeave(event: MouseEvent): void {
  const el = event.currentTarget as HTMLElement
  el.style.opacity = '0.6'
  el.style.background = 'transparent'
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
 * Renders a single dismissable onboarding tip. React renders it under the
 * React name `TipCard`.
 *
 * @param props - See {@link TipCardProps}.
 * @returns The rendered tip card.
 */
export const TipCard = defineComponent({
  name: 'TipCard',
  inheritAttrs: false,
  props: {
    /** The (already-localized) tip text. */
    text: { type: String, required: true },
    /** Dismisses the tip — the host removes it from the timeline. */
    onDismiss: { type: Function as PropType<() => void>, required: true },
    /**
     * Recolours the card tint + icon for a semantic tip (e.g. the gold viewer
     * tip that explains the team-only message treatment).
     */
    accent: { type: String, required: false, default: undefined },
    /** Overrides the leading glyph (default `lightbulb`). */
    icon: { type: String as PropType<IconName>, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const dismissLabel = t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })
      return h(
        'div',
        {
          'data-mol-id': 'chat-tip-card',
          class: cm.cn(cm.textSize('xs'), cm.textMuted),
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            // One chat-timeline rhythm: bottom margin only, never a top margin
            // (matches ChatPanel's TIMELINE_ITEM_GAP so adjacent items never
            // collide — P4-05).
            marginBottom: '16px',
            // Shared card chrome: subtle accent tint + a uniform 1px border on
            // all sides. One source of truth with the other chat info cards
            // (chat-card-style).
            ...cardStyle(props.accent),
            lineHeight: '1.5',
          },
        },
        [
          h(Icon, {
            name: props.icon ?? 'lightbulb',
            size: CHAT_CARD_ICON_SIZE,
            'aria-hidden': 'true',
            style: {
              flexShrink: '0',
              marginTop: '1px',
              color: props.accent ?? NEUTRAL_ACCENT,
            },
          }),
          h('span', { style: { flex: '1' } }, renderTipText(props.text)),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-tip-dismiss',
              onClick: props.onDismiss,
              'aria-label': dismissLabel,
              title: dismissLabel,
              class: cm.cn(cm.touchTargetCompact, cm.shrink0),
              style: DISMISS_STYLE,
              onMouseenter: onEnter,
              onMouseleave: onLeave,
            },
            [
              h(
                'svg',
                {
                  width: '11',
                  height: '11',
                  viewBox: '0 0 16 16',
                  fill: 'none',
                  'aria-hidden': 'true',
                },
                [
                  h('path', {
                    d: 'M3 3l10 10M13 3L3 13',
                    stroke: 'currentColor',
                    'stroke-width': '1.6',
                    'stroke-linecap': 'round',
                  }),
                ],
              ),
            ],
          ),
        ],
      )
    }
  },
})

/**
 * The chat cards' shared container chrome, with the radius written as `px`
 * the way the DOM takes it here (the neutral helper returns a unitless number
 * for React).
 *
 * @param accent - Tint/border source colour; `undefined` is the theme primary.
 * @returns The container's inline style fields.
 */
function cardStyle(accent: string | undefined): Record<string, string> {
  const { padding, border, background } = chatCardStyle(accent)
  return { padding, borderRadius: '8px', border, background }
}
