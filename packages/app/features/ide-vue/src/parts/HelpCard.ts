/**
 * `/help` card — a concise, high-level guide rendered as an in-timeline card.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `HelpCard` (see that file for
 * the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. The card covers the intro paragraph, the three
 * conversation modes and the efficiency tips, generated from the SAME
 * `HELP_INTRO` / `HELP_MODES` / `HELP_SHORTCUTS` / `HELP_TIPS` constants the
 * plain-text fallback reads, plus the host-supplied upgrade blurb (the shared
 * IDE owns no pricing copy). The component is a part (React renders it inside
 * the chat timeline without exporting it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`) for structure/typography; the only
 * inline styles are layout/spacing the ClassMap can't express, written the way
 * the DOM takes them here (`chatCardStyle()`'s unitless radius spelled with
 * `px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import {
  HELP_INTRO,
  HELP_MODES,
  HELP_SHORTCUTS,
  HELP_TIPS,
} from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from '../components/Icon.js'
import { isAllowedLinkHref } from './MarkdownContent.js'

/** Props for {@link HelpCard} — the React prop names, React's own contract. */
export interface HelpCardProps {
  /** Light theme (drives the upgrade rule's colour). */
  isLight: boolean
  /** The agent's display name, interpolated through the guide. */
  agentName?: string
  /** The product's display name, interpolated into the intro. */
  productName?: string
  /** Host-supplied plan/upgrade blurb — the shared IDE owns no pricing copy. */
  upgradeLines?: readonly string[]
  /** The blurb's call-to-action, or a row of them. */
  upgradeAction?: ChatEventCardAction | ChatEventCardAction[]
}

/**
 * The chat cards' shared container chrome, with the radius written as `px`
 * the way the DOM takes it here (the neutral helper returns a unitless number
 * for React).
 *
 * @returns The container's inline style fields.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: '8px', border, background }
}

/**
 * The `/help` high-level guide card.
 *
 * @param props - See {@link HelpCardProps}.
 * @returns The rendered help card.
 */
export const HelpCard = defineComponent({
  name: 'HelpCard',
  inheritAttrs: false,
  props: {
    /** Light theme (drives the upgrade rule's colour). */
    isLight: { type: Boolean, required: true },
    /** The agent's display name, interpolated through the guide. */
    agentName: { type: String, required: false, default: DEFAULT_AGENT_NAME },
    /** The product's display name, interpolated into the intro. */
    productName: { type: String, required: false, default: DEFAULT_PRODUCT_NAME },
    /** Host-supplied plan/upgrade blurb — the shared IDE owns no pricing copy. */
    upgradeLines: {
      type: Array as PropType<readonly string[]>,
      required: false,
      default: undefined,
    },
    /** The blurb's call-to-action, or a row of them. */
    upgradeAction: {
      type: [Object, Array] as PropType<ChatEventCardAction | ChatEventCardAction[]>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const rowBorder = props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
      const sectionHeading = cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))
      const upgradeActions: ChatEventCardAction[] = props.upgradeAction
        ? Array.isArray(props.upgradeAction)
          ? props.upgradeAction
          : [props.upgradeAction]
        : []
      const upgradeLines = props.upgradeLines
      const ctaClass = cm.cn(
        cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
        cm.touchTargetCompact,
      )

      /**
       * One upgrade action: an allowlisted href becomes an anchor (external
       * ones open in a new tab), an unapproved scheme stays inert text, and a
       * handler-backed action is a button.
       *
       * @param act - The action.
       * @param i - Its position in the row (React's `key`).
       * @returns The action's node.
       */
      const actionNode = (act: ChatEventCardAction, i: number): VNodeChild => {
        if (act.href) {
          if (!isAllowedLinkHref(act.href)) {
            return h('span', { key: i, 'data-mol-id': 'help-upgrade-action' }, act.label)
          }
          return h(
            'a',
            {
              key: i,
              'data-mol-id': 'help-upgrade-action',
              href: act.href,
              target: act.href.startsWith('http') ? '_blank' : undefined,
              rel: act.href.startsWith('http') ? 'noopener noreferrer' : undefined,
              class: ctaClass,
            },
            act.label,
          )
        }
        return h(
          'button',
          {
            key: i,
            type: 'button',
            'data-mol-id': 'help-upgrade-action',
            onClick: act.onClick,
            class: ctaClass,
          },
          act.label,
        )
      }

      return h(
        'div',
        {
          'data-mol-id': 'help-card',
          class: cm.textSize('xs'),
          style: { ...cardStyle(), marginBottom: '16px' },
        },
        [
          h(
            'div',
            { class: sectionHeading, style: { marginBottom: '4px' } },
            t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' }),
          ),
          h(
            'div',
            { class: cm.textMuted, style: { lineHeight: '1.4', marginBottom: '4px' } },
            t(
              HELP_INTRO.key,
              { agentName: props.agentName, productName: props.productName },
              { defaultValue: HELP_INTRO.defaultValue },
            ),
          ),
          h(
            'div',
            { class: sectionHeading, style: { marginTop: '12px', marginBottom: '4px' } },
            t('ide.chat.help.card.modesTitle', undefined, { defaultValue: 'Modes' }),
          ),
          h(
            'div',
            { 'data-mol-id': 'help-modes' },
            HELP_MODES.map((helpMode) =>
              h(
                'div',
                {
                  key: helpMode.id,
                  'data-mol-id': `help-mode-${helpMode.id}`,
                  style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '3px 0',
                  },
                },
                [
                  h(Icon, {
                    name: helpMode.icon,
                    size: 14,
                    'aria-hidden': 'true',
                    'data-mol-id': `help-mode-icon-${helpMode.id}`,
                    className: cm.textMuted,
                    style: { flexShrink: '0', marginTop: '2px', opacity: '0.8' },
                  }),
                  h(
                    'span',
                    { class: cm.textMuted, style: { flex: '1', lineHeight: '1.4' } },
                    t(
                      helpMode.key,
                      { agentName: props.agentName },
                      { defaultValue: helpMode.defaultValue },
                    ),
                  ),
                ],
              ),
            ),
          ),
          h(
            'div',
            { class: sectionHeading, style: { marginTop: '12px', marginBottom: '4px' } },
            t('ide.chat.help.card.tipsTitle', undefined, { defaultValue: 'Tips' }),
          ),
          h('div', { 'data-mol-id': 'help-tips' }, [
            ...HELP_TIPS.map((tip) =>
              h(
                'div',
                {
                  key: tip.id,
                  'data-mol-id': `help-tip-${tip.id}`,
                  class: cm.textMuted,
                  style: { padding: '2px 0', lineHeight: '1.4' },
                },
                t(tip.key, { agentName: props.agentName }, { defaultValue: tip.defaultValue }),
              ),
            ),
            h(
              'div',
              { class: cm.textMuted, style: { marginTop: '6px', lineHeight: '1.4' } },
              t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue }),
            ),
          ]),
          upgradeLines && upgradeLines.length > 0
            ? h(
                'div',
                {
                  'data-mol-id': 'help-upgrade',
                  class: cm.borderT,
                  style: { marginTop: '10px', paddingTop: '8px', borderColor: rowBorder },
                },
                [
                  ...upgradeLines.map((line, i) =>
                    h('div', { key: i, class: cm.textMuted, style: { lineHeight: '1.4' } }, line),
                  ),
                  upgradeActions.length > 0
                    ? h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                            flexWrap: 'wrap',
                          },
                        },
                        upgradeActions.map(actionNode),
                      )
                    : null,
                ],
              )
            : null,
        ],
      )
    }
  },
})
