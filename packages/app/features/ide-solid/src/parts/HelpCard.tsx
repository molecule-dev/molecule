/**
 * `/help` card — a concise, high-level guide rendered as an in-timeline card.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `HelpCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. The card covers the intro paragraph, the
 * three conversation modes and the efficiency tips, generated from the SAME
 * `HELP_INTRO` / `HELP_MODES` / `HELP_SHORTCUTS` / `HELP_TIPS` constants the
 * plain-text fallback reads, plus the host-supplied upgrade blurb (the shared
 * IDE owns no pricing copy). The component is a part (React renders it inside
 * the chat timeline without exporting it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`) for structure/typography; the only
 * inline styles are layout/spacing the ClassMap can't express, with the radius
 * written as `px` (the neutral helper returns a unitless number, a React-ism
 * this framework's style objects do not take). Every value derived from the
 * props is read through a getter so a prop change re-renders in place, the way
 * React's render does. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import {
  HELP_INTRO,
  HELP_MODES,
  HELP_SHORTCUTS,
  HELP_TIPS,
} from '@molecule/app-ide-panel-logic/panels'
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../components/Icon.jsx'
import { isAllowedLinkHref } from './MarkdownContent.jsx'

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
 * (the neutral helper returns a unitless number, a React-ism this framework's
 * style objects do not take).
 *
 * @returns The container's inline style fields.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, 'border-radius': '8px', border, background }
}

/**
 * Renders one upgrade action: an allowlisted href becomes an anchor (external
 * ones open in a new tab), an unapproved scheme stays inert text, and a
 * handler-backed action is a button.
 *
 * @param act - The action.
 * @param ctaClass - The shared CTA classes.
 * @returns The action's node.
 */
function actionNode(act: ChatEventCardAction, ctaClass: string): JSX.Element {
  if (act.href) {
    if (!isAllowedLinkHref(act.href)) {
      return <span data-mol-id="help-upgrade-action">{act.label}</span>
    }
    const external = act.href.startsWith('http')
    return (
      <a
        data-mol-id="help-upgrade-action"
        href={act.href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        class={ctaClass}
      >
        {act.label}
      </a>
    )
  }
  return (
    <button type="button" data-mol-id="help-upgrade-action" onClick={act.onClick} class={ctaClass}>
      {act.label}
    </button>
  )
}

/**
 * The `/help` high-level guide card.
 *
 * @param props - See {@link HelpCardProps}.
 * @returns The rendered help card.
 */
export function HelpCard(props: HelpCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sectionHeading = (): string => cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))
  const rowBorder = (): string => (props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
  const upgradeLines = (): readonly string[] => props.upgradeLines ?? []
  const upgradeActions = (): ChatEventCardAction[] =>
    props.upgradeAction
      ? Array.isArray(props.upgradeAction)
        ? props.upgradeAction
        : [props.upgradeAction]
      : []
  const ctaClass = (): string =>
    cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact)

  return (
    <div
      data-mol-id="help-card"
      class={cm.textSize('xs')}
      style={{ ...cardStyle(), 'margin-bottom': '16px' }}
    >
      {/* ── Getting started ── */}
      <div class={sectionHeading()} style={{ 'margin-bottom': '4px' }}>
        {t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' })}
      </div>
      <div class={cm.textMuted} style={{ 'line-height': '1.4', 'margin-bottom': '4px' }}>
        {t(
          HELP_INTRO.key,
          {
            agentName: props.agentName ?? DEFAULT_AGENT_NAME,
            productName: props.productName ?? DEFAULT_PRODUCT_NAME,
          },
          { defaultValue: HELP_INTRO.defaultValue },
        )}
      </div>

      {/* ── Modes ── */}
      <div class={sectionHeading()} style={{ 'margin-top': '12px', 'margin-bottom': '4px' }}>
        {t('ide.chat.help.card.modesTitle', undefined, { defaultValue: 'Modes' })}
      </div>
      <div data-mol-id="help-modes">
        {HELP_MODES.map((helpMode) => (
          <div
            data-mol-id={`help-mode-${helpMode.id}`}
            style={{
              display: 'flex',
              'align-items': 'flex-start',
              gap: '8px',
              padding: '3px 0px',
            }}
          >
            <Icon
              name={helpMode.icon}
              size={14}
              aria-hidden="true"
              data-mol-id={`help-mode-icon-${helpMode.id}`}
              className={cm.textMuted}
              style={{ 'flex-shrink': '0', 'margin-top': '2px', opacity: '0.8' }}
            />
            <span class={cm.textMuted} style={{ flex: '1 1 0%', 'line-height': '1.4' }}>
              {t(
                helpMode.key,
                { agentName: props.agentName ?? DEFAULT_AGENT_NAME },
                { defaultValue: helpMode.defaultValue },
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ── Efficiency tips ── */}
      <div class={sectionHeading()} style={{ 'margin-top': '12px', 'margin-bottom': '4px' }}>
        {t('ide.chat.help.card.tipsTitle', undefined, { defaultValue: 'Tips' })}
      </div>
      <div data-mol-id="help-tips">
        {HELP_TIPS.map((tip) => (
          <div
            data-mol-id={`help-tip-${tip.id}`}
            class={cm.textMuted}
            style={{ padding: '2px 0px', 'line-height': '1.4' }}
          >
            {t(
              tip.key,
              { agentName: props.agentName ?? DEFAULT_AGENT_NAME },
              { defaultValue: tip.defaultValue },
            )}
          </div>
        ))}
        <div class={cm.textMuted} style={{ 'margin-top': '6px', 'line-height': '1.4' }}>
          {t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue })}
        </div>
      </div>

      {/* ── Host-supplied upgrade / plan blurb ── */}
      {upgradeLines().length > 0 && (
        <div
          data-mol-id="help-upgrade"
          class={cm.borderT}
          style={{ 'margin-top': '10px', 'padding-top': '8px', 'border-color': rowBorder() }}
        >
          {upgradeLines().map((line) => (
            <div class={cm.textMuted} style={{ 'line-height': '1.4' }}>
              {line}
            </div>
          ))}
          {upgradeActions().length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                'margin-top': '8px',
                'flex-wrap': 'wrap',
              }}
            >
              {upgradeActions().map((act) => actionNode(act, ctaClass()))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
