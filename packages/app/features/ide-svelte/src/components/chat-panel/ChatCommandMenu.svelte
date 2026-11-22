<!--
  React's section “Command menu popup” (ChatPanel.tsx lines 5901–6058): the
  grouped slash-command list that opens above the composer while the menu is
  filtering. Renders only when the menu is open AND its filtered list is
  non-empty.

  Commands are grouped by `COMMAND_CATEGORIES`; every category with a match gets
  a header and its rows. A flat index runs across the groups in render order,
  which is what the arrow-key cursor (`selectedIdx`) refers to, so the
  highlighted row fills its background. Each row carries the live state suffix
  React appends for that command: the model in effect (`/model`), the loop cap,
  the auto-fix toggle, the sounds summary and the app version.

  View only: the filtered list comes from the pickers slice, the open menu and
  every live value from the slices through `ctx`.
-->
<script lang="ts">
  import { APP_VERSION } from '@molecule/app-ide-panel-logic'
  import {
    COMMAND_CATEGORIES,
    type CommandDef,
    commandDescription,
    type CommandId,
    isRegistryCommandId,
    SOUND_EVENTS,
    SOUND_MODE_LABELS,
  } from '@molecule/app-ide-panel-logic/panels'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /** One command row with its flat index across the whole menu. */
  interface CommandRow {
    /** The command. */
    cmd: CommandDef
    /** The row's flat index, the cursor value `selectedIdx` compares against. */
    index: number
  }

  /** One category group with its rows. */
  interface CommandGroup {
    /** The category key (also the group's list key). */
    key: string
    /** The category heading. */
    label: string
    /** The matching commands, with their flat indexes. */
    rows: CommandRow[]
  }

  /**
   * React's grouping: every category in `COMMAND_CATEGORIES` order that has a
   * match, with a flat index assigned while rendering.
   *
   * @param filtered - The commands the menu currently lists.
   * @returns The non-empty groups, in category order.
   */
  function groupCommands(filtered: CommandDef[]): CommandGroup[] {
    let flatIdx = 0
    return COMMAND_CATEGORIES.map(({ key, label }) => ({
      key,
      label,
      rows: filtered
        .filter((cmd) => cmd.category === key)
        .map((cmd) => ({ cmd, index: flatIdx++ })),
    })).filter((group) => group.rows.length > 0)
  }

  /**
   * React's inline state suffix for a command's description, or an empty string
   * when the command carries none.
   *
   * @param cmd - The command's definition.
   * @returns The suffix (leading space included), or `''`.
   */
  function commandSuffix(cmd: CommandDef): string {
    if (cmd.id === 'model') {
      // Reflect the model the ACTIVE conversation mode will actually use — the
      // full server chain, never a UI-seeded default. Falls through to the
      // free-tier id only before the catalog loads so the parentheses never
      // render empty.
      const effId =
        ctx.models.effectiveModelForMode(ctx.chat.mode === 'plan' ? 'plan' : 'execute') ||
        ctx.models.FREE_TIER_MODEL
      const modelLabel =
        ctx.models.AVAILABLE_MODELS.find((model) => model.id === effId)?.label ?? effId
      return modelLabel ? ` (${modelLabel})` : ''
    }
    if (cmd.id === 'maxloops') return ` (${ctx.models.currentMaxLoops})`
    if (cmd.id === 'autofix') return ` (${ctx.models.autoFixEnabled ? 'on' : 'off'})`
    if (cmd.id === 'sounds') {
      const modes = SOUND_EVENTS.map((event) => ctx.sounds.soundsConfig[event])
      const allSame = modes.every((mode) => mode === modes[0])
      return ` (${allSame ? SOUND_MODE_LABELS[modes[0]] : 'mixed'})`
    }
    if (cmd.id === 'version') {
      // The host-supplied `version` prop, falling back to APP_VERSION. `||` not
      // `??`: an empty-string version prop must still fall back, else the
      // suffix is a bare "v".
      return ` (v${ctx.props.version || APP_VERSION})`
    }
    return ''
  }
</script>

{#if ctx.composer.commandMenu && ctx.pickers.filteredCmds.length > 0}
  {@const grouped = groupCommands(ctx.pickers.filteredCmds)}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}"
  >
    <div style="overflow-y: auto; flex: 1">
      {#each grouped as group, gi (group.key)}
        <div>
          <!-- Category header -->
          <div
            class={ctx.env.cm.textMuted}
            style="font-size: 11px; font-weight: 500; padding: 6px 12px 2px{gi > 0
              ? '; border-top: 1px solid rgba(128,128,128,0.12)'
              : ''}"
          >
            {group.label}
          </div>
          <!-- Commands in this group -->
          {#each group.rows as row (row.cmd.id)}
            {@const suffix = commandSuffix(row.cmd)}
            <button
              type="button"
              class={ctx.env.cm.w('full')}
              style="display: flex; align-items: center; gap: 10px; padding: 5px 12px 5px 20px; border: none; cursor: pointer; color: inherit; text-align: left; font-size: 13px"
              style:background={row.index === ctx.composer.commandMenu?.selectedIdx
                ? 'rgba(128,128,128,0.1)'
                : 'transparent'}
              onclick={() => void ctx.commands.executeCommand(row.cmd.id as CommandId)}
              onmouseenter={(event) => {
                ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
              }}
              onmouseleave={(event) => {
                ;(event.currentTarget as HTMLElement).style.background =
                  row.index === ctx.composer.commandMenu?.selectedIdx
                    ? 'rgba(128,128,128,0.1)'
                    : 'transparent'
              }}
            >
              <span
                class={ctx.env.cm.fontWeight('medium')}
                style="font-family: monospace; opacity: 0.9; flex-shrink: 0; min-width: 12ch"
              >
                {row.cmd.label}
              </span>
              <span class={ctx.env.cm.textMuted} style="font-size: 12px">
                {isRegistryCommandId(row.cmd.id)
                  ? commandDescription(ctx.env.t, row.cmd.id, { agentName: ctx.agentName })
                  : row.cmd.description}{#if suffix}<span
                    style="opacity: 1; color: var(--color-primary); font-weight: 500">{suffix}</span
                  >{/if}
              </span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}
