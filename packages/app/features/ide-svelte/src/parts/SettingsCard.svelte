<!--
  `/settings` — the settings + slash-command reference card.

  Svelte counterpart of `@molecule/app-ide-react`'s `SettingsCard` (see that
  file for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. The rows come from the shared
  `SettingDescriptor` list (built from the canonical `SETTINGS` metadata) and the
  command reference is grouped from the shared `COMMANDS` registry, so the card
  can never drift from what the chat supports. Every row a slash command edits
  carries an inline "Edit" affordance that runs (or prefills) that command,
  revealed through the framework styled `Tooltip`. The component is a part
  (React renders it inside ChatPanel without exporting it), so it lives in
  `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express, written the way the DOM takes them here (the pixel
  values spell their `px`, which Svelte does not add for React).
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type SettingsCardProps = types.SettingsCardProps
</script>

<script lang="ts">
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
  import { DEFAULT_AGENT_NAME, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  let {
    settings,
    onRunCommand,
    onPrefillInput,
    isLight,
    agentName = DEFAULT_AGENT_NAME,
    embedded = false,
  }: SettingsCardProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  // React groups the static registry once per render; the registry never changes.
  const groups = $derived(groupCommandsByCategory())

  /** The theme's row border colour. */
  const rowBorder = $derived(isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')

  /** The theme's value-pill inset. */
  const valueBg = $derived(isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)')

  /** The section heading's class list. */
  const headingClass = $derived(cm.cn(cm.fontWeight('medium'), cm.textSize('sm')))

  /** The edit affordance's class list. */
  const editClass = $derived(
    cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact),
  )

  /** The card container's inline style: chrome-less inside the overlay, the boxed card else. */
  const rootStyle = $derived.by(() => {
    if (embedded) return 'padding: 10px 12px'
    const { padding, borderRadius, border, background } = chatCardStyle()
    // `borderRadius` is React's unitless-number convention; a style text needs its `px`.
    return `padding: ${padding}; border-radius: ${borderRadius}px; border: ${border}; background: ${background}; margin-bottom: 16px`
  })

  /**
   * Runs or prefills a setting's edit command, exactly as React branches.
   *
   * @param setting - The row's descriptor.
   */
  function edit(setting: SettingDescriptor): void {
    if (setting.editInput && onPrefillInput) onPrefillInput(setting.editInput)
    else onRunCommand(setting.editCommand as CommandId)
  }

  /**
   * The row's edit affordance Tooltip content.
   *
   * @param setting - The row's descriptor.
   * @returns The translated "Edit via …" text.
   */
  function editTooltip(setting: SettingDescriptor): string {
    return t(
      'ide.chat.settings.editVia',
      { command: setting.editInput ?? `/${setting.editCommand}` },
      { defaultValue: 'Edit via {{command}}' },
    )
  }

  /**
   * The localized label of a setting.
   *
   * @param setting - The row's descriptor.
   * @returns The translated label.
   */
  function label(setting: SettingDescriptor): string {
    return settingLabel(t, setting.id)
  }

  /**
   * The localized description of a setting, with the agent name interpolated.
   *
   * @param setting - The row's descriptor.
   * @returns The translated description.
   */
  function description(setting: SettingDescriptor): string {
    return settingDescription(t, setting.id, { agentName })
  }
</script>

<div data-mol-id="settings-card" class={cm.textSize('xs')} style={rootStyle}>
  {#if !embedded}
    <div
      style="align-items: center; display: flex; gap: 8px; justify-content: space-between; margin-bottom: 6px"
    >
      <div style="align-items: center; display: flex; flex-shrink: 0; gap: 8px">
        <div class={headingClass} style="flex-shrink: 0">
          {t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })}
        </div>
      </div>
    </div>
  {/if}
  <div data-mol-id="settings-list">
    {#each settings as setting (setting.id)}
      <div
        data-mol-id="setting-row-{setting.id}"
        class={cm.borderT}
        style="align-items: flex-start; border-color: {rowBorder}; display: flex; gap: 8px; padding: 6px 0px"
      >
        <div style="flex: 1 1 0%; min-width: 0px">
          <div style="align-items: center; display: flex; flex-wrap: wrap; gap: 6px">
            <span class={cm.fontWeight('medium')}>{label(setting)}</span>
            <span
              class={cm.textMuted}
              style="background: {valueBg}; border-radius: 4px; font-size: 11px; padding: 0px 6px"
            >
              {setting.value}
            </span>
          </div>
          <div class={cm.textMuted} style="line-height: 1.4; margin-top: 2px">
            {description(setting)}
          </div>
        </div>
        {#if setting.editCommand}
          <div style="flex-shrink: 0">
            <Tooltip content={editTooltip(setting)} placement="top">
              <button
                type="button"
                data-mol-id="setting-edit-{setting.id}"
                onclick={() => edit(setting)}
                class={editClass}
              >
                {t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' })}
              </button>
            </Tooltip>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class={headingClass} style="margin-bottom: 6px; margin-top: 12px">
    {t('ide.chat.settings.commandsHeading', undefined, { defaultValue: 'Slash commands' })}
  </div>
  <div data-mol-id="settings-commands">
    {#each groups as group (group.category.key)}
      <div style="margin-bottom: 6px">
        <div class={cm.textMuted} style="font-size: 11px; margin-bottom: 2px">
          {commandCategoryLabel(t, group.category.key)}
        </div>
        {#each group.commands as cmd (cmd.id)}
          <div data-mol-id="settings-command-{cmd.id}" style="margin-bottom: 4px; padding: 2px 0px">
            <!-- The command's argument syntax (`/model [name | --plan ...]`) is
                 code, not words: never translated, in any locale. -->
            <code
              translate="no"
              style="display: block; font-family: var(--mol-font-mono, monospace); white-space: nowrap"
            >
              {cmd.usage ?? cmd.label}
            </code>
            <div class={cm.textMuted} style="line-height: 1.4; margin-top: 2px">
              {isRegistryCommandId(cmd.id)
                ? commandDescription(t, cmd.id, { agentName })
                : cmd.description}
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
