/**
 * `/settings` — the settings + slash-command reference card.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `SettingsCard` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The rows come from the shared
 * `SettingDescriptor` list (built from the canonical `SETTINGS` metadata) and
 * the command reference is grouped from the shared `COMMANDS` registry, so the
 * card can never drift from what the chat supports. Every row a slash command
 * edits carries an inline "Edit" affordance that runs (or prefills) that
 * command, revealed through the framework styled `Tooltip`.
 *
 * Every prop read stays reactive (the component body runs once, so the branches
 * and style helpers read the live props where JSX and effects evaluate them).
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express, in this framework's kebab-case with explicit `px`
 * (Solid does not add the unit React adds for a bare number). All user-facing
 * text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'

import { DEFAULT_AGENT_NAME } from '@molecule/app-ai-chat'
import type { CommandId } from '@molecule/app-ide-panel-logic'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import {
  commandCategoryLabel,
  commandDescription,
  groupCommandsByCategory,
  isRegistryCommandId,
  settingDescription,
  settingLabel,
} from '@molecule/app-ide-panel-logic'
import type { SettingDescriptor } from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-solid'

/** Props for {@link SettingsCard} — the React prop names, React's own contract. */
export interface SettingsCardProps {
  /** The ordered settings rows (built from the shared `SETTINGS` metadata). */
  settings: readonly SettingDescriptor[]
  /** Runs a slash command (a setting whose edit is the bare command). */
  onRunCommand: (id: CommandId) => void
  /** Prefills the chat input with a scoped command (a mode-scoped model edit). */
  onPrefillInput?: (input: string) => void
  /** Whether the host theme is light (drives the row border + value pill colours). */
  isLight: boolean
  /** The host's agent identity, interpolated into the descriptions. */
  agentName?: string
  /** Whether the card sits inside the settings overlay (`true`) or the chat timeline. */
  embedded?: boolean
}

/**
 * The settings + command-reference card shown by `/settings`.
 *
 * @param props - See {@link SettingsCardProps}.
 * @returns The rendered settings card.
 */
export function SettingsCard(props: SettingsCardProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()

  /** The host's agent identity, React's `agentName = DEFAULT_AGENT_NAME` default. */
  const agentName = (): string => props.agentName ?? DEFAULT_AGENT_NAME

  /** The theme's row border colour. */
  const rowBorder = (): string => (props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')

  /** The theme's value-pill inset. */
  const valueBg = (): string => (props.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)')

  /** The card container's inline style: chrome-less inside the overlay, the boxed card else. */
  const rootStyle = (): Record<string, string> => {
    if (props.embedded) return { padding: '10px 12px' }
    const { padding, borderRadius, border, background } = chatCardStyle()
    return {
      padding,
      'border-radius': `${borderRadius}px`,
      border,
      background,
      'margin-bottom': '16px',
    }
  }

  /** The section heading's class list. */
  const headingClass = (): string => cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))

  /** The edit affordance's class list. */
  const editClass = (): string =>
    cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)

  /**
   * Runs or prefills a setting's edit command, exactly as React branches.
   *
   * @param setting - The row's descriptor.
   */
  const edit = (setting: SettingDescriptor): void => {
    if (setting.editInput && props.onPrefillInput) props.onPrefillInput(setting.editInput)
    else props.onRunCommand(setting.editCommand as CommandId)
  }

  /**
   * The row's edit affordance Tooltip content.
   *
   * @param setting - The row's descriptor.
   * @returns The translated "Edit via …" text.
   */
  const editTooltip = (setting: SettingDescriptor): string =>
    t(
      'ide.chat.settings.editVia',
      { command: setting.editInput ?? `/${setting.editCommand}` },
      { defaultValue: 'Edit via {{command}}' },
    )

  return (
    <div data-mol-id="settings-card" class={cm.textSize('xs')} style={rootStyle()}>
      <Show when={!props.embedded}>
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            gap: '8px',
            'margin-bottom': '6px',
          }}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-shrink': '0' }}>
            <div class={headingClass()} style={{ 'flex-shrink': '0' }}>
              {t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })}
            </div>
          </div>
        </div>
      </Show>
      <div data-mol-id="settings-list">
        <For each={props.settings}>
          {(setting) => (
            <div
              data-mol-id={`setting-row-${setting.id}`}
              class={cm.borderT}
              style={{
                display: 'flex',
                'align-items': 'flex-start',
                gap: '8px',
                padding: '6px 0px',
                'border-color': rowBorder(),
              }}
            >
              <div style={{ flex: '1 1 0%', 'min-width': '0px' }}>
                <div
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '6px',
                    'flex-wrap': 'wrap',
                  }}
                >
                  <span class={cm.fontWeight('medium')}>{settingLabel(t, setting.id)}</span>
                  <span
                    class={cm.textMuted}
                    style={{
                      'font-size': '11px',
                      padding: '0px 6px',
                      'border-radius': '4px',
                      background: valueBg(),
                    }}
                  >
                    {setting.value}
                  </span>
                </div>
                <div class={cm.textMuted} style={{ 'margin-top': '2px', 'line-height': '1.4' }}>
                  {settingDescription(t, setting.id, { agentName: agentName() })}
                </div>
              </div>
              <Show when={setting.editCommand}>
                <div style={{ 'flex-shrink': '0' }}>
                  <Tooltip content={editTooltip(setting)} placement="top">
                    <button
                      type="button"
                      data-mol-id={`setting-edit-${setting.id}`}
                      onClick={() => edit(setting)}
                      class={editClass()}
                    >
                      {t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' })}
                    </button>
                  </Tooltip>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      <div class={headingClass()} style={{ 'margin-top': '12px', 'margin-bottom': '6px' }}>
        {t('ide.chat.settings.commandsHeading', undefined, { defaultValue: 'Slash commands' })}
      </div>
      <div data-mol-id="settings-commands">
        <For each={groupCommandsByCategory()}>
          {(group) => (
            <div style={{ 'margin-bottom': '6px' }}>
              <div class={cm.textMuted} style={{ 'font-size': '11px', 'margin-bottom': '2px' }}>
                {commandCategoryLabel(t, group.category.key)}
              </div>
              <For each={group.commands}>
                {(cmd) => (
                  <div
                    data-mol-id={`settings-command-${cmd.id}`}
                    style={{ padding: '2px 0px', 'margin-bottom': '4px' }}
                  >
                    <code
                      // The command's argument syntax (`/model [name | --plan ...]`)
                      // is code, not words: never translated, in any locale.
                      translate="no"
                      style={{
                        display: 'block',
                        'font-family': 'var(--mol-font-mono, monospace)',
                        'white-space': 'nowrap',
                      }}
                    >
                      {cmd.usage ?? cmd.label}
                    </code>
                    <div class={cm.textMuted} style={{ 'margin-top': '2px', 'line-height': '1.4' }}>
                      {isRegistryCommandId(cmd.id)
                        ? commandDescription(t, cmd.id, { agentName: agentName() })
                        : cmd.description}
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
