/**
 * `/settings` view.
 *
 * Renders an in-timeline card with two sections:
 *
 * 1. **Settings** — every user-controllable agent setting (default model, the
 *    per-mode plan/execute models, mode, reasoning effort, max tool iterations,
 *    auto-fix, auto-commit, hooks, notification sounds) with its current value, a
 *    one-line description, and — for settings a slash command edits — an inline
 *    "Edit" affordance that runs (or prefills) that command (so the picker/toggle
 *    opens in the chat input). Settings with no editing command (e.g. hooks,
 *    configured in a file) render the row without an Edit button. The rows are
 *    derived from the shared {@link SETTINGS} metadata via `buildSettingsList`,
 *    so the panel can never understate the configuration.
 * 2. **Slash commands** — every command from the {@link COMMANDS} registry,
 *    grouped by category, with its argument syntax and explanation.
 *
 * Both lists are generated from the shared metadata / the registry so they can
 * never drift from what the chat actually supports. Styling uses
 * `getClassMap()` (`cm.*`); each edit affordance reveals the command it runs via
 * the framework styled {@link Tooltip} (never a native `title`). The only inline
 * styles are layout/spacing the ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { DEFAULT_AGENT_NAME } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import { chatCardStyle } from './chat-card-style.js'
import type { CommandId } from './chat-commands.js'
import { groupCommandsByCategory } from './chat-commands.js'
import type { SettingDescriptor } from './chat-settings-utilities.js'

/**
 * The settings + command-reference card shown by `/settings`.
 *
 * @param props - Component props.
 *   (which already provides the `cm.surface` background + border + a header bar with the title and
 *   ✕). The card then renders transparent — dropping its own `cm.surfaceSecondary` fill, outer
 *   margin, border-radius, and its redundant "Settings" section heading — so the overlay reads as
 *   ONE clean surface (like the /sounds popup) instead of a nested gray card. The inner padding and
 *   the "Slash commands" sub-heading are kept. When `false`/omitted (the inline-timeline render
 *   path) the card keeps its full card chrome unchanged.
 * @returns The rendered settings card.
 */
export function SettingsCard({
  settings,
  onRunCommand,
  onPrefillInput,
  isLight,
  agentName = DEFAULT_AGENT_NAME,
  embedded,
}: {
  settings: readonly SettingDescriptor[]
  onRunCommand: (id: CommandId) => void
  onPrefillInput?: (input: string) => void
  isLight: boolean
  agentName?: string
  embedded?: boolean
}): JSX.Element {
  const cm = getClassMap()
  const groups = groupCommandsByCategory()
  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'

  return (
    <div
      data-mol-id="settings-card"
      className={cm.textSize('xs')}
      // Non-embedded (inline in the chat timeline) shares the same card chrome as
      // every other info card: subtle primary tint + a uniform 1px border on all
      // sides (chat-card-style). Embedded in an overlay it stays chrome-less.
      style={embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 }}
    >
      {/* ── Section: settings ── */}
      {/* Same header structure as SkillsCard + ScriptsCard — a flex row with the
          title area on the LEFT and room for a primary action on the right. Settings
          has no header action, so the right side is empty, but keeping the identical
          shell makes all three overlay cards line up. The overlay's header bar already
          shows the "Settings" title, so the card suppresses its own redundant section
          heading when embedded (single clean title). */}
      {!embedded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })}
            </div>
          </div>
        </div>
      )}
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
                {t(
                  `ide.chat.settings.${setting.id}.desc`,
                  { agentName },
                  {
                    defaultValue: setting.description,
                  },
                )}
              </div>
            </div>
            {setting.editCommand && (
              <div style={{ flexShrink: 0 }}>
                <Tooltip
                  content={t(
                    'ide.chat.settings.editVia',
                    { command: setting.editInput ?? `/${setting.editCommand}` },
                    { defaultValue: 'Edit via {{command}}' },
                  )}
                  placement="top"
                >
                  <button
                    type="button"
                    data-mol-id={`setting-edit-${setting.id}`}
                    onClick={() =>
                      setting.editInput && onPrefillInput
                        ? onPrefillInput(setting.editInput)
                        : onRunCommand(setting.editCommand as CommandId)
                    }
                    className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
                  >
                    {t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' })}
                  </button>
                </Tooltip>
              </div>
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
              // Description BENEATH the command (mirrors the Settings section above),
              // separated by margin/whitespace only — deliberately no border between rows.
              <div
                key={cmd.id}
                data-mol-id={`settings-command-${cmd.id}`}
                style={{ padding: '2px 0', marginBottom: 4 }}
              >
                <code
                  style={{
                    display: 'block',
                    fontFamily: 'var(--mol-font-mono, monospace)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cmd.usage ?? cmd.label}
                </code>
                <div className={cm.textMuted} style={{ marginTop: 2, lineHeight: 1.4 }}>
                  {t(
                    `ide.chat.cmd.${cmd.id}.desc`,
                    { agentName },
                    { defaultValue: cmd.description },
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
