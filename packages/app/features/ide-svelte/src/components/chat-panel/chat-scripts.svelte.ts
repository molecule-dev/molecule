/**
 * React's `chat:scripts` region of ChatPanel.tsx (lines 3107–3174): the
 * `/run <name>` action.
 *
 * It fetches the project's script list to resolve the (possibly partial) name,
 * opens the `/scripts` overlay with the script's form when a required option
 * was not supplied on the command line, and otherwise runs the match and
 * reports its captured output + exit status as a local system card.
 *
 * @module
 */

import type { ScriptInfo, ScriptRunResult } from '@molecule/app-ide-panel-logic/panels'
import {
  findScriptByName,
  formatRunOutput,
  missingRequiredParams,
  runSucceeded,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatContext } from './context.svelte.js'

/** The package logger (the same channel the rest of the package logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:scripts` slice. */
export interface ChatScriptsSlice {
  /** Runs one saved script by name (with its parameters). */
  readonly runSavedScript: (rawName: string, params?: Record<string, string>) => Promise<void>

  /** React's mount I/O for the region — none: it declares one callback only. */
  mount(): void
}

/**
 * Creates the `chat:scripts` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The `/run` action.
 */
export function createChatScripts(ctx: ChatContext): ChatScriptsSlice {
  /**
   * Runs a saved script by name, resolving a partial name against the
   * project's script list first.
   *
   * @param rawName - The name (or partial name) typed after `/run`.
   * @param params - The flags typed after the name, as run options.
   * @returns Resolves once the run has been reported (or refused) as a card.
   */
  const runSavedScript = async (
    rawName: string,
    params: Record<string, string> = {},
  ): Promise<void> => {
    try {
      const listed = await ctx.env.http.get<{ scripts: ScriptInfo[] }>(
        `/projects/${ctx.props.projectId}/scripts`,
      )
      const scripts = listed.data.scripts ?? []
      const target = findScriptByName(scripts, rawName)
      if (!target) {
        ctx.systemCards.addSystemCard(
          scripts.length
            ? ctx.env.t(
                'ide.chat.scripts.runNotFound',
                { name: rawName, names: scripts.map((s) => s.name).join(', ') },
                { defaultValue: 'No script named “{{name}}”. Available: {{names}}' },
              )
            : ctx.env.t('ide.chat.scripts.runNone', undefined, {
                defaultValue: 'No saved scripts yet. Open /scripts to create one.',
              }),
        )
        return
      }
      // A script with required options the command line didn't supply needs the
      // panel's form — open it filtered to this script so the user can fill them
      // in and Run, rather than failing the run for a missing value.
      if (missingRequiredParams(target, params).length > 0) {
        ctx.overlay.openPanelOverlay('scripts', target.name)
        ctx.systemCards.addSystemCard(
          ctx.env.t(
            'ide.chat.scripts.runNeedsOptions',
            { name: target.name },
            {
              defaultValue:
                '“{{name}}” needs options — opened /scripts so you can set them and Run.',
            },
          ),
        )
        return
      }
      const run = await ctx.env.http.post<ScriptRunResult>(
        `/projects/${ctx.props.projectId}/scripts/${encodeURIComponent(target.name)}/run`,
        Object.keys(params).length ? { params } : undefined,
      )
      const output = formatRunOutput(run.data)
      const status = runSucceeded(run.data)
        ? ctx.env.t(
            'ide.chat.scripts.cmdExitOk',
            { name: target.name },
            { defaultValue: '{{name}} exited 0' },
          )
        : ctx.env.t(
            'ide.chat.scripts.cmdExitFail',
            { name: target.name, code: run.data.exitCode },
            { defaultValue: '{{name}} exited with code {{code}}' },
          )
      ctx.systemCards.addSystemCard(output ? `${status}\n${output}` : status)
    } catch (error) {
      logger.warn('Failed to run script via /run command', { error })
      ctx.systemCards.addSystemCard(
        ctx.env.t('ide.chat.scripts.runError', undefined, {
          defaultValue: 'Failed to run the script.',
        }),
      )
    }
  }

  return {
    runSavedScript,
    mount(): void {
      // React's region declares one callback only; there is no mount I/O.
    },
  }
}
