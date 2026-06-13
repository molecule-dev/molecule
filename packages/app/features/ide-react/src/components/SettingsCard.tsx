/**
 * `/settings` view.
 *
 * Renders an in-timeline card with two sections:
 *
 * 1. **Settings** — every user-controllable Synthase setting (model, mode, max
 *    tool iterations, auto-fix, notification sounds) with its current value, a
 *    one-line description, and an inline "Edit" affordance that runs the slash
 *    command which changes it (so the picker/toggle opens in the chat input).
 * 2. **Slash commands** — every command from the {@link COMMANDS} registry,
 *    grouped by category, with its argument syntax and explanation.
 *
 * Both lists are generated from the registry / the settings enumeration helper
 * so they can never drift from what the chat actually supports. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are layout/spacing the
 * ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { CommandId } from './chat-commands.js'
import { groupCommandsByCategory } from './chat-commands.js'
import type { SettingDescriptor } from './chat-settings-utilities.js'

/**
 * The settings + command-reference card shown by `/settings`.
 *
 * @param root0 - Component props.
 * @param root0.settings - The enumerated, display-ready user-controllable settings.
 * @param root0.onRunCommand - Runs a slash command (used by the inline "Edit" buttons).
 * @param root0.isLight - Whether the current theme is light mode (drives subtle tints).
 * @returns The rendered settings card.
 */
export function SettingsCard({
  settings,
  onRunCommand,
  isLight,
}: {
  settings: readonly SettingDescriptor[]
  onRunCommand: (id: CommandId) => void
  isLight: boolean
}): JSX.Element {
  const cm = getClassMap()
  const groups = groupCommandsByCategory()
  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'

  return (
    <div
      data-mol-id="settings-card"
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{ margin: '6px 0', borderRadius: 6, padding: '10px 12px' }}
    >
      {/* ── Section: settings ── */}
      <div
        className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
        style={{ marginBottom: 6 }}
      >
        {t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })}
      </div>
      <div data-mol-id="settings-list">
        {settings.map((setting) => (
          <div
            key={setting.id}
            data-mol-id={`setting-row-${setting.id}`}
            className={cm.borderT}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '6px 0',
              borderColor: rowBorder,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className={cm.fontWeight('medium')}>
                  {t(`ide.chat.settings.${setting.id}.label`, undefined, {
                    defaultValue: setting.label,
                  })}
                </span>
                <span
                  className={cm.textMuted}
                  style={{
                    fontSize: 11,
                    padding: '0 6px',
                    borderRadius: 4,
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {setting.value}
                </span>
              </div>
              <div className={cm.textMuted} style={{ marginTop: 2, lineHeight: 1.4 }}>
                {t(`ide.chat.settings.${setting.id}.desc`, undefined, {
                  defaultValue: setting.description,
                })}
              </div>
            </div>
            {setting.editCommand && (
              <button
                type="button"
                data-mol-id={`setting-edit-${setting.id}`}
                onClick={() => onRunCommand(setting.editCommand as CommandId)}
                className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
                style={{ flexShrink: 0 }}
                title={t(
                  'ide.chat.settings.editVia',
                  { command: `/${setting.editCommand}` },
                  { defaultValue: `Edit via /${setting.editCommand}` },
                )}
              >
                {t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' })}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Section: slash commands ── */}
      <div
        className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
        style={{ marginTop: 12, marginBottom: 6 }}
      >
        {t('ide.chat.settings.commandsHeading', undefined, { defaultValue: 'Slash commands' })}
      </div>
      <div data-mol-id="settings-commands">
        {groups.map((group) => (
          <div key={group.category.key} style={{ marginBottom: 6 }}>
            <div className={cm.textMuted} style={{ fontSize: 11, marginBottom: 2 }}>
              {t(`ide.chat.help.category.${group.category.key}`, undefined, {
                defaultValue: group.category.label,
              })}
            </div>
            {group.commands.map((cmd) => (
              <div
                key={cmd.id}
                data-mol-id={`settings-command-${cmd.id}`}
                style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '1px 0' }}
              >
                <code
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--mol-font-mono, monospace)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cmd.usage ?? cmd.label}
                </code>
                <span className={cm.textMuted} style={{ lineHeight: 1.4 }}>
                  {t(`ide.chat.cmd.${cmd.id}.desc`, undefined, { defaultValue: cmd.description })}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
