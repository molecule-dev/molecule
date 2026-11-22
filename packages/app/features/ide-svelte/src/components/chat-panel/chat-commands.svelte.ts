/**
 * React's `chat:commands` region of ChatPanel.tsx (lines 3494–3947): the merged
 * slash-command registry and the one dispatcher every command surface calls.
 *
 * `allCommands` is the shared registry UNION any host-provided commands,
 * deduped by id with the host winning, so the menu, grouping and dispatch all
 * see one list. `executeCommand` first closes every sibling popup (commands are
 * strictly one-at-a-time) and then runs the branch for the command: a host
 * command prefills the composer for the host's own handler, a viewer is
 * default-denied on anything not viewer-safe, and each built-in command sets
 * its own state, request or card.
 *
 * @module
 */

import { SvelteSet } from 'svelte/reactivity'

import {
  allowanceResetCountdown,
  APP_VERSION,
  type CommandDef,
  type CommandId,
  COMMANDS,
  DEFAULT_SHARE_ROLE,
  getChatTimestampsVisible,
} from '@molecule/app-ide-panel-logic'
import {
  buildHelpText,
  cachedPromptTokens,
  type ChatUsageTokens,
  collectUndoTargets,
  formatTokenTotal,
  viewerCommandAllowed,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatContext } from './context.svelte.js'

/** The package logger (the same channel the rest of the package logs on). */
const logger = getLogger('chat-panel')

/** A chat-usage response, as the `/cost` command reads it. */
interface ChatUsageSummary extends ChatUsageTokens {
  /** The share of the project's allowance used, when the server sent one. */
  allowancePercent?: number | null
  /** When the allowance window resets (epoch ms), when the server sent one. */
  allowanceResetAt?: number | null
  /** Which span the allowance meters over; older APIs omit it. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model that served the conversation. */
  model: string
  /** Whether a response is streaming in right now (the totals include it). */
  streaming?: boolean
}

/** The identifiers other slices and sections read from the `chat:commands` slice. */
export interface ChatCommandsSlice {
  /** The shared commands plus the host's extras, deduped by id. */
  readonly allCommands: readonly CommandDef[]
  /** Runs one slash command. */
  readonly executeCommand: (id: CommandId) => Promise<void>

  /** React's mount I/O for the region — none: it declares derived state and one callback. */
  mount(): void
}

/**
 * Creates the `chat:commands` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The merged registry and the command dispatcher.
 */
export function createChatCommands(ctx: ChatContext): ChatCommandsSlice {
  // The shared registry UNION any host-provided commands, deduped by id with
  // the host winning: a host may override a shared command (its id is routed to
  // the host first, see `extraCommandIds`), and the menu must then list it once,
  // with the host's label and description. A command a viewer cannot run
  // (`sideChannel` while team messages are off) is left out of the list.
  const allCommands = $derived.by((): readonly CommandDef[] => {
    const overridden = new SvelteSet((ctx.props.extraCommands ?? []).map((c) => c.id))
    const merged: CommandDef[] = [
      ...COMMANDS.filter((c) => !overridden.has(c.id)),
      ...(ctx.props.extraCommands ?? []),
    ]
    return merged.filter((command) => ctx.canSendTeamMessages || !command.sideChannel)
  })

  // The ids the host owns (any command that survives the side-channel filter),
  // consulted before every built-in branch so an override takes the host path.
  const extraCommandIds = $derived.by(
    (): Set<CommandId> =>
      new SvelteSet<CommandId>(
        (ctx.props.extraCommands ?? [])
          .filter((command) => ctx.canSendTeamMessages || !command.sideChannel)
          .map((c) => c.id),
      ),
  )

  /**
   * Runs one slash command.
   *
   * @param id - The command's id.
   * @returns Resolves once the command's own work (requests, cards) is done.
   */
  const executeCommand = async (id: CommandId): Promise<void> => {
    ctx.composer.setCommandMenu(null)
    // Any command closes every sibling popup (panel overlay, model/effort/
    // sounds/mic pickers) so popups are strictly one-at-a-time — the branches
    // below re-open their own.
    ctx.overlay.setPanelOverlay(null)
    ctx.composer.setModelPicker(null)
    ctx.composer.setEffortPicker(null)
    ctx.sounds.setSoundsPicker(null)
    ctx.voice.setMicPicker(null)
    // Host-provided commands (e.g. molecule.dev's /deploy, /push, /invite,
    // /teamsay) have no client-side branch here — fill the input with the
    // command so the user can add any arguments, then Enter sends it to the
    // host's own handler (a server intercept, or the agent for /push).
    if (extraCommandIds.has(id)) {
      ctx.input.setInputAndCursorEnd(`/${id} `)
      return
    }
    // A read-only VIEWER may run only viewerSafe commands (read / view-only /
    // per-user preference). Everything else writes shared project state or
    // triggers a Synthase turn the server 403s, so surface a read-only note
    // instead of a dead control that silently fails. Default-deny: an
    // unflagged command is unavailable to viewers.
    if (ctx.props.canEdit === false) {
      const def = allCommands.find((c) => c.id === id)
      if (def && !viewerCommandAllowed(def)) {
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.viewerReadOnlyCommand', undefined, {
            defaultValue:
              'You have view-only access, so this command is unavailable. Ask an editor to make changes.',
          }),
        )
        return
      }
    }
    if (id === 'clear') {
      ctx.composer.setInputValue('')
      await ctx.chat.clearHistory()
      ctx.git.setCommitCards([])
      ctx.popups.setSystemCards([])
      ctx.contextUsage.setContextUsage(null)
      ctx.scroll.setMaxVisibleItems(60)
    } else if (id === 'model') {
      ctx.input.setInputAndCursorEnd('/model ')
      ctx.composer.setModelPicker({
        selectedIdx: -1,
        mode: ctx.chat.liveModelMode,
        text: '/model ',
      })
    } else if (id === 'mic' || id === 'dictate') {
      ctx.composer.setInputValue('')
      ctx.voice.setMicPicker({ autoStart: false })
    } else if (id === 'maxloops') {
      ctx.input.setInputAndCursorEnd('/maxloops ')
    } else if (id === 'effort') {
      // Open the selectable level picker (mirrors /model) scoped to the live
      // conversation mode; its mode dropdown re-scopes in place.
      ctx.composer.setInputValue('')
      ctx.composer.setEffortPicker({
        selectedIdx: -1,
        mode: ctx.chat.liveModelMode,
        text: '',
      })
    } else if (id === 'autocommit') {
      // Prefill so the user types the cadence (seconds); 0 cancels.
      ctx.input.setInputAndCursorEnd('/autocommit ')
    } else if (id === 'help') {
      ctx.composer.setInputValue('')
      // Render the rich, interactive HelpCard variant (real category hierarchy,
      // clickable command rows) — the plain-text buildHelpText() is still
      // computed and stored as the card's `text` so it remains the i18n
      // fallback (and the copy/screen-reader text) if the rich variant is off.
      ctx.systemCards.addSystemCard(
        buildHelpText({ agentName: ctx.agentName, productName: ctx.productName }),
        { variant: 'help' },
      )
    } else if (id === 'compact') {
      ctx.composer.setInputValue('')
      ctx.systemCards.addSystemCard(
        ctx.env.t('ide.chat.compacting', undefined, {
          defaultValue: 'Compacting conversation...',
        }),
      )
      try {
        const compactUrl = ctx.env.conversationId
          ? `/projects/${ctx.props.projectId}/compact?conversationId=${ctx.env.conversationId}`
          : `/projects/${ctx.props.projectId}/compact`
        const res = await ctx.env.http.post<{ compactedCount: number }>(compactUrl)
        if (res.data.compactedCount > 0) {
          ctx.systemCards.addSystemCard(
            ctx.env.t(
              'ide.chat.compacted',
              { count: res.data.compactedCount },
              { defaultValue: 'Compacted {{count}} messages.' },
            ),
          )
        } else {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.compactNotNeeded', undefined, {
              defaultValue: 'Context usage is low — no compaction needed.',
            }),
          )
        }
      } catch (error) {
        logger.warn('Failed to compact conversation', { error })
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.compactError', undefined, {
            defaultValue: 'Failed to compact conversation.',
          }),
        )
      }
    } else if (id === 'plan') {
      ctx.composer.setInputValue('')
      const previousMode = ctx.chat.mode
      const newMode = previousMode === 'plan' ? 'execute' : 'plan'
      ctx.chat.setMode(newMode)
      ctx.env.http
        .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
          mode: newMode,
          conversationId: ctx.env.conversationId,
        })
        .catch((error) => {
          logger.warn('chat-panel: persisting chat-mode change failed; reverted', { error })
          ctx.chat.setMode(previousMode)
        })
      ctx.systemCards.addSystemCard(
        newMode === 'plan'
          ? ctx.env.t('ide.chat.switchedToPlan', undefined, {
              defaultValue: 'Switched to plan mode',
            })
          : ctx.env.t('ide.chat.switchedToExecute', undefined, {
              defaultValue: 'Switched to execute mode',
            }),
      )
    } else if (id === 'cost') {
      ctx.composer.setInputValue('')
      try {
        const usageUrl = ctx.env.conversationId
          ? `/projects/${ctx.props.projectId}/chat-usage?conversationId=${ctx.env.conversationId}`
          : `/projects/${ctx.props.projectId}/chat-usage`
        const res = await ctx.env.http.get<ChatUsageSummary>(usageUrl)
        const d = res.data
        const fmt = formatTokenTotal
        // AI usage is shown as a UNITLESS share of the allowance — currency
        // never appears on AI-usage surfaces. The percent is the owner's spend
        // in their CURRENT window (the number the chat gate actually enforces),
        // so 100% here IS the block point; at/above it the card switches to the
        // used-up line with the window's reset countdown.
        //
        // `allowanceWindow` says which span that is: the unpaid tiers meter over
        // a rolling day, the paid ones over their billing period. Naming the
        // wrong one is not cosmetic — an older API omits the field, so fall back
        // to the daily framing that shipped with it rather than promising a
        // month we cannot confirm.
        const isMonthlyAllowance = d.allowanceWindow === 'billing-period'
        const allowanceLine =
          typeof d.allowancePercent === 'number'
            ? '\n' +
              (d.allowancePercent >= 100 && typeof d.allowanceResetAt === 'number'
                ? isMonthlyAllowance
                  ? ctx.env.t(
                      'ide.chat.usageAllowanceUsedUpMonthlyLine',
                      { when: allowanceResetCountdown(ctx.env.t, d.allowanceResetAt) },
                      {
                        defaultValue: 'This month’s AI allowance is used up — refreshes {{when}}.',
                      },
                    )
                  : ctx.env.t(
                      'ide.chat.usageAllowanceUsedUpLine',
                      { when: allowanceResetCountdown(ctx.env.t, d.allowanceResetAt) },
                      {
                        defaultValue: "Today's AI allowance is used up — refreshes {{when}}.",
                      },
                    )
                : // Neutral phrasing on purpose in both: the allowance belongs
                  // to the PROJECT (its owner's plan window) — "you've used"
                  // misattributed it to whichever teammate ran /cost.
                  isMonthlyAllowance
                  ? ctx.env.t(
                      'ide.chat.usageAllowanceMonthlyLine',
                      { percent: d.allowancePercent },
                      {
                        defaultValue: '~{{percent}}% of this month’s AI allowance used.',
                      },
                    )
                  : ctx.env.t(
                      'ide.chat.usageAllowanceTodayLine',
                      { percent: d.allowancePercent },
                      {
                        defaultValue: "~{{percent}}% of today's AI allowance used.",
                      },
                    ))
            : ''
        // `inputTokens` counts only the UNCACHED prompt: every bond normalizes
        // cache hits into their own bucket. In a long agentic turn the cached
        // share is most of the volume, so omitting it made this card look
        // wildly smaller than the provider dashboard. Show it.
        const cachedTokens = cachedPromptTokens(d)
        const cachedLine =
          cachedTokens > 0
            ? '\n' +
              ctx.env.t(
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
            ctx.env.t('ide.chat.costStreamingNote', undefined, {
              defaultValue: 'Running total — includes the response currently streaming.',
            })
          : ''
        ctx.systemCards.addSystemCard(
          ctx.env.t(
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
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.costError', undefined, {
            defaultValue: 'Unable to fetch usage data.',
          }),
        )
      }
    } else if (id === 'undo') {
      ctx.composer.setInputValue('')
      // Collect the last assistant turn's file-changing tool calls (skipping
      // already-undone ones) and their original content.
      const { fileOriginals, tcIdsToUndo } = collectUndoTargets(
        ctx.chat.messages,
        ctx.undo.undoneTcIds,
      )
      if (fileOriginals.size === 0) {
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.undoNoChanges', undefined, {
            defaultValue: 'No file changes to undo.',
          }),
        )
        return
      }
      try {
        for (const [path, content] of fileOriginals) {
          await ctx.git.handleFileRevert(path, content)
        }
        // Mark these tool calls as undone so the ToolCallCard icons reflect the
        // state
        ctx.undo.setUndoneTcIds((prev) => {
          const next = new SvelteSet(prev)
          for (const tcId of tcIdsToUndo) next.add(tcId)
          return next
        })
        ctx.undo.persistUndoToggle(tcIdsToUndo, true)
        ctx.systemCards.addSystemCard(
          ctx.env.t(
            'ide.chat.undoComplete',
            { count: fileOriginals.size },
            { defaultValue: 'Reverted {{count}} file(s) from last AI turn.' },
          ),
        )
      } catch (error) {
        logger.warn('Failed to revert file changes for undo', { error })
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.undoError', undefined, { defaultValue: 'Failed to revert changes.' }),
        )
      }
    } else if (id === 'commit') {
      ctx.composer.setInputValue('')
      await ctx.git.handleCommit()
    } else if (id === 'test') {
      ctx.composer.setInputValue('')
      // Was: a natural-language "run npm test and report" message to the agent —
      // a whole turn spent to read output the platform can run directly. Now it
      // opens the tests browser, like /scripts.
      ctx.tests.openTestsBrowser('')
    } else if (id === 'explain') {
      ctx.input.setInputAndCursorEnd('/explain ')
    } else if (id === 'lint') {
      ctx.composer.setInputValue('')
      ctx.chat.sendMessage(
        'Run `npm run lint` in both api/ and app/ workspaces. Report all errors and warnings found and fix them.',
      )
    } else if (id === 'autofix') {
      ctx.composer.setInputValue('')
      const newValue = !ctx.models.autoFixEnabled
      try {
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), { settings: { autoFix: newValue } })
        ctx.models.setAutoFixEnabled(newValue)
        ctx.systemCards.addSystemCard(
          newValue
            ? ctx.env.t('ide.chat.autoFixEnabled', undefined, {
                defaultValue: 'Auto-fix enabled.',
              })
            : ctx.env.t('ide.chat.autoFixDisabled', undefined, {
                defaultValue: 'Auto-fix disabled.',
              }),
        )
      } catch (error) {
        logger.warn('Failed to update auto-fix setting', { error })
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.autoFixError', undefined, {
            defaultValue: 'Failed to update auto-fix setting.',
          }),
        )
      }
    } else if (id === 'autoapprove') {
      ctx.composer.setInputValue('')
      const newValue = !ctx.models.autoApproveCommandsEnabled
      try {
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { autoApproveCommands: newValue },
        })
        ctx.models.setAutoApproveCommandsEnabled(newValue)
        ctx.systemCards.addSystemCard(
          newValue
            ? ctx.env.t('ide.chat.autoApproveEnabled', undefined, {
                defaultValue:
                  'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
              })
            : ctx.env.t('ide.chat.autoApproveDisabled', undefined, {
                defaultValue: 'Auto-approve off — destructive commands ask before running.',
              }),
        )
      } catch (error) {
        logger.warn('Failed to update auto-approve setting', { error })
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.autoApproveError', undefined, {
            defaultValue: 'Failed to update auto-approve setting.',
          }),
        )
      }
    } else if (id === 'sounds') {
      ctx.composer.setInputValue('')
      ctx.sounds.setSoundsPicker({ selectedIdx: -1 })
    } else if (id === 'timestamps') {
      ctx.composer.setInputValue('')
      ctx.prefs.applyTimestampsVisible(!getChatTimestampsVisible())
    } else if (id === 'settings') {
      ctx.composer.setInputValue('')
      // Opens the settings + command-reference card in a closeable overlay.
      ctx.overlay.openPanelOverlay('settings')
    } else if (id === 'skills') {
      ctx.composer.setInputValue('')
      // Opens the skills browser in a closeable overlay. A query, if any, is
      // supplied via the /skills <query> path in handleSubmit.
      ctx.overlay.openPanelOverlay('skills')
    } else if (id === 'scripts') {
      ctx.composer.setInputValue('')
      // Opens the scripts browser in a closeable overlay. A query, if any, is
      // supplied via the /scripts <query> path in handleSubmit.
      ctx.overlay.openPanelOverlay('scripts')
    } else if (id === 'run') {
      // /run needs a script name — prefill so the user can type it (the run is
      // dispatched from handleSubmit via runSavedScript).
      ctx.input.setInputAndCursorEnd('/run ')
    } else if (id === 'report' || id === 'bug') {
      ctx.composer.setInputValue('')
      ctx.popups.setReportModal({ title: '' })
    } else if (id === 'version') {
      ctx.composer.setInputValue('')
      // /version replaces the old command-menu footer version line. Version is
      // the host-supplied `version` prop (the real build version), falling back
      // to the package APP_VERSION constant; the same value drives the
      // slash-command menu's /version description.
      ctx.systemCards.addSystemCard(
        ctx.env.t(
          'ide.chat.version',
          // `||` (not `??`): the host-supplied version prop can be an EMPTY
          // string (useVersion before it resolves), which `??` would NOT fall
          // back on — leaving a bare "v". Fall back to APP_VERSION for empty AND
          // null/undefined.
          { productName: ctx.productName, version: ctx.props.version || APP_VERSION },
          { defaultValue: '{{productName}} v{{version}}' },
        ),
      )
    } else if (id === 'share') {
      ctx.composer.setInputValue('')
      if (ctx.env.shareAllowed) ctx.popups.setShareModal({ role: DEFAULT_SHARE_ROLE })
    }
  }

  return {
    get allCommands(): readonly CommandDef[] {
      return allCommands
    },
    executeCommand,
    mount(): void {
      // React's region declares derived state and one callback; there is no
      // mount I/O.
    },
  }
}
