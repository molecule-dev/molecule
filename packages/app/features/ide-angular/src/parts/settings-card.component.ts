/**
 * `/settings` — the settings + slash-command reference card.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `SettingsCard` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The rows come from the shared
 * `SettingDescriptor` list (built from the canonical `SETTINGS` metadata) and
 * the command reference is grouped from the shared `COMMANDS` registry, so the
 * card can never drift from what the chat supports. Every row a slash command
 * edits carries an inline "Edit" affordance that runs (or prefills) that
 * command, revealed through the framework styled `Tooltip`.
 *
 * The host element IS React's root `<div>` (`div[mol-settings-card]`), so the
 * card's own attributes, classes and inline style sit on it through host
 * bindings. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express, serialized through `styleText` the way
 * React writes them. All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { DEFAULT_AGENT_NAME, useTranslation } from '@molecule/app-angular'
import type { CommandGroup, CommandId } from '@molecule/app-ide-panel-logic'
import {
  chatCardStyle,
  commandCategoryLabel,
  commandDescription,
  groupCommandsByCategory,
  isRegistryCommandId,
  settingDescription,
  settingLabel,
} from '@molecule/app-ide-panel-logic'
import type { SettingDescriptor } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

/**
 * The component's inline-style texts that never change, serialized once with
 * `styleText` (the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The heading row: title on the left, room for an action on the right. */
  headingRow: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  }),
  /** The heading's title group. */
  headingGroup: styleText({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }),
  /** The heading title itself. */
  headingTitle: styleText({ flexShrink: 0 }),
  /** The label-and-value row inside a setting. */
  labelRow: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }),
  /** A setting's left column (label, value and description). */
  body: styleText({ flex: '1 1 0%', minWidth: '0px' }),
  /** A setting's description line. */
  description: styleText({ marginTop: '2px', lineHeight: 1.4 }),
  /** The edit affordance's no-shrink wrapper. */
  shrink: styleText({ flexShrink: 0 }),
  /** The command-reference heading's margins. */
  commandsHeading: styleText({ marginTop: 12, marginBottom: 6 }),
  /** One command category's bottom margin. */
  group: styleText({ marginBottom: 6 }),
  /** A category heading line. */
  category: styleText({ fontSize: 11, marginBottom: 2 }),
  /** One command row. */
  commandRow: styleText({ padding: '2px 0px', marginBottom: 4 }),
  /** The command's usage/label in monospace. */
  code: styleText({
    display: 'block',
    fontFamily: 'var(--mol-font-mono, monospace)',
    whiteSpace: 'nowrap',
  }),
} as const

/**
 * The settings + command-reference card shown by `/settings`. React renders it
 * under the React name `SettingsCard` (this class's name).
 */
@Component({
  selector: 'div[mol-settings-card]',
  standalone: true,
  imports: [Tooltip],
  inputs: ['settings', 'onRunCommand', 'onPrefillInput', 'isLight', 'agentName', 'embedded'],
  host: {
    'data-mol-id': 'settings-card',
    '[class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (!embedded) {<div [attr.style]="s.headingRow"><div [attr.style]="s.headingGroup"><div [class]="headingClass()" [attr.style]="s.headingTitle">{{ t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' }) }}</div></div></div>}
<div data-mol-id="settings-list">@for (setting of settings; track setting.id) {<div [attr.data-mol-id]="'setting-row-' + setting.id" [class]="cm.borderT" [attr.style]="rowStyle()"><div [attr.style]="s.body"><div [attr.style]="s.labelRow"><span [class]="cm.fontWeight('medium')">{{ labelOf(setting) }}</span><span [class]="cm.textMuted" [attr.style]="valueStyle()">{{ setting.value }}</span></div><div [class]="cm.textMuted" [attr.style]="s.description">{{ descriptionOf(setting) }}</div></div>@if (setting.editCommand) {<div [attr.style]="s.shrink"><mol-tooltip placement="top"><button type="button" [attr.data-mol-id]="'setting-edit-' + setting.id" (click)="edit(setting)" [class]="editClass()">{{ t('ide.chat.settings.edit', undefined, { defaultValue: 'Edit' }) }}</button><ng-container ngProjectAs="[slot=content]">{{ editTooltip(setting) }}</ng-container></mol-tooltip></div>}</div>}</div>
<div [class]="headingClass()" [attr.style]="s.commandsHeading">{{ t('ide.chat.settings.commandsHeading', undefined, { defaultValue: 'Slash commands' }) }}</div>
<div data-mol-id="settings-commands">@for (group of groups; track group.category.key) {<div [attr.style]="s.group"><div [class]="cm.textMuted" [attr.style]="s.category">{{ categoryLabelOf(group) }}</div>@for (cmd of group.commands; track cmd.id) {<div [attr.data-mol-id]="'settings-command-' + cmd.id" [attr.style]="s.commandRow"><code [attr.style]="s.code" translate="no">{{ cmd.usage ?? cmd.label }}</code><div [class]="cm.textMuted" [attr.style]="s.description">{{ commandDescriptionOf(cmd.id, cmd.description) }}</div></div>}</div>}</div>`,
})
export class SettingsCard {
  /** The ordered settings rows (built from the shared `SETTINGS` metadata). */
  settings: readonly SettingDescriptor[] = []

  /** Runs a slash command (a setting whose edit is the bare command). */
  onRunCommand!: (id: CommandId) => void

  /** Prefills the chat input with a scoped command (a mode-scoped model edit). */
  onPrefillInput?: (input: string) => void

  /** Whether the host theme is light (drives the row border + value pill colours). */
  isLight = false

  /** The host's agent identity, interpolated into the descriptions. */
  agentName: string = DEFAULT_AGENT_NAME

  /** Whether the card sits inside the settings overlay (`true`) or the chat timeline. */
  embedded = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The command reference groups (the static registry, grouped once). */
  protected readonly groups: CommandGroup[] = groupCommandsByCategory()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * The card root's class list (React's `<div className={cm.textSize('xs')}>`).
   * @returns The class string.
   */
  protected rootClass(): string {
    return this.cm.textSize('xs')
  }

  /**
   * The card container's inline style: chrome-less inside the overlay, the
   * boxed card (with the timeline's bottom-margin rhythm) otherwise.
   * @returns The style attribute text.
   */
  protected rootStyle(): string | null {
    return styleText(
      this.embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 },
    )
  }

  /**
   * The section heading's class list.
   * @returns The class string.
   */
  protected headingClass(): string {
    return this.cm.cn(this.cm.fontWeight('medium'), this.cm.textSize('sm'))
  }

  /**
   * The edit affordance's class list — a ghost button on the dense-card floor.
   * @returns The class string.
   */
  protected editClass(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'xs' }), this.cm.touchTargetCompact)
  }

  /**
   * The theme's row border colour.
   * @returns The border colour.
   */
  private rowBorder(): string {
    return this.isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
  }

  /**
   * The theme's value-pill inset.
   * @returns The background colour.
   */
  private valueBg(): string {
    return this.isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'
  }

  /**
   * The host's agent identity, React's `agentName = DEFAULT_AGENT_NAME` default
   * (the adapter can assign `undefined` over the field default).
   * @returns The agent name.
   */
  private agentIdentity(): string {
    return this.agentName ?? DEFAULT_AGENT_NAME
  }

  /**
   * One setting row's inline style.
   * @returns The style attribute text.
   */
  protected rowStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '6px 0px',
      borderColor: this.rowBorder(),
    })
  }

  /**
   * The value pill's inline style.
   * @returns The style attribute text.
   */
  protected valueStyle(): string | null {
    return styleText({
      fontSize: 11,
      padding: '0px 6px',
      borderRadius: 4,
      background: this.valueBg(),
    })
  }

  /**
   * The localized label of a setting (React's `settingLabel`).
   * @param setting - The row's descriptor.
   * @returns The translated label.
   */
  protected labelOf(setting: SettingDescriptor): string {
    return settingLabel(this.t, setting.id)
  }

  /**
   * The localized description of a setting, with the agent name interpolated.
   * @param setting - The row's descriptor.
   * @returns The translated description.
   */
  protected descriptionOf(setting: SettingDescriptor): string {
    return settingDescription(this.t, setting.id, { agentName: this.agentIdentity() })
  }

  /**
   * The row's edit affordance Tooltip content.
   * @param setting - The row's descriptor.
   * @returns The translated "Edit via …" text.
   */
  protected editTooltip(setting: SettingDescriptor): string {
    return this.t(
      'ide.chat.settings.editVia',
      { command: setting.editInput ?? `/${setting.editCommand}` },
      { defaultValue: 'Edit via {{command}}' },
    )
  }

  /**
   * Runs or prefills a setting's edit command, exactly as React branches.
   * @param setting - The row's descriptor.
   */
  protected edit(setting: SettingDescriptor): void {
    if (setting.editInput && this.onPrefillInput) this.onPrefillInput(setting.editInput)
    else this.onRunCommand(setting.editCommand as CommandId)
  }

  /**
   * The localized heading of a command category.
   * @param group - One command group.
   * @returns The translated heading.
   */
  protected categoryLabelOf(group: CommandGroup): string {
    return commandCategoryLabel(this.t, group.category.key)
  }

  /**
   * A command's description: the registry's translated text, or a host command's
   * own English (React's `isRegistryCommandId` branch).
   * @param id - The command id.
   * @param fallback - The registry entry's own description.
   * @returns The description text.
   */
  protected commandDescriptionOf(id: string, fallback: string): string {
    return isRegistryCommandId(id)
      ? commandDescription(this.t, id, { agentName: this.agentIdentity() })
      : fallback
  }
}
