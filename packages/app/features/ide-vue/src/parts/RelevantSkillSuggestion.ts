/**
 * Proactive "Relevant skill" suggestion.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `RelevantSkillSuggestion` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. It shows the SINGLE best matching
 * project skill just above the chat composer, with a one-click **Load**, a
 * clickable monospace skill name (when `onOpen` is wired) and a dismiss control.
 * The skill's description surfaces through the framework's REAL styled
 * {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never the delayed,
 * touch-blind native `title` — and the label carries a second Tooltip explaining
 * the keyword match. The leading glyph is a real SVG from the bonded icon set,
 * and the tint comes from ClassMap/theme tokens, never a hardcoded color.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from '../components/Icon.js'

/**
 * The skill name's inline style: monospace, one line, ellipsis when it
 * overflows — the pixel values written the way the DOM takes them here.
 */
const NAME_STYLE: Record<string, string> = {
  flex: '1 1 0%',
  minWidth: '0px',
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--mol-font-mono, monospace)',
  fontSize: '0.95em',
}

/**
 * The skill name's style when it is a button: the same text treatment plus a
 * button reset and the theme primary color (React spreads `nameStyle` and then
 * adds these).
 */
const NAME_BUTTON_STYLE: Record<string, string> = {
  ...NAME_STYLE,
  background: 'none',
  border: 'none',
  padding: '0px',
  cursor: 'pointer',
  color: 'var(--mol-color-primary, #6366f1)',
}

/**
 * The dismiss mark's inline style: the IDE's shared icon-only ✕ dismiss (18px
 * box, 4px radius, 0.6 resting opacity) — mol-bespoke-button, identical to the
 * TipCard dismiss it stacks with.
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
 * Restores the dismiss mark's resting opacity when the pointer leaves (React's
 * `onMouseLeave`).
 *
 * @param event - The native mouse event.
 */
function onLeave(event: MouseEvent): void {
  const el = event.currentTarget as HTMLElement
  el.style.opacity = '0.6'
  el.style.background = 'transparent'
}

/** Props for {@link RelevantSkillSuggestion} — the React prop names, React's own contract. */
export interface RelevantSkillSuggestionProps {
  /** The skill to suggest. */
  skill: SkillInfo
  /** Loads the skill — opens it in the editor. */
  onLoad: (skill: SkillInfo) => void
  /** Opens the skill the way the clickable name does; omitted, the name is plain text. */
  onOpen?: (skill: SkillInfo) => void
  /** Dismisses the suggestion. */
  onDismiss: (skill: SkillInfo) => void
}

/**
 * Renders the proactive relevant-skill suggestion.
 *
 * @param props - See {@link RelevantSkillSuggestionProps}.
 * @returns The rendered suggestion affordance.
 */
export const RelevantSkillSuggestion = defineComponent({
  name: 'RelevantSkillSuggestion',
  inheritAttrs: false,
  props: {
    /** The skill to suggest. */
    skill: { type: Object as PropType<SkillInfo>, required: true },
    /** Loads the skill — opens it in the editor. */
    onLoad: { type: Function as PropType<(skill: SkillInfo) => void>, required: true },
    /** Opens the skill the way the clickable name does; omitted, the name is plain text. */
    onOpen: {
      type: Function as PropType<(skill: SkillInfo) => void>,
      required: false,
      default: undefined,
    },
    /** Dismisses the suggestion. */
    onDismiss: { type: Function as PropType<(skill: SkillInfo) => void>, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      // The styled Tooltip shows the skill's own description; fall back to the
      // generic "open in the editor" hint when a skill ships no description.
      const openHint = t('ide.chat.skills.loadTitle', undefined, {
        defaultValue: 'Open in the editor',
      })
      const tooltip = props.skill.description || openHint
      // Answer "how was this detected?" in-product: the suggestion came from a
      // keyword match on the recent messages (not regex/AI).
      const matchHint = t('ide.chat.skills.matchHint', undefined, {
        defaultValue: 'Suggested from keywords in your recent messages',
      })

      return h(
        'div',
        {
          'data-mol-id': 'relevant-skill-suggestion',
          class: cm.cn(cm.textSize('xs')),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '6px 10px 0px',
            padding: '5px 8px',
            borderRadius: '6px',
            // Tint follows the active theme's primary color (light/dark + per-app
            // brand) via color-mix on the theme token — never a hardcoded color;
            // the hex is only the CSS-var fallback (the TipCard convention).
            border:
              '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 26%, transparent)',
            background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 7%, transparent)',
          },
        },
        [
          h(Tooltip, { content: tooltip, placement: 'top' }, () =>
            h(Icon, {
              name: 'lightbulb',
              size: 18,
              'data-mol-id': 'relevant-skill-icon',
              'aria-hidden': 'true',
              style: {
                color: 'var(--mol-color-primary, #6366f1)',
                opacity: '0.9',
              },
            }),
          ),
          h(Tooltip, { content: matchHint, placement: 'top' }, () =>
            h(
              'span',
              {
                class: cm.textMuted,
                'data-mol-id': 'relevant-skill-label',
                style: {
                  flexShrink: '0',
                  // A help cursor + subtle dotted underline signal the label
                  // carries the "why am I seeing this?" hint.
                  cursor: 'help',
                  textDecoration: 'underline dotted',
                  textUnderlineOffset: '2px',
                  textDecorationColor: 'color-mix(in srgb, currentColor 40%, transparent)',
                },
              },
              [t('ide.chat.skills.relevant.label', undefined, { defaultValue: 'Relevant skill' })],
            ),
          ),
          props.onOpen
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'relevant-skill-name',
                  onClick: () => props.onOpen?.(props.skill),
                  class: cm.touchTargetCompact,
                  style: NAME_BUTTON_STYLE,
                },
                [props.skill.name],
              )
            : h('span', { 'data-mol-id': 'relevant-skill-name', style: NAME_STYLE }, [
                props.skill.name,
              ]),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'relevant-skill-load',
              onClick: () => props.onLoad(props.skill),
              class: cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              ),
            },
            [t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })],
          ),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'relevant-skill-dismiss',
              onClick: () => props.onDismiss(props.skill),
              'aria-label': t('ide.chat.skills.relevant.dismiss', undefined, {
                defaultValue: 'Dismiss suggestion',
              }),
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
