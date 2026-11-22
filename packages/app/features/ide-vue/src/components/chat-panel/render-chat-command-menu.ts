/**
 * The command menu popup — React's render section "Command menu popup".
 *
 * The menu lists the commands the composer's typed text leaves visible, grouped
 * by category, with a live state suffix on the rows whose setting has a current
 * value (`/model`, `/maxloops`, `/autofix`, `/sounds`, `/version`). It is owned
 * by U6, nested inside the input area.
 *
 * The visible list is the pickers slice's `filteredCmds`, which React derives in
 * its `chat:pickers` region and the keyboard handling reads too.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { APP_VERSION } from '@molecule/app-ide-panel-logic'
import {
  COMMAND_CATEGORIES,
  commandDescription,
  type CommandId,
  isRegistryCommandId,
  SOUND_EVENTS,
  SOUND_MODE_LABELS,
} from '@molecule/app-ide-panel-logic/panels'
import { DEFAULT_AGENT_NAME } from '@molecule/app-vue'

import type { ChatCtx } from './context.js'

/**
 * Renders the command menu.
 *
 * @param ctx - The panel context (the open menu, its filtered commands and the
 *   live state each row's suffix reads).
 * @returns The menu, or `null` while it is closed or has no visible command.
 */
export function renderChatCommandMenu(ctx: ChatCtx): VNodeChild {
  const commandMenu = ctx.composer.commandMenu.value
  const filteredCmds = ctx.pickers.filteredCmds.value
  if (!commandMenu || filteredCmds.length === 0) return null

  const cm = ctx.env.cm
  const t = ctx.env.t
  const mode = ctx.chat.mode.value
  const availableModels = ctx.models.AVAILABLE_MODELS.value
  const freeTierModel = ctx.models.FREE_TIER_MODEL.value
  const currentMaxLoops = ctx.models.currentMaxLoops.value
  const autoFixEnabled = ctx.models.autoFixEnabled.value
  const soundsConfig = ctx.sounds.soundsConfig.value
  const version = ctx.props.version
  const agentName = ctx.props.agentName ?? DEFAULT_AGENT_NAME

  // Build flat index → command mapping while rendering grouped. The row index
  // is what the selection highlight compares against.
  let flatIdx = 0
  // Determine which categories have commands in the filtered set.
  const grouped = COMMAND_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    cmds: filteredCmds.filter((command) => command.category === key),
  })).filter((group) => group.cmds.length > 0)

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0px',
        right: '0px',
        marginBottom: '0px',
        borderRadius: '6px 6px 0 0',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: ctx.env.popupMaxHeight.value,
      },
    },
    [
      h(
        'div',
        { style: { overflowY: 'auto', flex: '1' } },
        grouped.map((group, groupIdx) =>
          h('div', { key: group.key }, [
            // Category header.
            h(
              'div',
              {
                class: cm.textMuted,
                style: {
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '6px 12px 2px',
                  ...(groupIdx > 0 ? { borderTop: '1px solid rgba(128,128,128,0.12)' } : {}),
                },
              },
              [group.label],
            ),
            // Commands in this group.
            ...group.cmds.map((command) => {
              const thisIdx = flatIdx++
              // Inline state suffix.
              let suffix = ''
              if (command.id === 'model') {
                // Reflect the model the ACTIVE conversation mode will
                // actually use — the full server chain (per-mode → saved
                // default → server per-mode default → clamp), never a
                // UI-seeded default. Falls through to the free-tier id only
                // before the catalog loads so the parentheses never render
                // empty.
                const effectiveId =
                  ctx.models.effectiveModelForMode(mode === 'plan' ? 'plan' : 'execute') ||
                  freeTierModel
                const modelLabel =
                  availableModels.find((model) => model.id === effectiveId)?.label ?? effectiveId
                suffix = modelLabel ? ` (${modelLabel})` : ''
              } else if (command.id === 'maxloops') suffix = ` (${currentMaxLoops})`
              else if (command.id === 'autofix') suffix = ` (${autoFixEnabled ? 'on' : 'off'})`
              else if (command.id === 'sounds') {
                const modes = SOUND_EVENTS.map((event) => soundsConfig[event])
                const allSame = modes.every((soundMode) => soundMode === modes[0])
                suffix = ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
              } else if (command.id === 'version') {
                // Show the app's current version right in the /version
                // description. `||` not `??`: an empty-string version prop
                // must still fall back to APP_VERSION.
                suffix = ` (v${version || APP_VERSION})`
              }
              return h(
                'button',
                {
                  // mol-bespoke-button: command menu row — full-width list item in the / popup
                  key: command.id,
                  type: 'button',
                  onClick: () => {
                    void ctx.commands.executeCommand(command.id as CommandId)
                  },
                  onMouseenter: (event: MouseEvent) => {
                    const el = event.currentTarget
                    if (el instanceof HTMLElement) el.style.background = 'rgba(128,128,128,0.15)'
                  },
                  onMouseleave: (event: MouseEvent) => {
                    const el = event.currentTarget
                    if (el instanceof HTMLElement)
                      el.style.background =
                        thisIdx === commandMenu.selectedIdx
                          ? 'rgba(128,128,128,0.1)'
                          : 'transparent'
                  },
                  class: cm.w('full'),
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '5px 12px 5px 20px',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                    fontSize: '13px',
                    background:
                      thisIdx === commandMenu.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                  },
                },
                [
                  h(
                    'span',
                    {
                      class: cm.fontWeight('medium'),
                      style: {
                        fontFamily: 'monospace',
                        opacity: '0.9',
                        flexShrink: '0',
                        // Fixed label column so every description starts at
                        // the same x (widest label is '/autocommit' = 11ch).
                        // ClassMap can't express a fixed column width, so it
                        // is inline — matching this popup's existing
                        // convention.
                        minWidth: '12ch',
                      },
                    },
                    [command.label],
                  ),
                  h('span', { class: cm.textMuted, style: { fontSize: '12px' } }, [
                    isRegistryCommandId(command.id)
                      ? commandDescription(t, command.id, { agentName })
                      : command.description,
                    suffix
                      ? h(
                          'span',
                          {
                            style: {
                              opacity: '1',
                              color: 'var(--color-primary)',
                              fontWeight: '500',
                            },
                          },
                          [suffix],
                        )
                      : null,
                  ]),
                ],
              )
            }),
          ]),
        ),
      ),
      // Footer removed (P3-21): the "Report a problem" link is redundant with
      // /report (or /bug), and the version text is now surfaced on demand via
      // the /version command.
    ],
  )
}
