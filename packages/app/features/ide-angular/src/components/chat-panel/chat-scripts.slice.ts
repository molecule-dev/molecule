/**
 * React's `chat:scripts` region of ChatPanel.tsx (lines 3107–3174): the
 * `runSavedScript` action the `/run <name>` command dispatches.
 *
 * It fetches the project's saved scripts to resolve the (possibly partial) name,
 * runs the match, and reports the captured output and exit status as a local
 * system card. A script with required options the command line did not supply
 * opens the `/scripts` browser filtered to that script instead of failing the
 * run. A failed listing or run reports that the script could not be run.
 *
 * The region declares no effects and no mount I/O in React, so `mount()` reads
 * nothing and the slice registers no `effects` entry.
 *
 * @module
 */

import { inject, Injectable } from '@angular/core'

import type { ScriptInfo, ScriptRunResult } from '@molecule/app-ide-panel-logic/panels'
import {
  findScriptByName,
  formatRunOutput,
  missingRequiredParams,
  runSucceeded,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatInnerState } from './chat-inner-state.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:scripts` slice. */
export interface ChatScriptsSlice {
  /** React's mount I/O for the region (the region has none). */
  mount(): void

  /** Runs a saved script by name, with its parameters. */
  readonly runSavedScript: (rawName: string, params?: Record<string, string>) => Promise<void>
}

/** React's `chat:scripts` slice: the `/run <name>` action. */
@Injectable()
export class ChatScripts implements ChatScriptsSlice {
  /** The shared state, read for the project, the HTTP client and the translation. */
  private readonly state = inject(ChatInnerState)

  /** React's mount I/O for the region: none — the region declares no effects. */
  mount(): void {
    // No mount I/O in `chat:scripts`: React declares one callback.
  }

  /**
   * Runs a saved script by name: list the project's scripts, resolve the name,
   * then run it and report the exit status with the captured output — or open
   * `/scripts` when a required option is still missing.
   *
   * @param rawName - The typed script name (may be partial, or carry `.sh`).
   * @param params - The `--flag value` options typed after the name.
   * @returns A promise that settles once the run is reported.
   */
  async runSavedScript(rawName: string, params: Record<string, string> = {}): Promise<void> {
    const projectId = this.state.props().projectId
    const systemCards = this.state.slice(ChatSystemCards)
    try {
      const listed = await this.state.env.http.get<{ scripts: ScriptInfo[] }>(
        `/projects/${projectId}/scripts`,
      )
      const scripts = listed.data.scripts ?? []
      const target = findScriptByName(scripts, rawName)
      if (!target) {
        systemCards.addSystemCard(
          scripts.length
            ? this.state.env.t(
                'ide.chat.scripts.runNotFound',
                { name: rawName, names: scripts.map((script) => script.name).join(', ') },
                { defaultValue: 'No script named “{{name}}”. Available: {{names}}' },
              )
            : this.state.env.t('ide.chat.scripts.runNone', undefined, {
                defaultValue: 'No saved scripts yet. Open /scripts to create one.',
              }),
        )
        return
      }
      // A script with required options the command line didn't supply needs the
      // panel's form — open it filtered to this script so the user can fill them
      // in and Run, rather than failing the run for a missing value.
      if (missingRequiredParams(target, params).length > 0) {
        this.state.slice(ChatOverlay).openPanelOverlay('scripts', target.name)
        systemCards.addSystemCard(
          this.state.env.t(
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
      const run = await this.state.env.http.post<ScriptRunResult>(
        `/projects/${projectId}/scripts/${encodeURIComponent(target.name)}/run`,
        Object.keys(params).length ? { params } : undefined,
      )
      const output = formatRunOutput(run.data)
      const status = runSucceeded(run.data)
        ? this.state.env.t(
            'ide.chat.scripts.cmdExitOk',
            { name: target.name },
            { defaultValue: '{{name}} exited 0' },
          )
        : this.state.env.t(
            'ide.chat.scripts.cmdExitFail',
            { name: target.name, code: run.data.exitCode },
            { defaultValue: '{{name}} exited with code {{code}}' },
          )
      systemCards.addSystemCard(output ? `${status}\n${output}` : status)
    } catch (error) {
      logger.warn('Failed to run script via /run command', { error })
      systemCards.addSystemCard(
        this.state.env.t('ide.chat.scripts.runError', undefined, {
          defaultValue: 'Failed to run the script.',
        }),
      )
    }
  }
}
