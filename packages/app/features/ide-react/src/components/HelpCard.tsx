/**
 * `/help` card.
 *
 * Renders the workflow guide as an interactive in-timeline card — matching the
 * `/models`, `/settings`, and `/skills` cards — instead of the muted monospace
 * ASCII text blob the generic system-card branch used to produce. It has a real
 * category hierarchy (each command category headed by an SVG glyph from the
 * bonded icon set), the three conversation modes, and the efficiency tips, all
 * generated from the SAME {@link COMMANDS} registry and {@link HELP_MODES} /
 * {@link HELP_TIPS} constants the plain-text {@link buildHelpText} fallback reads
 * — so the card and the fallback can never drift.
 *
 * Every command row is a clickable button: clicking it runs (or prefills) the
 * command via {@link onRunCommand}, exactly like the `/settings` card's inline
 * affordances. Commands that take arguments reveal their syntax via the framework
 * styled {@link Tooltip} (never a native `title`).
 *
 * Styling uses `getClassMap()` (`cm.*`) for structure/typography and the
 * `--color-primary` theme token for the upgrade CTA; the only inline styles are
 * layout/spacing and the subtle row tints the ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { ChatEventCardAction } from '../customEventCards.js'
import type { CommandCategoryKey, CommandId } from './chat-commands.js'
import { groupCommandsByCategory } from './chat-commands.js'
import { HELP_INTRO, HELP_MODES, HELP_SHORTCUTS, HELP_TIPS } from './chat-help-utilities.js'
import { Icon } from './Icon.js'

/**
 * Icon-set glyph shown beside each command-category heading. Keeps one
 * consistent icon family across the card (no emoji, no ad-hoc `<path>`s).
 */
export const CATEGORY_ICON: Record<CommandCategoryKey, string> = {
  context: 'paperclip',
  code: 'code',
  collaborate: 'people',
  model: 'chat',
  settings: 'gear',
  support: 'question',
}

/**
 * The interactive `/help` card.
 *
 * @param root0 - Component props.
 * @param root0.onRunCommand - Runs (or prefills) a slash command — wired to each clickable command row.
 * @param root0.isLight - Whether the current theme is light mode (drives subtle row tints).
 * @param root0.agentName - Display name of the AI coding agent, interpolated into the intro/modes/tips copy (neutral default: "the assistant").
 * @param root0.productName - Display name of the host product, interpolated into the intro copy (neutral default: "the IDE").
 * @param root0.upgradeLines - Optional host-supplied plan/upgrade blurb lines appended below the reference (the shared IDE owns no pricing copy).
 * @param root0.upgradeAction - Optional host-supplied call-to-action rendered as a button below the upgrade blurb.
 * @returns The rendered help card.
 */
export function HelpCard({
  onRunCommand,
  isLight,
  agentName = DEFAULT_AGENT_NAME,
  productName = DEFAULT_PRODUCT_NAME,
  upgradeLines,
  upgradeAction,
}: {
  onRunCommand: (id: CommandId) => void
  isLight: boolean
  agentName?: string
  productName?: string
  upgradeLines?: readonly string[]
  upgradeAction?: ChatEventCardAction | ChatEventCardAction[]
}): JSX.Element {
  const cm = getClassMap()
  const groups = groupCommandsByCategory()
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
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{ margin: '6px 0', borderRadius: 6, padding: '10px 12px' }}
    >
      {/* ── Getting started ── */}
      <div className={sectionHeading} style={{ marginBottom: 4 }}>
        {t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' })}
      </div>
      <div className={cm.textMuted} style={{ lineHeight: 1.4, marginBottom: 4 }}>
        {t(HELP_INTRO.key, { agentName, productName }, { defaultValue: HELP_INTRO.defaultValue })}
      </div>

      {/* ── Commands, grouped by category, generated from the registry ── */}
      <div className={sectionHeading} style={{ marginTop: 12, marginBottom: 2 }}>
        {t('ide.chat.help.card.commandsTitle', undefined, { defaultValue: 'Commands' })}
      </div>
      <div data-mol-id="help-commands">
        {groups.map((group) => (
          <div key={group.category.key} style={{ marginBottom: 4 }}>
            <div
              data-mol-id={`help-category-${group.category.key}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                marginBottom: 2,
              }}
            >
              <Icon
                name={CATEGORY_ICON[group.category.key]}
                size={13}
                aria-hidden="true"
                data-mol-id={`help-category-icon-${group.category.key}`}
                className={cm.textMuted}
                style={{ flexShrink: 0, opacity: 0.75 }}
              />
              <span
                className={cm.cn(cm.textMuted, cm.fontWeight('medium'))}
                style={{ fontSize: 11 }}
              >
                {t(`ide.chat.help.category.${group.category.key}`, undefined, {
                  defaultValue: group.category.label,
                })}
              </span>
            </div>
            {group.commands.map((cmd) => {
              const description = t(
                `ide.chat.cmd.${cmd.id}.desc`,
                { agentName },
                { defaultValue: cmd.description },
              )
              return (
                <button
                  key={cmd.id}
                  type="button"
                  data-mol-id={`help-command-${cmd.id}`}
                  onClick={() => onRunCommand(cmd.id as CommandId)}
                  className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '4px 6px',
                  }}
                >
                  <code
                    className={cm.fontWeight('medium')}
                    style={{
                      flexShrink: 0,
                      fontFamily: 'var(--mol-font-mono, monospace)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cmd.label}
                  </code>
                  <span className={cm.textMuted} style={{ flex: 1, lineHeight: 1.4 }}>
                    {description}
                  </span>
                  {cmd.usage && (
                    <Tooltip
                      content={t(
                        'ide.chat.help.card.usageHint',
                        { usage: cmd.usage },
                        {
                          defaultValue: 'Usage: {{usage}}  ([…] optional, <…> required)',
                        },
                      )}
                      placement="top"
                    >
                      <code
                        data-mol-id={`help-usage-${cmd.id}`}
                        className={cm.textMuted}
                        style={{
                          flexShrink: 0,
                          fontFamily: 'var(--mol-font-mono, monospace)',
                          fontSize: 10,
                          opacity: 0.8,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cmd.usage}
                      </code>
                    </Tooltip>
                  )}
                </button>
              )
            })}
          </div>
        ))}
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
