/**
 * `chat:scripts` — the project's saved scripts and the `/run` command (React's
 * `chat:scripts` region, ported by unit U7).
 *
 * `runSavedScript` fetches the script list to resolve the (possibly partial)
 * name, runs the match, and reports the captured output and exit status as a
 * system card; a script with required options the command line did not supply
 * opens the `/scripts` browser filtered to it instead of running.
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

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:scripts`. */
export interface ChatScriptsSlice {
  /** Runs one saved script by name (with its parameters). */
  runSavedScript: (rawName: string, params?: Record<string, string>) => Promise<void>
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:scripts`.
 * @param ctx - The inner ctx (the HTTP client, the system cards it reports
 *   through and the `/scripts` overlay it opens).
 * @returns The scripts slice.
 */
export function createChatScripts(ctx: ChatInnerCtx): ChatScriptsSlice {
  /**
   * Runs a saved script by name (the `/run <name>` command).
   * @param rawName - The name argument, which may be partial or carry a suffix.
   * @param params - The command-line flags, as the run's options.
   * @returns A promise that settles once the card is published.
   */
  const runSavedScript = async (
    rawName: string,
    params: Record<string, string> = {},
  ): Promise<void> => {
    const { t } = ctx.env
    try {
      const listed = await ctx.env.http.get<{ scripts: ScriptInfo[] }>(
        `/projects/${ctx.props.projectId}/scripts`,
      )
      const scripts = listed.data.scripts ?? []
      const target = findScriptByName(scripts, rawName)
      if (!target) {
        ctx.systemCards.addSystemCard(
          scripts.length
            ? t(
                'ide.chat.scripts.runNotFound',
                { name: rawName, names: scripts.map((s) => s.name).join(', ') },
                { defaultValue: 'No script named “{{name}}”. Available: {{names}}' },
              )
            : t('ide.chat.scripts.runNone', undefined, {
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
          t(
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
        ? t(
            'ide.chat.scripts.cmdExitOk',
            { name: target.name },
            { defaultValue: '{{name}} exited 0' },
          )
        : t(
            'ide.chat.scripts.cmdExitFail',
            { name: target.name, code: run.data.exitCode },
            { defaultValue: '{{name}} exited with code {{code}}' },
          )
      ctx.systemCards.addSystemCard(output ? `${status}\n${output}` : status)
    } catch (error) {
      ctx.env.logger.warn('Failed to run script via /run command', { error })
      ctx.systemCards.addSystemCard(
        t('ide.chat.scripts.runError', undefined, { defaultValue: 'Failed to run the script.' }),
      )
    }
  }

  return {
    runSavedScript,
    effects: {},
  }
}
