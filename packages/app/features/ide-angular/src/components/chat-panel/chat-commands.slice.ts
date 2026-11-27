/**
 * React's `chat:commands` region of ChatPanel.tsx (lines 3494–3947): the shared
 * command registry merged with the host's own commands, the deduped host lookup,
 * and `executeCommand` — the one dispatcher every command path (the menu row, its
 * settings-card Edit, the keyboard selection) runs through.
 *
 * The merged list is the shared registry UNION any host-provided commands, deduped
 * by id with the host winning, so the menu, grouping and dispatch all see one
 * list. `executeCommand` first closes every sibling popup (menus are strictly
 * one-at-a-time), then routes the id: host commands prefill the composer, a
 * read-only viewer may run only the viewer-safe ones, and each built-in branch
 * performs its own action — a prefill, a picker, a persisted setting, a request,
 * or a system card.
 *
 * The region declares no effects and no mount I/O in React, so `mount()` reads
 * nothing and the slice registers no `effects` entry.
 *
 * @module
 */

import { computed, inject, Injectable } from '@angular/core'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import type { InterpolationValues, TranslateFunction, TranslateOptions } from '@molecule/app-i18n'
import {
  allowanceResetCountdown,
  APP_VERSION,
  DEFAULT_SHARE_ROLE,
  getChatTimestampsVisible,
} from '@molecule/app-ide-panel-logic'
import type { CommandDef, CommandId } from '@molecule/app-ide-panel-logic/panels'
import {
  buildHelpText,
  cachedPromptTokens,
  collectUndoTargets,
  COMMANDS,
  formatTokenTotal,
  viewerCommandAllowed,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatContextUsage } from './chat-context-usage.slice.js'
import { ChatGit } from './chat-git.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatPrefs } from './chat-prefs.slice.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatUndo } from './chat-undo.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The `/cost` request's answer, as React's inline type declares it. */
interface ChatUsageResponse {
  /** Uncached prompt tokens. */
  inputTokens: number
  /** Completion tokens. */
  outputTokens: number
  /** Prompt tokens served from the provider's cache. */
  cacheReadInputTokens?: number
  /** Prompt tokens the provider cached this turn. */
  cacheCreationInputTokens?: number
  /** The owner's spend as a percentage of the allowance, when the plan meters one. */
  allowancePercent?: number | null
  /** When the allowance window resets (epoch milliseconds). */
  allowanceResetAt?: number | null
  /** Which span the allowance meters over. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model that served the conversation. */
  model: string
  /** Whether a response is still streaming into the totals. */
  streaming?: boolean
}

/** The identifiers other slices and sections read from the `chat:commands` slice. */
export interface ChatCommandsSlice {
  /** React's mount I/O for the region (the region has none). */
  mount(): void

  /** Every command the menu offers: shared, host-merged, side-channel. */
  readonly allCommands: () => readonly CommandDef[]
  /** Runs one command by id. */
  readonly executeCommand: (id: CommandId) => Promise<void>
}

/** React's `chat:commands` slice: the merged registry and its dispatcher. */
@Injectable()
export class ChatCommands implements ChatCommandsSlice {
  /** The shared state, read for the props and the env. */
  private readonly state = inject(ChatInnerState)

  /** The host-provided commands (React's `extraCommands` prop). */
  private readonly extraCommands = computed<readonly CommandDef[]>(
    () => this.state.props().extraCommands ?? [],
  )

  /** Whether team messages are allowed (React's `canSendTeamMessages`, default `true`). */
  private readonly canSendTeamMessages = computed(
    () => this.state.props().canSendTeamMessages !== false,
  )

  /**
   * Every command the menu offers: the shared registry union the host's commands,
   * deduped by id with the host winning, and filtered to drop side-channel
   * commands when team messaging is off.
   */
  readonly allCommands = computed<readonly CommandDef[]>(() => {
    const extra = this.extraCommands()
    const overridden = new Set(extra.map((command) => command.id))
    // Widened to CommandDef on purpose: the menu renders registry commands AND
    // host-added ones through one list, so the elements must read as plain
    // CommandDefs, not the registry's literal row types.
    const merged: CommandDef[] = [
      ...COMMANDS.filter((command) => !overridden.has(command.id)),
      ...extra,
    ]
    return merged.filter((command) => this.canSendTeamMessages() || !command.sideChannel)
  })

  /** The host commands' ids, after the same side-channel filter (React's `extraCommandIds`). */
  private readonly extraCommandIds = computed<ReadonlySet<string>>(
    () =>
      new Set(
        this.extraCommands()
          .filter((command) => this.canSendTeamMessages() || !command.sideChannel)
          .map((command) => command.id),
      ),
  )

  /** React's mount I/O for the region: none — the region declares no effects. */
  mount(): void {
    // No mount I/O in `chat:commands`: React declares state and a dispatcher.
  }

  /**
   * Runs one command by id, exactly as React's dispatcher does: close every
   * sibling popup, route host commands to the composer prefill, gate a viewer to
   * the viewer-safe commands, then run the built-in branch.
   *
   * @param id - The command to run.
   * @returns A promise that settles once the command finished.
   */
  async executeCommand(id: CommandId): Promise<void> {
    const composer = this.state.slice(ChatComposer)
    composer.setCommandMenu(null)
    // Any command closes every sibling popup (panel overlay, model/effort/
    // sounds/mic pickers) so popups are strictly one-at-a-time — the branches
    // below re-open their own.
    this.state.slice(ChatOverlay).setPanelOverlay(null)
    composer.setModelPicker(null)
    composer.setEffortPicker(null)
    this.state.slice(ChatSounds).setSoundsPicker(null)
    this.state.slice(ChatVoice).setMicPicker(null)
    const props = this.state.props()
    // Host-provided commands (e.g. molecule.dev's /deploy, /push, /invite,
    // /teamsay) have no client-side branch here — fill the input with the
    // command so the user can add any arguments, then Enter sends it to the
    // host's own handler (a server intercept, or the agent for /push).
    if (this.extraCommandIds().has(id)) {
      this.state.slice(ChatInput).setInputAndCursorEnd(`/${id} `)
      return
    }
    // A read-only VIEWER may run only viewerSafe commands (read / view-only /
    // per-user preference). Everything else writes shared project state or
    // triggers a Synthase turn the server 403s, so surface a read-only note
    // instead of a dead control that silently fails. Default-deny: an
    // unflagged command is unavailable to viewers.
    if (props.canEdit === false) {
      const def = this.allCommands().find((command) => command.id === id)
      if (def && !viewerCommandAllowed(def)) {
        this.card(
          this.t('ide.chat.viewerReadOnlyCommand', undefined, {
            defaultValue:
              'You have view-only access, so this command is unavailable. Ask an editor to make changes.',
          }),
        )
        return
      }
    }
    if (id === 'clear') {
      composer.setInputValue('')
      await this.state.slice(ChatChat).clearHistory()
      this.state.slice(ChatGit).setCommitCards([])
      this.state.slice(ChatPopups).setSystemCards([])
      this.state.slice(ChatContextUsage).setContextUsage(null)
      this.state.slice(ChatScroll).setMaxVisibleItems(60)
    } else if (id === 'model') {
      this.state.slice(ChatInput).setInputAndCursorEnd('/model ')
      composer.setModelPicker({
        selectedIdx: -1,
        mode: this.state.slice(ChatChat).liveModelMode(),
        text: '/model ',
      })
    } else if (id === 'mic' || id === 'dictate') {
      composer.setInputValue('')
      this.state.slice(ChatVoice).setMicPicker({ autoStart: false })
    } else if (id === 'maxloops') {
      this.state.slice(ChatInput).setInputAndCursorEnd('/maxloops ')
    } else if (id === 'effort') {
      // Open the selectable level picker (mirrors /model) scoped to the live
      // conversation mode; its mode dropdown re-scopes in place.
      composer.setInputValue('')
      composer.setEffortPicker({
        selectedIdx: -1,
        mode: this.state.slice(ChatChat).liveModelMode(),
        text: '',
      })
    } else if (id === 'autocommit') {
      // Prefill so the user types the cadence (seconds); 0 cancels.
      this.state.slice(ChatInput).setInputAndCursorEnd('/autocommit ')
    } else if (id === 'help') {
      composer.setInputValue('')
      // Render the rich, interactive HelpCard variant (real category hierarchy,
      // clickable command rows). The plain-text buildHelpText() is stored as the
      // card's `text` so it remains the i18n fallback (and the copy /
      // screen-reader text) if the rich variant is ever off.
      this.card(buildHelpText({ agentName: this.agentName(), productName: this.productName() }), {
        variant: 'help',
      })
    } else if (id === 'compact') {
      composer.setInputValue('')
      this.card(
        this.t('ide.chat.compacting', undefined, { defaultValue: 'Compacting conversation...' }),
      )
      try {
        const conversationId = this.state.env.conversationId()
        const projectId = this.state.props().projectId
        const compactUrl = conversationId
          ? `/projects/${projectId}/compact?conversationId=${conversationId}`
          : `/projects/${projectId}/compact`
        const res = await this.state.env.http.post<{ compactedCount: number }>(compactUrl)
        if (res.data.compactedCount > 0) {
          this.card(
            this.t(
              'ide.chat.compacted',
              { count: res.data.compactedCount },
              { defaultValue: 'Compacted {{count}} messages.' },
            ),
          )
        } else {
          this.card(
            this.t('ide.chat.compactNotNeeded', undefined, {
              defaultValue: 'Context usage is low — no compaction needed.',
            }),
          )
        }
      } catch (error) {
        logger.warn('Failed to compact conversation', { error })
        this.card(
          this.t('ide.chat.compactError', undefined, {
            defaultValue: 'Failed to compact conversation.',
          }),
        )
      }
    } else if (id === 'plan') {
      composer.setInputValue('')
      const chat = this.state.slice(ChatChat)
      const previousMode = chat.mode()
      const newMode = previousMode === 'plan' ? 'execute' : 'plan'
      chat.setMode(newMode)
      const projectId = this.state.props().projectId
      this.state.env.http
        .patch(`/projects/${projectId}/chat-mode`, {
          mode: newMode,
          conversationId: this.state.env.conversationId(),
        })
        .catch((error: unknown) => {
          logger.warn('chat-panel: persisting chat-mode change failed; reverted', { error })
          chat.setMode(previousMode)
        })
      this.card(
        newMode === 'plan'
          ? this.t('ide.chat.switchedToPlan', undefined, { defaultValue: 'Switched to plan mode' })
          : this.t('ide.chat.switchedToExecute', undefined, {
              defaultValue: 'Switched to execute mode',
            }),
      )
    } else if (id === 'cost') {
      composer.setInputValue('')
      try {
        const conversationId = this.state.env.conversationId()
        const projectId = this.state.props().projectId
        const usageUrl = conversationId
          ? `/projects/${projectId}/chat-usage?conversationId=${conversationId}`
          : `/projects/${projectId}/chat-usage`
        const res = await this.state.env.http.get<ChatUsageResponse>(usageUrl)
        const d = res.data
        const fmt = formatTokenTotal
        // AI usage is shown as a UNITLESS share of the allowance — currency
        // never appears on AI-usage surfaces. The percent is the owner's spend
        // in their CURRENT window (the number the chat gate actually enforces),
        // so 100% here IS the block point; at/above it the card switches to the
        // used-up line with the window's reset countdown. `allowanceWindow` says
        // which span that is; an older API omits the field, so fall back to the
        // daily framing that shipped with it.
        // The reset countdown receives the translate function as a value, so it
        // must be bound to this slice (React's  is a plain closure).
        const translate: TranslateFunction = (key, values, options) => this.t(key, values, options)
        const isMonthlyAllowance = d.allowanceWindow === 'billing-period'
        const allowanceLine =
          typeof d.allowancePercent === 'number'
            ? '\n' +
              (d.allowancePercent >= 100 && typeof d.allowanceResetAt === 'number'
                ? isMonthlyAllowance
                  ? this.t(
                      'ide.chat.usageAllowanceUsedUpMonthlyLine',
                      { when: allowanceResetCountdown(translate, d.allowanceResetAt) },
                      {
                        defaultValue: 'This month’s AI allowance is used up — refreshes {{when}}.',
                      },
                    )
                  : this.t(
                      'ide.chat.usageAllowanceUsedUpLine',
                      { when: allowanceResetCountdown(translate, d.allowanceResetAt) },
                      {
                        defaultValue: "Today's AI allowance is used up — refreshes {{when}}.",
                      },
                    )
                : // Neutral phrasing on purpose in both: the allowance belongs
                  // to the PROJECT (its owner's plan window) — "you've used"
                  // misattributed it to whichever teammate ran /cost.
                  isMonthlyAllowance
                  ? this.t(
                      'ide.chat.usageAllowanceMonthlyLine',
                      { percent: d.allowancePercent },
                      {
                        defaultValue: '~{{percent}}% of this month’s AI allowance used.',
                      },
                    )
                  : this.t(
                      'ide.chat.usageAllowanceTodayLine',
                      { percent: d.allowancePercent },
                      {
                        defaultValue: "~{{percent}}% of today's AI allowance used.",
                      },
                    ))
            : ''
        // `inputTokens` counts only the UNCACHED prompt: every bond normalizes
        // cache hits into their own bucket. In a long agentic turn the cached
        // share is most of the volume, so show it.
        const cachedTokens = cachedPromptTokens(d)
        const cachedLine =
          cachedTokens > 0
            ? '\n' +
              this.t(
                'ide.chat.costCachedLine',
                { cached: fmt(cachedTokens) },
                {
                  defaultValue: 'Cached input: {{cached}} tokens (billed at a fraction of input)',
                },
              )
            : ''
        // Mid-stream the totals include the in-progress response's running
        // usage (the server folds it in) — say so, since the figure is still
        // growing.
        const streamingLine = d.streaming
          ? '\n' +
            this.t('ide.chat.costStreamingNote', undefined, {
              defaultValue: 'Running total — includes the response currently streaming.',
            })
          : ''
        this.card(
          this.t(
            'ide.chat.costSummary',
            {
              model: d.model,
              input: fmt(d.inputTokens),
              output: fmt(d.outputTokens),
            },
            {
              // Keep this in sync with the ide.chat.costSummary value in the
              // ide locale bond.
              defaultValue: 'Model: {{model}}\nInput: {{input}} tokens\nOutput: {{output}} tokens',
            },
          ) +
            cachedLine +
            allowanceLine +
            streamingLine,
        )
      } catch (error) {
        logger.warn('Failed to fetch chat usage data', { error })
        this.card(
          this.t('ide.chat.costError', undefined, { defaultValue: 'Unable to fetch usage data.' }),
        )
      }
    } else if (id === 'undo') {
      composer.setInputValue('')
      // Collect the last assistant turn's file-changing tool calls (skipping
      // already-undone ones) and their original content.
      const chat = this.state.slice(ChatChat)
      const undo = this.state.slice(ChatUndo)
      const { fileOriginals, tcIdsToUndo } = collectUndoTargets(chat.messages(), undo.undoneTcIds())
      if (fileOriginals.size === 0) {
        this.card(
          this.t('ide.chat.undoNoChanges', undefined, { defaultValue: 'No file changes to undo.' }),
        )
        return
      }
      try {
        const git = this.state.slice(ChatGit)
        for (const [path, content] of fileOriginals) {
          await git.handleFileRevert(path, content)
        }
        // Mark these tool calls as undone so the ToolCallCard icons reflect the state
        undo.setUndoneTcIds((prev) => {
          const next = new Set(prev)
          for (const tcId of tcIdsToUndo) next.add(tcId)
          return next
        })
        undo.persistUndoToggle(tcIdsToUndo, true)
        this.card(
          this.t(
            'ide.chat.undoComplete',
            { count: fileOriginals.size },
            { defaultValue: 'Reverted {{count}} file(s) from last AI turn.' },
          ),
        )
      } catch (error) {
        logger.warn('Failed to revert file changes for undo', { error })
        this.card(
          this.t('ide.chat.undoError', undefined, { defaultValue: 'Failed to revert changes.' }),
        )
      }
    } else if (id === 'commit') {
      composer.setInputValue('')
      await this.state.slice(ChatGit).handleCommit()
    } else if (id === 'test') {
      composer.setInputValue('')
      // Opens the tests browser, like /scripts.
      this.state.slice(ChatTests).openTestsBrowser('')
    } else if (id === 'explain') {
      this.state.slice(ChatInput).setInputAndCursorEnd('/explain ')
    } else if (id === 'lint') {
      composer.setInputValue('')
      this.state
        .slice(ChatChat)
        .sendMessage(
          'Run `npm run lint` in both api/ and app/ workspaces. Report all errors and warnings found and fix them.',
        )
    } else if (id === 'autofix') {
      composer.setInputValue('')
      const models = this.state.slice(ChatModels)
      const newValue = !models.autoFixEnabled()
      try {
        await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
          settings: { autoFix: newValue },
        })
        models.setAutoFixEnabled(newValue)
        this.card(
          newValue
            ? this.t('ide.chat.autoFixEnabled', undefined, {
                defaultValue: 'Auto-fix enabled.',
              })
            : this.t('ide.chat.autoFixDisabled', undefined, {
                defaultValue: 'Auto-fix disabled.',
              }),
        )
      } catch (error) {
        logger.warn('Failed to update auto-fix setting', { error })
        this.card(
          this.t('ide.chat.autoFixError', undefined, {
            defaultValue: 'Failed to update auto-fix setting.',
          }),
        )
      }
    } else if (id === 'autoapprove') {
      composer.setInputValue('')
      const models = this.state.slice(ChatModels)
      const newValue = !models.autoApproveCommandsEnabled()
      try {
        await this.state.env.http.patch(this.state.slice(ChatChat).settingsPatchUrl(), {
          settings: { autoApproveCommands: newValue },
        })
        models.setAutoApproveCommandsEnabled(newValue)
        this.card(
          newValue
            ? this.t('ide.chat.autoApproveEnabled', undefined, {
                defaultValue:
                  'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
              })
            : this.t('ide.chat.autoApproveDisabled', undefined, {
                defaultValue: 'Auto-approve off — destructive commands ask before running.',
              }),
        )
      } catch (error) {
        logger.warn('Failed to update auto-approve setting', { error })
        this.card(
          this.t('ide.chat.autoApproveError', undefined, {
            defaultValue: 'Failed to update auto-approve setting.',
          }),
        )
      }
    } else if (id === 'sounds') {
      composer.setInputValue('')
      this.state.slice(ChatSounds).setSoundsPicker({ selectedIdx: -1 })
    } else if (id === 'timestamps') {
      composer.setInputValue('')
      this.state.slice(ChatPrefs).applyTimestampsVisible(!getChatTimestampsVisible())
    } else if (id === 'settings') {
      composer.setInputValue('')
      // Opens the settings + command-reference card in a closeable overlay.
      this.state.slice(ChatOverlay).openPanelOverlay('settings')
    } else if (id === 'skills') {
      composer.setInputValue('')
      // Opens the skills browser in a closeable overlay. A query, if any, is
      // supplied via the /skills <query> path in handleSubmit.
      this.state.slice(ChatOverlay).openPanelOverlay('skills')
    } else if (id === 'scripts') {
      composer.setInputValue('')
      // Opens the scripts browser in a closeable overlay. A query, if any, is
      // supplied via the /scripts <query> path in handleSubmit.
      this.state.slice(ChatOverlay).openPanelOverlay('scripts')
    } else if (id === 'run') {
      // /run needs a script name — prefill so the user can type it (the run is
      // dispatched from handleSubmit via runSavedScript).
      this.state.slice(ChatInput).setInputAndCursorEnd('/run ')
    } else if (id === 'report' || id === 'bug') {
      composer.setInputValue('')
      this.state.slice(ChatPopups).setReportModal({ title: '' })
    } else if (id === 'version') {
      composer.setInputValue('')
      // Version is the host-supplied `version` prop (the real build version),
      // falling back to the package APP_VERSION constant.
      this.card(
        this.t(
          'ide.chat.version',
          // `||` (not `??`): the host-supplied version prop can be an EMPTY
          // string (useVersion before it resolves), which `??` would NOT fall
          // back on — leaving a bare "v". Fall back for empty AND null/undefined.
          { productName: this.productName(), version: props.version || APP_VERSION },
          { defaultValue: '{{productName}} v{{version}}' },
        ),
      )
    } else if (id === 'share') {
      composer.setInputValue('')
      if (this.state.env.shareAllowed()) {
        this.state.slice(ChatPopups).setShareModal({ role: DEFAULT_SHARE_ROLE })
      }
    }
  }

  /**
   * The translation function (React's `t`), read from the shared env.
   *
   * @param key - The i18n key.
   * @param values - The interpolation values.
   * @param options - The fallback copy.
   * @returns The translated string.
   */
  private t(key: string, values?: InterpolationValues, options?: TranslateOptions): string {
    return this.state.env.t(key, values, options)
  }

  /**
   * Publishes one local inline card through the system-cards slice.
   *
   * @param text - The card's plain-text body.
   * @param options - The variant's own fields, spread verbatim.
   */
  private card(text: string, options?: Parameters<ChatSystemCards['addSystemCard']>[1]): void {
    this.state.slice(ChatSystemCards).addSystemCard(text, options)
  }

  /**
   * The agent's display name (React's resolved `agentName`).
   *
   * @returns The agent name.
   */
  private agentName(): string {
    return this.state.props().agentName ?? DEFAULT_AGENT_NAME
  }

  /**
   * The host product's display name (React's resolved `productName`).
   *
   * @returns The product name.
   */
  private productName(): string {
    return this.state.props().productName ?? DEFAULT_PRODUCT_NAME
  }
}
