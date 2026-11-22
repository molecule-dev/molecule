/**
 * `chat:scripts` — running a saved project script from `/run`, ported from
 * React's `chat:scripts` region.
 *
 * The name is resolved against the project's saved scripts (exact, then a
 * unique prefix, then a unique substring), a script with an unsatisfied
 * required option opens the `/scripts` browser filtered to it, and a run's exit
 * status plus captured output is reported as an inline system card. Every
 * request and card is React's, in the same order.
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

import type { ChatCtx } from './context.js'

const logger = getLogger('chat-panel')

/** What the `chat:scripts` slice exposes. */
export interface ChatScriptsSlice {
  /** Runs a saved script by name, with its parameters. */
  readonly runSavedScript: (rawName: string, params?: Record<string, string>) => Promise<void>
}

/**
 * Builds the `chat:scripts` slice.
 *
 * @param ctx - The panel context (HTTP, the project, translation, the cards and
 *   the `/scripts` overlay).
 * @returns The scripts slice.
 */
export function createChatScripts(ctx: ChatCtx): ChatScriptsSlice {
  /**
   * Runs a saved script by name. Fetches the script list to resolve the
   * (possibly partial) name, runs the match, and reports the captured output +
   * exit status as a system card.
   *
   * @param rawName - The name the `/run` command typed (may be partial).
   * @param params - The command-line flags supplied with the run.
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
                { name: rawName, names: scripts.map((script) => script.name).join(', ') },
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
  }
}
