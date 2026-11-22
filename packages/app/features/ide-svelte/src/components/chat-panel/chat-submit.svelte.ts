/**
 * React's `chat:submit` region of ChatPanel.tsx (lines 3959–4432): the one
 * composer submit every send path goes through. It stops dictation, classifies
 * the text with the shared {@link routeComposerSubmit}, and performs the side
 * effects of the route it names — the read-only/team-blocked cards, every
 * locally-handled slash command, a host side-channel note, and a plain message
 * (with its `@`-mentioned files fetched inline and its binary attachments
 * encoded).
 *
 * The classifier is framework-neutral and lives in
 * `@molecule/app-ide-panel-logic`; this slice only orders the effects, exactly
 * as React's branch bodies do. Every value is read through `ctx` at call time,
 * the way React's callback closes over the live state on each render.
 *
 * @module
 */

import type { ChatAttachment } from '@molecule/app-ai-chat'
import type { AppModelDefinition } from '@molecule/app-ai-models'
import { partitionByDeprecation } from '@molecule/app-ai-models'
import { fileToBase64, getChatTimestampsVisible, SHARE_ROLES } from '@molecule/app-ide-panel-logic'
import type { EffortLevel, EffortMode } from '@molecule/app-ide-panel-logic/panels'
import {
  buildFileMentionBlock,
  effortModeStatusLine,
  effortOptionsForModel,
  getTestsBarVisible,
  limitRefusalFromError,
  resolveEffortArg,
  resolveModelQuery,
  routeComposerSubmit,
  setTestsBarVisible,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:submit` slice. */
export interface ChatSubmitSlice {
  /** Sends the composer's text (or runs the slash command it names). */
  readonly handleSubmit: () => Promise<void>

  /** React's mount I/O for the region (none: the region declares a callback only). */
  mount(): void
}

/**
 * Creates the `chat:submit` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The composer submit handler.
 */
export function createChatSubmit(ctx: ChatContext): ChatSubmitSlice {
  /**
   * Routes the composer's text and performs the side effects of its route.
   *
   * @returns A promise that settles once the route's effects (any request or
   *   send it makes) have been issued.
   */
  const handleSubmit = async (): Promise<void> => {
    // Stop voice recognition on submit
    ctx.voice.dictation.stopForSubmit()

    const route = routeComposerSubmit(ctx.composer.inputRef.current, {
      transcriptOnly: ctx.env.transcriptOnly,
      attachedCount: ctx.popups.attachedFiles.length,
      canEdit: ctx.props.canEdit ?? true,
      canSendTeamMessages: ctx.canSendTeamMessages,
      allCommands: ctx.commands.allCommands,
      extraCommands: ctx.props.extraCommands,
      readTestsBarVisible: getTestsBarVisible,
    })

    switch (route.kind) {
      case 'ignored':
        return
      case 'team-blocked':
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.teamMessagesUnavailable', undefined, {
            defaultValue: 'Team messaging is unavailable in this workspace.',
          }),
        )
        return
      case 'viewer-blocked':
        ctx.composer.setInputValue('')
        ctx.systemCards.addSystemCard(
          ctx.env.t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          }),
        )
        return
      case 'autofix':
        void ctx.commands.executeCommand('autofix')
        return
      case 'autoapprove':
        void ctx.commands.executeCommand('autoapprove')
        return
      case 'sounds':
        ctx.composer.setInputValue('')
        // Sounds owns the popup region exclusively — close any open panel overlay.
        ctx.overlay.setPanelOverlay(null)
        ctx.sounds.setSoundsPicker({ selectedIdx: -1 })
        return
      case 'tests-bar':
        ctx.composer.setInputValue('')
        setTestsBarVisible(route.visible)
        ctx.systemCards.addSystemCard(
          route.visible
            ? ctx.env.t('ide.chat.testsBarShown', undefined, { defaultValue: 'Tests bar shown.' })
            : ctx.env.t('ide.chat.testsBarHidden', undefined, {
                defaultValue: 'Tests bar hidden.',
              }),
        )
        return
      case 'timestamps':
        ctx.composer.setInputValue('')
        if (route.command.action === 'invalid') {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.timestampsUsage', undefined, {
              defaultValue: 'Usage: /timestamps [on | off]',
            }),
          )
        } else {
          ctx.prefs.applyTimestampsVisible(
            route.command.action === 'toggle'
              ? !getChatTimestampsVisible()
              : route.command.action === 'on',
          )
        }
        return
      case 'settings':
        void ctx.commands.executeCommand('settings')
        return
      case 'skills':
        ctx.composer.setInputValue('')
        ctx.overlay.openPanelOverlay('skills', route.query)
        return
      case 'scripts':
        ctx.composer.setInputValue('')
        ctx.overlay.openPanelOverlay('scripts', route.query)
        return
      case 'tests':
        ctx.composer.setInputValue('')
        ctx.tests.openTestsBrowser(route.query, route.runAll)
        return
      case 'run-script':
        ctx.composer.setInputValue('')
        if (!route.name) {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.scripts.runUsage', undefined, {
              defaultValue: 'Usage: /run <name> — run a saved script. Use /scripts to see them.',
            }),
          )
        } else {
          void ctx.scripts.runSavedScript(route.name, route.params)
        }
        return
      case 'report':
        ctx.composer.setInputValue('')
        ctx.popups.setReportModal({ title: route.title })
        return
      case 'share':
        ctx.composer.setInputValue('')
        if (!ctx.env.shareAllowed) {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.share.notAllowed', undefined, {
              defaultValue: 'Managing share links needs an admin role on this project.',
            }),
          )
          return
        }
        if (route.command.kind === 'invalid') {
          ctx.systemCards.addSystemCard(
            ctx.env.t(
              'ide.chat.share.usage',
              { roles: SHARE_ROLES.join(', ') },
              {
                defaultValue:
                  'Usage: /share [role] — create a public link. Roles: {{roles}} (default viewer).',
              },
            ),
          )
        } else {
          ctx.popups.setShareModal({ role: route.command.role })
        }
        return
      case 'autocommit':
        ctx.composer.setInputValue('')
        if (route.seconds === null) {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.autoCommit.usage', undefined, {
              defaultValue:
                'Usage: /autocommit <seconds> — auto-commit that many seconds after the last file change. /autocommit 0 cancels.',
            }),
          )
        } else if (route.seconds <= 0) {
          ctx.autoCommit.dispatchAutoCommit({ type: 'set', seconds: 0 })
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.autoCommit.cancelled', undefined, {
              defaultValue: 'Auto-commit cancelled.',
            }),
          )
        } else {
          ctx.autoCommit.dispatchAutoCommit({ type: 'set', seconds: route.seconds })
          ctx.systemCards.addSystemCard(
            ctx.env.t(
              'ide.chat.autoCommit.enabled',
              { seconds: route.seconds },
              {
                defaultValue:
                  'Auto-commit on: committing {{seconds}}s after the last file change.\nSet to 0 to disable autocommit.',
              },
            ),
          )
        }
        return
      case 'model-mode':
        ctx.composer.setInputValue('')
        // Model picker owns the popup region exclusively — close any open overlay.
        ctx.overlay.setPanelOverlay(null)
        ctx.composer.setModelPicker({ selectedIdx: -1, mode: route.mode, text: '' })
        return
      case 'mic':
        ctx.composer.setInputValue('')
        ctx.overlay.setPanelOverlay(null)
        ctx.composer.setCommandMenu(null)
        ctx.composer.setModelPicker(null)
        ctx.composer.setEffortPicker(null)
        ctx.sounds.setSoundsPicker(null)
        ctx.voice.setMicPicker({ autoStart: false })
        return
      case 'model': {
        const query = route.query
        if (!query) {
          // Examples come from the live catalog, never the translation: model
          // ids are not translatable, and a hardcoded list goes stale the day a
          // newer generation ships.
          const examples = partitionByDeprecation(ctx.models.AVAILABLE_MODELS)
            .current.slice(0, 3)
            .map((model) => model.id)
            .join(', ')
          ctx.systemCards.addSystemCard(
            ctx.env.t(
              'ide.chat.modelUsage',
              { examples },
              { defaultValue: 'Usage: /model <model-name>  (e.g. {{examples}})' },
            ),
          )
        } else {
          // Resolve partial name to closest model
          const resolved = resolveModelQuery(query, ctx.models.AVAILABLE_MODELS)
          const name = resolved?.id ?? query
          // Block free-tier users from selecting paid models. Custom
          // (bring-your-own AI) models are exempt on every tier — the user pays
          // their own provider directly.
          if (
            ctx.models.isFreeTier &&
            name !== ctx.models.FREE_TIER_MODEL &&
            resolved?.provider !== 'custom'
          ) {
            ctx.systemCards.addSystemCard(
              ctx.env.t(
                'ide.chat.modelUpgradeRequired',
                { model: resolved?.label ?? name },
                { defaultValue: '{{model}} is available on Pro. Upgrade to access all models.' },
              ),
              // The upgrade/sign-in button(s) are the host's (its own routes/copy).
              { action: ctx.props.buildUpgradeCta?.({}) ?? undefined },
            )
          } else {
            // Unscoped /model targets the CURRENT conversation mode (discovery =
            // plan), same as /effort — never the legacy both-modes chatModel.
            await ctx.modelActions.selectModel(
              name,
              resolved?.label ?? name,
              ctx.chat.liveModelMode,
            )
          }
        }
        ctx.composer.setInputValue('')
        ctx.composer.setModelPicker(null)
        return
      }
      case 'effort': {
        const effortCmd = route.command
        ctx.composer.setInputValue('')
        // Bare /effort (or a bare --plan/--execute flag) opens the selectable
        // level picker — same interaction as bare /model. The picker lists the
        // target mode's model's own levels; its mode dropdown re-scopes in place.
        if (effortCmd.kind === 'menu') {
          ctx.overlay.setPanelOverlay(null)
          ctx.composer.setCommandMenu(null)
          ctx.composer.setModelPicker(null)
          ctx.sounds.setSoundsPicker(null)
          ctx.voice.setMicPicker(null)
          ctx.composer.setEffortPicker({
            selectedIdx: -1,
            mode: effortCmd.mode ?? ctx.chat.liveModelMode,
            text: ctx.composer.inputRef.current,
          })
          return
        }
        // Resolve the model a given mode will actually use — mirrors the /model
        // picker + slash-suffix resolveModeModel logic (P2-10: each mode's
        // options come from ITS model's reasoning capabilities).
        const modelForMode = (mode: EffortMode): AppModelDefinition | undefined => {
          return ctx.models.AVAILABLE_MODELS.find(
            (model) => model.id === ctx.models.effectiveModelForMode(mode),
          )
        }
        const effectiveEffort = (mode: EffortMode): EffortLevel | undefined =>
          ctx.models.effortByMode[mode] ?? (ctx.models.effortLevel || undefined)
        const modeStatusLine = (mode: EffortMode): string =>
          effortModeStatusLine(ctx.env.t, mode, modelForMode(mode), effectiveEffort(mode))
        // Unscoped commands target the CURRENT conversation mode.
        const targetMode: EffortMode =
          (effortCmd.kind !== 'invalid' && effortCmd.mode) || ctx.chat.mode
        const targetModel = modelForMode(targetMode)
        const targetOptions = effortOptionsForModel(targetModel)
        const targetModelLabel = targetModel?.label ?? '?'
        if (effortCmd.kind === 'invalid') {
          ctx.systemCards.addSystemCard(
            ctx.env.t('ide.chat.effort.usage', undefined, {
              defaultValue:
                'Usage: /effort <level> (current mode), /effort --plan|--execute <level>, /effort ? for status.',
            }),
          )
        } else if (effortCmd.kind === 'query') {
          ctx.systemCards.addSystemCard(
            [
              ctx.env.t('ide.chat.effort.header', undefined, {
                defaultValue: 'Reasoning effort per mode:',
              }),
              modeStatusLine('plan'),
              modeStatusLine('execute'),
            ].join('\n'),
          )
        } else {
          if (targetOptions.length === 0) {
            // Nothing to tune on this mode's model (fixed reasoning) — say so
            // instead of persisting a level that cannot take effect (P2-10).
            ctx.systemCards.addSystemCard(
              ctx.env.t(
                'ide.chat.effort.fixedForModel',
                { mode: targetMode, model: targetModelLabel },
                {
                  defaultValue:
                    'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
                },
              ),
            )
            return
          }
          const level = resolveEffortArg(effortCmd.arg, targetOptions)
          if (level === null) {
            // Unknown value — the model doesn't offer it. Reject and name what IS
            // available (P2-10).
            ctx.systemCards.addSystemCard(
              ctx.env.t(
                'ide.chat.effort.notSupportedForModel',
                {
                  level: effortCmd.arg,
                  model: targetModelLabel,
                  levels: targetOptions.map((option) => option.value).join(', '),
                },
                { defaultValue: "{{level}} isn't available for {{model}}. Available: {{levels}}" },
              ),
            )
            return
          }
          await ctx.modelActions.applyEffortLevel(targetMode, level, targetModel)
        }
        return
      }
      case 'max-loops': {
        const loops = route.loops
        try {
          await ctx.env.http.patch(ctx.chat.settingsPatchUrl(), {
            settings: { maxToolLoops: loops },
          })
          ctx.models.setCurrentMaxLoops(loops)
          ctx.systemCards.addSystemCard(
            ctx.env.t(
              'ide.chat.maxLoopsSet',
              { n: loops },
              { defaultValue: 'Max tool iterations set to {{n}}' },
            ),
          )
        } catch (error) {
          const refusal = limitRefusalFromError(error)
          if (refusal?.limitType === 'max_tool_loops') {
            ctx.systemCards.addSystemCard(
              refusal.error ??
                ctx.env.t('ide.chat.maxLoopsReached', undefined, {
                  defaultValue: 'Max loops limit reached.',
                }),
              // Host owns the upgrade/sign-in button(s); forward the backend's
              // whole description of the refusal — `requiresSignup`, the
              // `limitType` that fired, the `billingAction` remedy it resolved,
              // and `upgradeTier` (null = no higher plan) — so the host picks the
              // right one instead of defaulting to "Upgrade".
              {
                action:
                  ctx.props.buildUpgradeCta?.({
                    requiresSignup: refusal.requiresSignup,
                    limitType: refusal.limitType,
                    billingAction: refusal.billingAction,
                    upgradeTier: refusal.upgradeTier,
                  }) ?? undefined,
              },
            )
          } else {
            ctx.systemCards.addSystemCard(
              ctx.env.t('ide.chat.maxLoopsError', undefined, {
                defaultValue: 'Failed to update max tool iterations.',
              }),
            )
          }
        }
        ctx.composer.setInputValue('')
        return
      }
      case 'explain':
        ctx.composer.setInputValue('')
        void ctx.chat.sendMessage(route.prompt)
        return
      case 'lint':
        ctx.composer.setInputValue('')
        void ctx.chat.sendMessage(route.prompt)
        return
      case 'side-channel':
        // The sent note must not survive as a draft: the keystroke-debounced
        // persistDraft already holds the full "/teamsay …" text, and the viewer
        // re-prefill below is non-empty so setInputValue never clears it — a
        // reload then reopened the already-SENT message in the composer. Cancel
        // any pending draft write and drop the stored draft; the mount prefill
        // recreates the bare prefix.
        if (ctx.composer.draftTimerRef.current) clearTimeout(ctx.composer.draftTimerRef.current)
        try {
          sessionStorage.removeItem(ctx.composer.draftKey)
        } catch (_error) {
          /* sessionStorage unavailable — draft persistence is best-effort */
        }
        // A viewer's composer is the team-chat box — re-fill the /teamsay
        // prefix after each sent team message so the next one is one keystroke
        // away.
        if (ctx.props.canEdit === false) ctx.input.setInputAndCursorEnd('/teamsay ')
        else ctx.composer.setInputValue('')
        // sideChannel: a team note is a human-to-human message, not a turn — it
        // goes out immediately even while a turn streams (it used to queue
        // silently behind the sender's own active turn, and a viewer's note used
        // to tear down their remote-turn tracking).
        void ctx.chat.sendMessage(route.message, undefined, {
          suppressUserMessage: true,
          sideChannel: true,
        })
        return
      case 'send': {
        let message = route.message
        const chatAttachments: ChatAttachment[] = []

        const attachedFiles = ctx.popups.attachedFiles
        if (attachedFiles.length > 0) {
          for (const f of attachedFiles) {
            if (f.path && !f.file) {
              // @-mentioned sandbox text file — fetch and embed inline
              // Strip leading / so the path annotation matches what the AI's
              // read_file tool expects
              const displayPath = f.path.startsWith('/') ? f.path.slice(1) : f.path
              const ext = f.path.split('.').pop() ?? ''
              try {
                const res = await ctx.env.http.get<{ content: string }>(
                  `/projects/${ctx.props.projectId}/files${f.path}`,
                )
                message =
                  (message ? `${message}\n\n` : '') +
                  buildFileMentionBlock(displayPath, ext, res.data.content)
              } catch (_error) {
                // File unreadable (sandbox not responding, permission error,
                // etc.) — include a placeholder so the AI still sees which file
                // was intended
                message =
                  (message ? `${message}\n\n` : '') + buildFileMentionBlock(displayPath, ext, null)
              }
            } else if (f.file) {
              // Binary file attachment — encode as base64
              const data = await fileToBase64(f.file)
              chatAttachments.push({
                mediaType: f.mediaType,
                data,
                filename: f.filename,
                size: f.size,
              })
            }
          }
        }

        // A send still carrying dictated text — any mic-button transcript
        // survived the live prune — is flagged `viaDictation` so history badges
        // it with the mic. Checked against the FINAL text (after /explain etc.
        // rewrites it, the synthesized prompt is not what was dictated, so no
        // badge). The list is consumed here; setInputValue('') below prunes it
        // anyway.
        const viaDictation = ctx.composer.dictatedSnippetsRef.current.some((snippet) =>
          message.includes(snippet),
        )
        ctx.composer.dictatedSnippetsRef.current = []
        ctx.composer.setInputValue('')
        ctx.popups.setAttachedFiles([])
        ctx.popups.setAttachmentError(null)
        void ctx.chat.sendMessage(
          message,
          chatAttachments.length > 0 ? chatAttachments : undefined,
          viaDictation ? { viaDictation: true } : undefined,
        )
        return
      }
    }
  }

  return {
    handleSubmit,
    mount(): void {
      // React's region declares a callback only; there is no mount I/O to repeat.
    },
  }
}
