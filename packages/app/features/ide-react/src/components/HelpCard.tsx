/**
 * `/help` card.
 *
 * Renders a concise, high-level guide as an in-timeline card — matching the
 * `/settings` and `/skills` cards — instead of the muted monospace ASCII text
 * blob the generic system-card branch used to produce. It deliberately does NOT
 * relist the slash commands: typing `/` opens the command menu, which does that
 * better. The card covers the three conversation modes and the efficiency tips,
 * generated from the SAME {@link HELP_MODES} / {@link HELP_TIPS} constants the
 * plain-text {@link buildHelpText} fallback reads — so the card and the fallback
 * can never drift.
 *
 * Styling uses `getClassMap()` (`cm.*`) for structure/typography and the
 * `--color-primary` theme token for the upgrade CTA; the only inline styles are
 * layout/spacing the ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ChatEventCardAction } from '../customEventCards.js'
import { chatCardStyle } from './chat-card-style.js'
import { HELP_INTRO, HELP_MODES, HELP_SHORTCUTS, HELP_TIPS } from './chat-help-utilities.js'
import { Icon } from './Icon.js'

/**
 * The `/help` high-level guide card.
 *
 * @param props - Component props.
 * @returns The rendered help card.
 */
export function HelpCard({
  isLight,
  agentName = DEFAULT_AGENT_NAME,
  productName = DEFAULT_PRODUCT_NAME,
  upgradeLines,
  upgradeAction,
}: {
  isLight: boolean
  agentName?: string
  productName?: string
  upgradeLines?: readonly string[]
  upgradeAction?: ChatEventCardAction | ChatEventCardAction[]
}): JSX.Element {
  const cm = getClassMap()
  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const sectionHeading = cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))
  const upgradeActions: ChatEventCardAction[] = upgradeAction
    ? Array.isArray(upgradeAction)
      ? upgradeAction
      : [upgradeAction]
    : []

  return (
    <div
      data-mol-id="help-card"
      className={cm.textSize('xs')}
      // Shared card chrome: subtle primary tint + a uniform 1px border on all sides.
      // One source of truth with the other chat info cards (chat-card-style).
      style={{ ...chatCardStyle(), marginBottom: 16 }}
    >
      {/* ── Getting started ── */}
      <div className={sectionHeading} style={{ marginBottom: 4 }}>
        {t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' })}
      </div>
      <div className={cm.textMuted} style={{ lineHeight: 1.4, marginBottom: 4 }}>
        {t(HELP_INTRO.key, { agentName, productName }, { defaultValue: HELP_INTRO.defaultValue })}
      </div>

      {/* ── Modes ── */}
      <div className={sectionHeading} style={{ marginTop: 12, marginBottom: 4 }}>
        {t('ide.chat.help.card.modesTitle', undefined, { defaultValue: 'Modes' })}
      </div>
      <div data-mol-id="help-modes">
        {HELP_MODES.map((helpMode) => (
          <div
            key={helpMode.id}
            data-mol-id={`help-mode-${helpMode.id}`}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}
          >
            <Icon
              name={helpMode.icon}
              size={14}
              aria-hidden="true"
              data-mol-id={`help-mode-icon-${helpMode.id}`}
              className={cm.textMuted}
              style={{ flexShrink: 0, marginTop: 2, opacity: 0.8 }}
            />
            <span className={cm.textMuted} style={{ flex: 1, lineHeight: 1.4 }}>
              {t(helpMode.key, { agentName }, { defaultValue: helpMode.defaultValue })}
            </span>
          </div>
        ))}
      </div>

      {/* ── Efficiency tips ── */}
      <div className={sectionHeading} style={{ marginTop: 12, marginBottom: 4 }}>
        {t('ide.chat.help.card.tipsTitle', undefined, { defaultValue: 'Tips' })}
      </div>
      <div data-mol-id="help-tips">
        {HELP_TIPS.map((tip) => (
          <div
            key={tip.id}
            data-mol-id={`help-tip-${tip.id}`}
            className={cm.textMuted}
            style={{ padding: '2px 0', lineHeight: 1.4 }}
          >
            {t(tip.key, { agentName }, { defaultValue: tip.defaultValue })}
          </div>
        ))}
        <div className={cm.textMuted} style={{ marginTop: 6, lineHeight: 1.4 }}>
          {t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue })}
        </div>
      </div>

      {/* ── Host-supplied upgrade / plan blurb (the shared IDE owns no pricing copy) ── */}
      {upgradeLines && upgradeLines.length > 0 && (
        <div
          data-mol-id="help-upgrade"
          className={cm.borderT}
          style={{ marginTop: 10, paddingTop: 8, borderColor: rowBorder }}
        >
          {upgradeLines.map((line, i) => (
            <div key={i} className={cm.textMuted} style={{ lineHeight: 1.4 }}>
              {line}
            </div>
          ))}
          {upgradeActions.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {upgradeActions.map((act, i) =>
                act.href ? (
                  <a
                    key={i}
                    data-mol-id="help-upgrade-action"
                    href={act.href}
                    target={act.href.startsWith('http') ? '_blank' : undefined}
                    rel={act.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
                  >
                    {act.label}
                  </a>
                ) : (
                  <button
                    key={i}
                    type="button"
                    data-mol-id="help-upgrade-action"
                    onClick={act.onClick}
                    className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
                  >
                    {act.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
