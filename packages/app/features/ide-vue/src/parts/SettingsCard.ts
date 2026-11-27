/**
 * `/settings` — the settings + slash-command reference card.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `SettingsCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. The rows come from the shared
 * `SettingDescriptor` list (built from the canonical `SETTINGS` metadata) and
 * the command reference is grouped from the shared `COMMANDS` registry, so the
 * card can never drift from what the chat supports. Every row a slash command
 * edits carries an inline "Edit" affordance that runs (or prefills) that
 * command, revealed through the framework styled `Tooltip`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

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
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

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
export const SettingsCard = defineComponent({
  name: 'SettingsCard',
  props: {
    /** The ordered settings rows. */
    settings: { type: Array as PropType<readonly SettingDescriptor[]>, required: true },
    /** Runs a slash command. */
    onRunCommand: {
      type: Function as PropType<(id: CommandId) => void>,
      required: true,
    },
    /** Prefills the chat input with a scoped command. */
    onPrefillInput: {
      type: Function as PropType<(input: string) => void>,
      required: false,
    },
    /** Whether the host theme is light. */
    isLight: { type: Boolean, required: true },
    /** The host's agent identity. */
    agentName: { type: String, required: false, default: DEFAULT_AGENT_NAME },
    /** Whether the card sits inside the settings overlay. */
    embedded: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const groups = groupCommandsByCategory()
      const rowBorder = props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
      const valueBg = props.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'

      const heading = (): VNodeChild =>
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '6px',
            },
          },
          [
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
              [
                h(
                  'div',
                  {
                    class: cm.cn(cm.fontWeight('medium'), cm.textSize('sm')),
                    style: { flexShrink: 0 },
                  },
                  t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' }),
                ),
              ],
            ),
          ],
        )

      const settingRow = (setting: SettingDescriptor): VNodeChild =>
        h(
          'div',
          {
            key: setting.id,
            'data-mol-id': `setting-row-${setting.id}`,
            class: cm.borderT,
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '6px 0',
              borderColor: rowBorder,
            },
          },
          [
            h('div', { style: { flex: 1, minWidth: '0px' } }, [
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
                [
                  h('span', { class: cm.fontWeight('medium') }, settingLabel(t, setting.id)),
                  h(
                    'span',
                    {
                      class: cm.textMuted,
                      style: {
                        fontSize: '11px',
                        padding: '0 6px',
                        borderRadius: '4px',
                        background: valueBg,
                      },
                    },
                    setting.value,
                  ),
                ],
              ),
              h(
                'div',
                { class: cm.textMuted, style: { marginTop: '2px', lineHeight: '1.4' } },
                settingDescription(t, setting.id, { agentName: props.agentName }),
              ),
            ]),
            setting.editCommand
              ? h('div', { style: { flexShrink: 0 } }, [
                  h(
                    Tooltip,
                    {
                      content: t(
                        'ide.chat.settings.editVia',
                        { command: setting.editInput ?? `/${setting.editCommand}` },
                        { defaultValue: 'Edit via {{command}}' },
                      ),
                      placement: 'top',
                    },
                    () =>
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': `setting-edit-${setting.id}`,
                          onClick: () =>
                            setting.editInput && props.onPrefillInput
                              ? props.onPrefillInput(setting.editInput)
                              : props.onRunCommand(setting.editCommand as CommandId),
                          class: cm.cn(
                            cm.button({ variant: 'ghost', size: 'xs' }),
                            cm.touchTargetCompact,
                          ),
                        },
                        t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' }),
                      ),
                  ),
                ])
              : null,
          ],
        )

      const commandGroup = (
        group: ReturnType<typeof groupCommandsByCategory>[number],
      ): VNodeChild =>
        h('div', { key: group.category.key, style: { marginBottom: '6px' } }, [
          h(
            'div',
            { class: cm.textMuted, style: { fontSize: '11px', marginBottom: '2px' } },
            commandCategoryLabel(t, group.category.key),
          ),
          ...group.commands.map((cmd) =>
            h(
              'div',
              {
                key: cmd.id,
                'data-mol-id': `settings-command-${cmd.id}`,
                style: { padding: '2px 0', marginBottom: '4px' },
              },
              [
                h(
                  'code',
                  {
                    // The command's argument syntax (`/model [name | --plan ...]`)
                    // is code, not words: never translated, in any locale.
                    translate: 'no',
                    style: {
                      display: 'block',
                      fontFamily: 'var(--mol-font-mono, monospace)',
                      whiteSpace: 'nowrap',
                    },
                  },
                  cmd.usage ?? cmd.label,
                ),
                h(
                  'div',
                  { class: cm.textMuted, style: { marginTop: '2px', lineHeight: '1.4' } },
                  isRegistryCommandId(cmd.id)
                    ? commandDescription(t, cmd.id, { agentName: props.agentName })
                    : cmd.description,
                ),
              ],
            ),
          ),
        ])

      return h(
        'div',
        {
          'data-mol-id': 'settings-card',
          class: cm.textSize('xs'),
          style: props.embedded
            ? { padding: '10px 12px' }
            : { ...chatCardStyle(), borderRadius: '8px', marginBottom: '16px' },
        },
        [
          !props.embedded ? heading() : null,
          h(
            'div',
            { 'data-mol-id': 'settings-list' },
            props.settings.map((setting) => settingRow(setting)),
          ),
          h(
            'div',
            {
              class: cm.cn(cm.fontWeight('medium'), cm.textSize('sm')),
              style: { marginTop: '12px', marginBottom: '6px' },
            },
            t('ide.chat.settings.commandsHeading', undefined, { defaultValue: 'Slash commands' }),
          ),
          h(
            'div',
            { 'data-mol-id': 'settings-commands' },
            groups.map((group) => commandGroup(group)),
          ),
        ],
      )
    }
  },
})
