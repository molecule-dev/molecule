/**
 * The slash-command menu popup above the composer — React's render section
 * “Command menu popup”.
 *
 * It lists the open menu's `filteredCmds` grouped by the shared command
 * categories, each row carrying the command's label and its localized (or
 * host-supplied) description plus the live-state suffix for the commands that
 * have one (`/model`, `/maxloops`, `/autofix`, `/sounds`, `/version`). Nothing
 * renders while the menu is closed or the typed text matches no command.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { APP_VERSION } from '@molecule/app-ide-panel-logic'
import type {
  CommandCategoryKey,
  CommandDef,
  CommandId,
} from '@molecule/app-ide-panel-logic/panels'
import {
  COMMAND_CATEGORIES,
  commandDescription,
  isRegistryCommandId,
  SOUND_EVENTS,
  SOUND_MODE_LABELS,
} from '@molecule/app-ide-panel-logic/panels'
import { DEFAULT_AGENT_NAME } from '@molecule/app-solid'

import type { ChatInnerCtx } from './context.js'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background: none` serialize differently, and a
 * later dynamic declaration on the same element re-parses the raw text and can
 * drop a shorthand entirely. Calling through this identity function keeps every
 * declaration on the CSSOM path, so the rendered `style` attribute is the one
 * React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatCommandMenu}. */
export interface ChatCommandMenuProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/** One command row, with its position in the menu's flat index. */
interface CommandMenuRow {
  /** The command the row runs. */
  cmd: CommandDef
  /** The row's position across every group (React's `flatIdx`). */
  index: number
}

/** One category header and the rows it groups. */
interface CommandMenuGroup {
  /** The category key. */
  key: CommandCategoryKey
  /** The category heading. */
  label: string
  /** The category's rows. */
  rows: CommandMenuRow[]
}

/**
 * Renders the command menu.
 * @param props - The inner ctx (the open menu, its filtered rows and the live
 *   state the suffixes read).
 * @returns The menu, or nothing while it is closed or empty.
 */
export function ChatCommandMenu(props: ChatCommandMenuProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const t = ctx.env.t

  /**
   * The menu's rows, grouped by the shared categories and numbered across the
   * groups in render order (React's render-time `flatIdx`).
   * @returns The non-empty groups.
   */
  const grouped = (): CommandMenuGroup[] => {
    let flatIndex = 0
    return COMMAND_CATEGORIES.map(({ key, label }) => ({
      key,
      label,
      rows: ctx.pickers
        .filteredCmds()
        .filter((cmd) => cmd.category === key)
        .map((cmd) => ({ cmd, index: flatIndex++ })),
    })).filter((group) => group.rows.length > 0)
  }

  /**
   * The live-state suffix a command's description carries, e.g. the current
   * model for `/model` or the sound modes for `/sounds`.
   * @param cmd - The command whose row renders.
   * @returns The suffix, or an empty string when the command has none.
   */
  const suffixFor = (cmd: CommandDef): string => {
    if (cmd.id === 'model') {
      // Reflect the model the ACTIVE conversation mode will actually use — the
      // full server chain — and fall through to the free-tier id only before
      // the catalog loads, so the parentheses never render empty.
      const effectiveId =
        ctx.models.effectiveModelForMode(ctx.chat.mode() === 'plan' ? 'plan' : 'execute') ||
        ctx.models.FREE_TIER_MODEL()
      const modelLabel =
        ctx.models.AVAILABLE_MODELS().find((entry) => entry.id === effectiveId)?.label ??
        effectiveId
      return modelLabel ? ` (${modelLabel})` : ''
    }
    if (cmd.id === 'maxloops') return ` (${ctx.models.currentMaxLoops()})`
    if (cmd.id === 'autofix') return ` (${ctx.models.autoFixEnabled() ? 'on' : 'off'})`
    if (cmd.id === 'sounds') {
      const modes = SOUND_EVENTS.map((event) => ctx.sounds.soundsConfig()[event])
      const allSame = modes.every((mode) => mode === modes[0])
      return ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
    }
    // `||` not `??`: an empty-string version prop must still fall back to
    // APP_VERSION (else the suffix is a bare "v").
    if (cmd.id === 'version') return ` (v${ctx.props.version || APP_VERSION})`
    return ''
  }

  return (
    <Show when={ctx.composer.commandMenu()}>
      {(menu) => (
        <Show when={ctx.pickers.filteredCmds().length > 0}>
          <div
            class={cm.cn(cm.surface, cm.borderAll)}
            style={styleOf({
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              'margin-bottom': 0,
              'border-radius': '6px 6px 0 0',
              'z-index': 100,
              'box-shadow': '0 -4px 16px rgba(0,0,0,0.25)',
              display: 'flex',
              'flex-direction': 'column',
              'max-height': ctx.env.popupMaxHeight(),
            })}
          >
            <div style={{ 'overflow-y': 'auto', flex: 1 }}>
              {grouped().map((group, groupIndex) => (
                <div>
                  {/* Category header */}
                  <div
                    class={cm.textMuted}
                    style={{
                      'font-size': '11px',
                      'font-weight': 500,
                      padding: '6px 12px 2px',
                      ...(groupIndex > 0
                        ? { 'border-top': '1px solid rgba(128,128,128,0.12)' }
                        : {}),
                    }}
                  >
                    {group.label}
                  </div>
                  {/* Commands in this group */}
                  {group.rows.map((row) => {
                    const suffix = suffixFor(row.cmd)
                    return (
                      <button
                        /* mol-bespoke-button: command menu row — full-width list item in the / popup */
                        type="button"
                        onClick={() =>
                          void ctx.renderHandlers.stableExecuteCommand(row.cmd.id as CommandId)
                        }
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background =
                            row.index === menu().selectedIdx
                              ? 'rgba(128,128,128,0.1)'
                              : 'transparent'
                        }}
                        class={cm.w('full')}
                        style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '10px',
                          padding: '5px 12px 5px 20px',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'inherit',
                          'text-align': 'left',
                          'font-size': '13px',
                          background:
                            row.index === menu().selectedIdx
                              ? 'rgba(128,128,128,0.1)'
                              : 'transparent',
                        }}
                      >
                        <span
                          class={cm.fontWeight('medium')}
                          style={{
                            'font-family': 'monospace',
                            opacity: 0.9,
                            'flex-shrink': 0,
                            // Fixed label column so every description starts at
                            // the same x (widest label is '/autocommit' = 11ch).
                            // ClassMap can't express a fixed column width, so it's
                            // inline — matching this popup's existing convention.
                            'min-width': '12ch',
                          }}
                        >
                          {row.cmd.label}
                        </span>
                        <span class={cm.textMuted} style={{ 'font-size': '12px' }}>
                          {isRegistryCommandId(row.cmd.id)
                            ? commandDescription(t, row.cmd.id, {
                                agentName: ctx.props.agentName ?? DEFAULT_AGENT_NAME,
                              })
                            : row.cmd.description}
                          {suffix !== '' && (
                            <span
                              style={{
                                opacity: 1,
                                color: 'var(--color-primary)',
                                'font-weight': 500,
                              }}
                            >
                              {suffix}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            {/* The footer is gone (React's P3-21): the "Report a problem" link
                is redundant with /report (or /bug), and the version text is
                surfaced on demand via the /version command. */}
          </div>
        </Show>
      )}
    </Show>
  )
}
