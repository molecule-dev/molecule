/**
 * `chat:commands` — the merged slash-command list and the dispatcher, ported
 * from React's `chat:commands` region. Every command (shared, host-merged and
 * side-channel) is dispatched from here: the popups close, a host command
 * prefills the composer, a viewer is refused with a read-only note, and each
 * built-in command runs its own branch.
 *
 * The list React derives with `useMemo` is a Vue computed, so a host that
 * changes `extraCommands` or `canSendTeamMessages` re-merges in place. The
 * dispatcher reads every slice through `ctx` at call time, exactly as React's
 * callback reads its dependencies, so the cycles the regions have
 * (`executeCommand` → `clearHistory` / `handleCommit` / `sendMessage`) stay
 * cycles.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

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
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-vue'

import type { ChatCtx } from './context.js'

const logger = getLogger('chat-panel')

/** The usage payload `GET /projects/:id/chat-usage` answers `/cost` with. */
interface ChatUsageResponse {
  /** Uncached prompt tokens. */
  inputTokens: number
  /** Generated tokens. */
  outputTokens: number
  /** Prompt tokens served from the provider's cache. */
  cacheReadInputTokens?: number
  /** Prompt tokens written into the provider's cache. */
  cacheCreationInputTokens?: number
  /** The share of the allowance already spent, or `null` when unmetered. */
  allowancePercent?: number | null
  /** When the allowance refreshes, when metred. */
  allowanceResetAt?: number | null
  /** Which span the allowance meters over. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model the usage belongs to. */
  model: string
  /** Whether the totals include the response currently streaming. */
  streaming?: boolean
}

/** What the `chat:commands` slice exposes. */
export interface ChatCommandsSlice {
  /** Every command the menu offers: shared, host-merged, side-channel. */
  readonly allCommands: ComputedRef<readonly CommandDef[]>
  /** Runs one command by id. */
  readonly executeCommand: (id: CommandId) => Promise<void>
}

/**
 * Builds the `chat:commands` slice.
 *
 * @param ctx - The panel context (every popup, setting and action a command drives).
 * @returns The commands slice.
 */
export function createChatCommands(ctx: ChatCtx): ChatCommandsSlice {
  // The shared command registry UNION any host-provided commands, deduped by id
  // with the host winning, then minus the side-channel commands a client without
  // team messaging may not use.
  const allCommands = computed<readonly CommandDef[]>(() => {
    const extraCommands = ctx.props.extraCommands
    const overridden = new Set((extraCommands ?? []).map((command) => command.id))
    const merged: CommandDef[] = [
      ...COMMANDS.filter((command) => !overridden.has(command.id)),
      ...(extraCommands ?? []),
    ]
    return merged.filter(
      (command) => ctx.props.canSendTeamMessages !== false || !command.sideChannel,
    )
  })

  /**
   * The ids of the host-provided commands that survived the side-channel filter.
   *
   * @returns The set of host command ids.
   */
  const extraCommandIds = (): Set<string> =>
    new Set(
      (ctx.props.extraCommands ?? [])
        .filter((command) => ctx.props.canSendTeamMessages !== false || !command.sideChannel)
        .map((command) => command.id),
    )

  /**
   * Runs one command by id, in React's order: close every sibling popup, take
   * the host path, gate a read-only viewer, then the built-in command's branch.
   *
   * @param id - The command to run.
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
    // Host-provided commands have no client-side branch here — fill the input
    // with the command so the user can add any arguments, then Enter sends it to
    // the host's own handler.
    if (extraCommandIds().has(id)) {
      ctx.input.setInputAndCursorEnd(`/${id} `)
      return
    }
    // A read-only VIEWER may run only viewer-safe commands. Default-deny: an
    // unflagged command is unavailable to viewers.
    if (ctx.props.canEdit === false) {
      const def = allCommands.value.find((command) => command.id === id)
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
        mode: ctx.chat.liveModelMode.value,
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
        mode: ctx.chat.liveModelMode.value,
        text: '',
      })
    } else if (id === 'autocommit') {
      // Prefill so the user types the cadence (seconds); 0 cancels.
      ctx.input.setInputAndCursorEnd('/autocommit ')
    } else if (id === 'help') {
      ctx.composer.setInputValue('')
      // Render the rich, interactive HelpCard variant; the plain-text
      // buildHelpText() stays as the card's `text` so it remains the i18n
      // fallback (and the copy/screen-reader text) if the rich variant is off.
      ctx.systemCards.addSystemCard(
        buildHelpText({
          agentName: ctx.props.agentName ?? DEFAULT_AGENT_NAME,
          productName: ctx.props.productName ?? DEFAULT_PRODUCT_NAME,
        }),
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
        const conversationId = ctx.env.conversationId.value
        const compactUrl = conversationId
          ? `/projects/${ctx.props.projectId}/compact?conversationId=${conversationId}`
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
      const mode = ctx.chat.mode.value
      const newMode = mode === 'plan' ? 'execute' : 'plan'
      ctx.chat.setMode(newMode)
      void ctx.env.http
        .patch(`/projects/${ctx.props.projectId}/chat-mode`, {
          mode: newMode,
          conversationId: ctx.env.conversationId.value,
        })
        .catch((error: unknown) => {
          logger.warn('chat-panel: persisting chat-mode change failed; reverted', { error })
          ctx.chat.setMode(mode)
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
        const conversationId = ctx.env.conversationId.value
        const usageUrl = conversationId
          ? `/projects/${ctx.props.projectId}/chat-usage?conversationId=${conversationId}`
          : `/projects/${ctx.props.projectId}/chat-usage`
        const res = await ctx.env.http.get<ChatUsageResponse>(usageUrl)
        const d = res.data
        const fmt = formatTokenTotal
        // AI usage is shown as a UNITLESS share of the allowance — currency
        // never appears on AI-usage surfaces. The percent is the owner's spend
        // in their CURRENT window, so 100% here IS the block point.
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
        // `inputTokens` counts only the UNCACHED prompt, so show the cached
        // share separately — it is most of the volume in a long agentic turn.
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
        // usage, so say so.
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
        ctx.chat.messages.value,
        ctx.undo.undoneTcIds.value,
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
        // Mark these tool calls as undone so the ToolCallCard icons reflect the state.
        ctx.undo.setUndoneTcIds((previous) => {
          const next = new Set(previous)
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
          ctx.env.t('ide.chat.undoError', undefined, {
            defaultValue: 'Failed to revert changes.',
          }),
        )
      }
    } else if (id === 'commit') {
      ctx.composer.setInputValue('')
      await ctx.git.handleCommit()
    } else if (id === 'test') {
      ctx.composer.setInputValue('')
      // Opens the tests browser, like /scripts — a whole agent turn is no longer
      // spent to read output the platform can run directly.
      ctx.tests.openTestsBrowser('')
    } else if (id === 'explain') {
      ctx.input.setInputAndCursorEnd('/explain ')
    } else if (id === 'lint') {
      ctx.composer.setInputValue('')
      void ctx.chat.sendMessage(
        'Run `npm run lint` in both api/ and app/ workspaces. Report all errors and warnings found and fix them.',
      )
    } else if (id === 'autofix') {
      ctx.composer.setInputValue('')
      const newValue = !ctx.models.autoFixEnabled.value
      try {
        await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
          settings: { autoFix: newValue },
        })
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
      const newValue = !ctx.models.autoApproveCommandsEnabled.value
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
      // Opens the skills browser in a closeable overlay.
      ctx.overlay.openPanelOverlay('skills')
    } else if (id === 'scripts') {
      ctx.composer.setInputValue('')
      // Opens the scripts browser in a closeable overlay.
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
      // `/version` replaces the old command-menu footer version line. `||` (not
      // `??`): the host-supplied version prop can be an EMPTY string, which
      // `??` would NOT fall back on — leaving a bare "v".
      ctx.systemCards.addSystemCard(
        ctx.env.t(
          'ide.chat.version',
          {
            productName: ctx.props.productName ?? DEFAULT_PRODUCT_NAME,
            version: ctx.props.version || APP_VERSION,
          },
          { defaultValue: '{{productName}} v{{version}}' },
        ),
      )
    } else if (id === 'share') {
      ctx.composer.setInputValue('')
      if (ctx.env.shareAllowed.value) ctx.popups.setShareModal({ role: DEFAULT_SHARE_ROLE })
    }
  }

  return {
    allCommands,
    executeCommand,
  }
}
