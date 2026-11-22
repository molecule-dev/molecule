/**
 * React's section “Command menu popup” (ChatPanel.tsx lines 5901–6058): the
 * `/` slash-command menu anchored above the composer — the categories of
 * `COMMAND_CATEGORIES` that still hold a visible command, the flat selection
 * index React's keyboard handling counts against, and the live state suffix
 * every stateful row carries (`/model`, `/maxloops`, `/autofix`, `/sounds`,
 * `/version`).
 *
 * The visible commands come from the `chat:pickers` slice's `filteredCmds`,
 * exactly the list React derives in that region, and the open state from the
 * composer slice's `commandMenu`. The section renders nothing while either is
 * empty, so its host is a `data-parity-unwrap` wrapper (React's root `<div>`
 * is itself conditional) and the normalizer drops the wrapper.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { DEFAULT_AGENT_NAME } from '@molecule/app-angular'
import { APP_VERSION } from '@molecule/app-ide-panel-logic'
import {
  COMMAND_CATEGORIES,
  commandDescription,
  type CommandId,
  isRegistryCommandId,
  SOUND_EVENTS,
  SOUND_MODE_LABELS,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'

/** One rendered command row, with the flat index React's selection counts. */
interface CommandMenuRow {
  /** The command's id (the row's click target). */
  id: CommandId
  /** The command's slash label. */
  label: string
  /** The localized / declared description. */
  description: string
  /** The live state suffix, or an empty string. */
  suffix: string
  /** The row's flat index across every rendered group. */
  index: number
}

/** One rendered category and the rows it holds. */
interface CommandMenuGroup {
  /** The category's key (the group's render key). */
  key: string
  /** The category's label. */
  label: string
  /** The rows in the category. */
  rows: CommandMenuRow[]
  /** Whether the header carries its separator border (every group but the first). */
  bordered: boolean
}

/** React's “Command menu popup” section: the slash-command menu. */
@Component({
  selector: 'div[mol-chat-command-menu]',
  standalone: true,
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `@if (groups(); as menu) {<div [class]="rootClass" [attr.style]="rootStyle()"><div style="overflow-y: auto; flex: 1">@for (group of menu; track group.key) {<div><div [class]="cm.textMuted" [attr.style]="headerStyle(group.bordered)">{{ group.label }}</div>@for (row of group.rows; track row.id) {<button type="button" (click)="execute(row.id)" (mouseenter)="onRowEnter($event)" (mouseleave)="onRowLeave($event, row.index)" [class]="rowClass" [attr.style]="rowStyle(row.index)"><span [class]="labelClass" [attr.style]="labelStyle">{{ row.label }}</span><span [class]="cm.textMuted" [attr.style]="descriptionStyle">{{ row.description }}@if (row.suffix) {<span [attr.style]="suffixStyle">{{ row.suffix }}</span>}</span></button>}</div>}</div></div>}`,
})
export class ChatCommandMenu {
  /** The shared panel state (the props the suffix reads). */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the menu's open state and the selected row. */
  private readonly composer = inject(ChatComposer)

  /** The pickers slice: React's `filteredCmds`. */
  private readonly pickers = inject(ChatPickers)

  /** The chat slice: the mode whose effective model the `/model` row names. */
  private readonly chat = inject(ChatChat)

  /** The models slice: the catalog, the loop cap and the auto-fix preference. */
  private readonly models = inject(ChatModels)

  /** The sounds slice: the saved notification-sound preference. */
  private readonly sounds = inject(ChatSounds)

  /** The render-handlers slice: the rows' stable command dispatcher. */
  private readonly handlers = inject(ChatRenderHandlers)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** React's root ClassMap classes (`cm.cn(cm.surface, cm.borderAll)`). */
  protected readonly rootClass: string

  /** The rows' ClassMap class (`cm.w('full')`). */
  protected readonly rowClass: string

  /** The slash label's ClassMap class (`cm.fontWeight('medium')`). */
  protected readonly labelClass: string

  /** The description line's inline style. */
  protected readonly descriptionStyle = styleText({ fontSize: '12px' })

  /** The suffix's inline style (the primary colour, full opacity). */
  protected readonly suffixStyle = styleText({
    opacity: 1,
    color: 'var(--color-primary)',
    fontWeight: 500,
  })

  /** Composes the fixed ClassMap classes once. */
  constructor() {
    this.rootClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
    this.rowClass = this.cm.w('full')
    this.labelClass = this.cm.fontWeight('medium')
  }

  /**
   * React's grouped, filtered command list — null while the menu is closed or
   * every command is filtered out, so nothing renders at all.
   *
   * @returns The groups to render, or null.
   */
  protected groups(): CommandMenuGroup[] | null {
    if (!this.composer.commandMenu()) return null
    const filtered = this.pickers.filteredCmds()
    if (filtered.length === 0) return null
    let flatIdx = 0
    const grouped = COMMAND_CATEGORIES.map(({ key, label }) => ({
      key: key as string,
      label,
      rows: filtered
        .filter((cmd) => cmd.category === key)
        .map((cmd) => {
          const row: CommandMenuRow = {
            id: cmd.id as CommandId,
            label: cmd.label,
            description: this.descriptionOf(cmd.id, cmd.description),
            suffix: this.suffixOf(cmd.id),
            index: flatIdx,
          }
          flatIdx += 1
          return row
        }),
    }))
      .filter((group) => group.rows.length > 0)
      .map((group, index) => ({ ...group, bordered: index > 0 }))
    return grouped
  }

  /**
   * The row's description: the localized registry text, else its declared one.
   *
   * @param id - The command's id.
   * @param description - The command's declared description.
   * @returns The description to render.
   */
  private descriptionOf(id: string, description: string): string {
    return isRegistryCommandId(id)
      ? commandDescription(this.state.env.t, id, { agentName: this.agentName() })
      : description
  }

  /**
   * The live state suffix a stateful row carries, exactly as React builds it.
   *
   * @param id - The command's id.
   * @returns The suffix (with its leading space), or an empty string.
   */
  private suffixOf(id: string): string {
    if (id === 'model') {
      // Reflect the model the ACTIVE conversation mode will actually use —
      // never a UI-seeded default. Falls through to the free-tier id only
      // before the catalog loads so the parentheses never render empty (P3-16).
      const effId =
        this.models.effectiveModelForMode(this.chat.mode() === 'plan' ? 'plan' : 'execute') ||
        this.models.FREE_TIER_MODEL()
      const modelLabel = this.models.AVAILABLE_MODELS().find((m) => m.id === effId)?.label ?? effId
      return modelLabel ? ` (${modelLabel})` : ''
    }
    if (id === 'maxloops') return ` (${this.models.currentMaxLoops()})`
    if (id === 'autofix') return ` (${this.models.autoFixEnabled() ? 'on' : 'off'})`
    if (id === 'sounds') {
      const config = this.sounds.soundsConfig()
      const modes = SOUND_EVENTS.map((event) => config[event])
      const allSame = modes.every((mode) => mode === modes[0])
      return ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
    }
    if (id === 'version') {
      // `||` not `??`: an empty-string version prop must still fall back to
      // APP_VERSION (else the suffix is a bare "v").
      return ` (v${this.state.props().version || APP_VERSION})`
    }
    return ''
  }

  /**
   * The menu root's inline style (anchored above the composer, capped height).
   *
   * @returns React's style object for the root element.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 0,
      borderRadius: '6px 6px 0 0',
      zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: this.state.env.popupMaxHeight(),
    })
  }

  /**
   * A category header's inline style.
   *
   * @param bordered - Whether this header carries its top separator.
   * @returns React's style object for the header.
   */
  protected headerStyle(bordered: boolean): string | null {
    return styleText({
      fontSize: '11px',
      fontWeight: 500,
      padding: '6px 12px 2px',
      ...(bordered ? { borderTop: '1px solid rgba(128,128,128,0.12)' } : {}),
    })
  }

  /**
   * A row's inline style, tinted when it is the keyboard selection.
   *
   * @param index - The row's flat index.
   * @returns React's style object for the row.
   */
  protected rowStyle(index: number): string | null {
    const selected = index === this.composer.commandMenu()?.selectedIdx
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '5px 12px 5px 20px',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '13px',
      background: selected ? 'rgba(128,128,128,0.1)' : 'transparent',
    })
  }

  /** The slash label's inline style (fixed monospace column). */
  protected readonly labelStyle = styleText({
    fontFamily: 'monospace',
    opacity: 0.9,
    flexShrink: 0,
    // Fixed label column so every description starts at the same x (widest
    // label is '/autocommit' = 11ch). ClassMap can't express a fixed column
    // width, so it's inline.
    minWidth: '12ch',
  })

  /**
   * Runs one row's command through the stable dispatcher.
   *
   * @param id - The command's id.
   */
  protected execute(id: CommandId): void {
    void this.handlers.stableExecuteCommand(id)
  }

  /**
   * React's `onMouseEnter` row tint.
   *
   * @param event - The mouse event (its target is the row).
   */
  protected onRowEnter(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'rgba(128,128,128,0.15)'
  }

  /**
   * React's `onMouseLeave` row tint: the selection tint when this row is the
   * keyboard selection, transparent otherwise.
   *
   * @param event - The mouse event (its target is the row).
   * @param index - The row's flat index.
   */
  protected onRowLeave(event: Event, index: number): void {
    const element = event.currentTarget as HTMLElement
    element.style.background =
      index === this.composer.commandMenu()?.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
  }

  /**
   * The agent's display name (React's resolved `agentName`).
   *
   * @returns The agent name.
   */
  private agentName(): string {
    return this.state.props().agentName ?? DEFAULT_AGENT_NAME
  }
}
