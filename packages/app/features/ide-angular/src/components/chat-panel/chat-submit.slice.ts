/**
 * React's `chat:submit` region of ChatPanel.tsx (lines 3959–4432): sending the
 * composer's content, or running the slash command it names.
 *
 * `routeComposerSubmit` (from `@molecule/app-ide-panel-logic`) fixes the order
 * of the checks — transcript-only and empty submits, the team-message gate, the
 * read-only viewer gate, every locally-handled slash command, the side-channel
 * send, and finally a plain message — and is side-effect free. Every side
 * effect (clearing the composer, publishing a system card, opening a picker,
 * sending the message) happens here, for the one route it classified, in
 * React's order. Slices are looked up through the shared state at call time,
 * exactly as React's callback reads its dependencies, so the cycles between
 * this region and the others stay cycles.
 *
 * @module
 */

import { inject, Injectable } from '@angular/core'

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

import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatModelActions } from './chat-model-actions.slice.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatPrefs } from './chat-prefs.slice.js'
import { ChatScripts } from './chat-scripts.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The identifiers other slices and sections read from the `chat:submit` slice. */
export interface ChatSubmitSlice {
  /** React's mount I/O for the region (the region declares none). */
  mount(): void

  /** Submits the composer's current content. */
  readonly handleSubmit: () => Promise<void>
}

/** React's `chat:submit` slice: the composer's one send path. */
@Injectable()
export class ChatSubmit implements ChatSubmitSlice {
  /** The shared state, read for the props, the env and every slice at call time. */
  private readonly state = inject(ChatInnerState)

  /** React's mount I/O for the region: the region declares no mount work. */
  mount(): void {
    // `chat:submit` has no mount I/O: it is one callback over the other slices.
  }

  /**
   * Sends the composer's content, or runs the slash command it names, in
   * React's order: stop dictation, classify, then perform that route's effects.
   *
   * @returns A promise that settles once the route's async work (a file read,
   *   an attachment encode, a model or effort selection) completes.
   */
  readonly handleSubmit = async (): Promise<void> => {
    const props = this.state.props()
    const env = this.state.env
    const composer = this.state.slice(ChatComposer)
    const popups = this.state.slice(ChatPopups)
    const systemCards = this.state.slice(ChatSystemCards)
    const chat = this.state.slice(ChatChat)
    const commands = this.state.slice(ChatCommands)
    const prefs = this.state.slice(ChatPrefs)
    const overlay = this.state.slice(ChatOverlay)
    const sounds = this.state.slice(ChatSounds)
    const voice = this.state.slice(ChatVoice)
    const tests = this.state.slice(ChatTests)
    const scripts = this.state.slice(ChatScripts)
    const models = this.state.slice(ChatModels)
    const modelActions = this.state.slice(ChatModelActions)
    const autoCommit = this.state.slice(ChatAutoCommit)
    const input = this.state.slice(ChatInput)
    const t = env.t

    // Stop voice recognition on submit
    voice.dictation.stopForSubmit()

    const route = routeComposerSubmit(composer.inputRef.current, {
      transcriptOnly: env.transcriptOnly(),
      attachedCount: popups.attachedFiles().length,
      canEdit: props.canEdit,
      canSendTeamMessages: props.canSendTeamMessages ?? true,
      allCommands: commands.allCommands(),
      extraCommands: props.extraCommands,
      readTestsBarVisible: getTestsBarVisible,
    })

    switch (route.kind) {
      case 'ignored':
        return
      case 'team-blocked':
        systemCards.addSystemCard(
          t('ide.chat.teamMessagesUnavailable', undefined, {
            defaultValue: 'Team messaging is unavailable in this workspace.',
          }),
        )
        return
      case 'viewer-blocked':
        composer.setInputValue('')
        systemCards.addSystemCard(
          t('ide.chat.viewerReadOnly', undefined, {
            defaultValue:
              "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
          }),
        )
        return
      case 'autofix':
        void commands.executeCommand('autofix')
        return
      case 'autoapprove':
        void commands.executeCommand('autoapprove')
        return
      case 'sounds':
        composer.setInputValue('')
        // Sounds owns the popup region exclusively — close any open panel overlay.
        overlay.setPanelOverlay(null)
        sounds.setSoundsPicker({ selectedIdx: -1 })
        return
      case 'tests-bar':
        composer.setInputValue('')
        setTestsBarVisible(route.visible)
        systemCards.addSystemCard(
          route.visible
            ? t('ide.chat.testsBarShown', undefined, { defaultValue: 'Tests bar shown.' })
            : t('ide.chat.testsBarHidden', undefined, { defaultValue: 'Tests bar hidden.' }),
        )
        return
      case 'timestamps':
        composer.setInputValue('')
        if (route.command.action === 'invalid') {
          systemCards.addSystemCard(
            t('ide.chat.timestampsUsage', undefined, {
              defaultValue: 'Usage: /timestamps [on | off]',
            }),
          )
        } else {
          prefs.applyTimestampsVisible(
            route.command.action === 'toggle'
              ? !getChatTimestampsVisible()
              : route.command.action === 'on',
          )
        }
        return
      case 'settings':
        void commands.executeCommand('settings')
        return
      case 'skills':
        composer.setInputValue('')
        overlay.openPanelOverlay('skills', route.query)
        return
      case 'scripts':
        composer.setInputValue('')
        overlay.openPanelOverlay('scripts', route.query)
        return
      case 'tests':
        composer.setInputValue('')
        tests.openTestsBrowser(route.query, route.runAll)
        return
      case 'run-script':
        composer.setInputValue('')
        if (!route.name) {
          systemCards.addSystemCard(
            t('ide.chat.scripts.runUsage', undefined, {
              defaultValue: 'Usage: /run <name> — run a saved script. Use /scripts to see them.',
            }),
          )
        } else {
          void scripts.runSavedScript(route.name, route.params)
        }
        return
      case 'report':
        composer.setInputValue('')
        popups.setReportModal({ title: route.title })
        return
      case 'share':
        composer.setInputValue('')
        if (!env.shareAllowed()) {
          systemCards.addSystemCard(
            t('ide.chat.share.notAllowed', undefined, {
              defaultValue: 'Managing share links needs an admin role on this project.',
            }),
          )
          return
        }
        if (route.command.kind === 'invalid') {
          systemCards.addSystemCard(
            t(
              'ide.chat.share.usage',
              { roles: SHARE_ROLES.join(', ') },
              {
                defaultValue:
                  'Usage: /share [role] — create a public link. Roles: {{roles}} (default viewer).',
              },
            ),
          )
        } else {
          popups.setShareModal({ role: route.command.role })
        }
        return
      case 'autocommit':
        composer.setInputValue('')
        if (route.seconds === null) {
          systemCards.addSystemCard(
            t('ide.chat.autoCommit.usage', undefined, {
              defaultValue:
                'Usage: /autocommit <seconds> — auto-commit that many seconds after the last file change. /autocommit 0 cancels.',
            }),
          )
        } else if (route.seconds <= 0) {
          autoCommit.dispatchAutoCommit({ type: 'set', seconds: 0 })
          systemCards.addSystemCard(
            t('ide.chat.autoCommit.cancelled', undefined, {
              defaultValue: 'Auto-commit cancelled.',
            }),
          )
        } else {
          autoCommit.dispatchAutoCommit({ type: 'set', seconds: route.seconds })
          systemCards.addSystemCard(
            t(
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
        composer.setInputValue('')
        // Model picker owns the popup region exclusively — close any open overlay.
        overlay.setPanelOverlay(null)
        composer.setModelPicker({ selectedIdx: -1, mode: route.mode, text: '' })
        return
      case 'mic':
        composer.setInputValue('')
        overlay.setPanelOverlay(null)
        composer.setCommandMenu(null)
        composer.setModelPicker(null)
        composer.setEffortPicker(null)
        sounds.setSoundsPicker(null)
        voice.setMicPicker({ autoStart: false })
        return
      case 'model': {
        const query = route.query
        if (!query) {
          // Examples come from the live catalog, never the translation: model ids
          // are not translatable, and a hardcoded list goes stale the day a newer
          // generation ships.
          const examples = partitionByDeprecation(models.AVAILABLE_MODELS())
            .current.slice(0, 3)
            .map((model) => model.id)
            .join(', ')
          systemCards.addSystemCard(
            t(
              'ide.chat.modelUsage',
              { examples },
              { defaultValue: 'Usage: /model <model-name>  (e.g. {{examples}})' },
            ),
          )
        } else {
          // Resolve partial name to closest model
          const resolved = resolveModelQuery(query, models.AVAILABLE_MODELS())
          const name = resolved?.id ?? query
          // Block free-tier users from selecting paid models. Custom
          // (bring-your-own AI) models are exempt on every tier — the user pays
          // their own provider directly.
          if (
            models.isFreeTier() &&
            name !== models.FREE_TIER_MODEL() &&
            resolved?.provider !== 'custom'
          ) {
            systemCards.addSystemCard(
              t(
                'ide.chat.modelUpgradeRequired',
                { model: resolved?.label ?? name },
                { defaultValue: '{{model}} is available on Pro. Upgrade to access all models.' },
              ),
              // The upgrade/sign-in button(s) are the host's (its own routes/copy).
              { action: props.buildUpgradeCta?.({}) ?? undefined },
            )
          } else {
            // Unscoped /model targets the CURRENT conversation mode (discovery =
            // plan), same as /effort — never the legacy both-modes chatModel.
            await modelActions.selectModel(name, resolved?.label ?? name, chat.liveModelMode())
          }
        }
        composer.setInputValue('')
        composer.setModelPicker(null)
        return
      }
      case 'effort': {
        const effortCmd = route.command
        composer.setInputValue('')
        // Bare /effort (or a bare --plan/--execute flag) opens the selectable
        // level picker — same interaction as bare /model. The picker lists the
        // target mode's model's own levels; its mode dropdown re-scopes in place.
        if (effortCmd.kind === 'menu') {
          overlay.setPanelOverlay(null)
          composer.setCommandMenu(null)
          composer.setModelPicker(null)
          sounds.setSoundsPicker(null)
          voice.setMicPicker(null)
          composer.setEffortPicker({
            selectedIdx: -1,
            mode: effortCmd.mode ?? chat.liveModelMode(),
            text: composer.inputRef.current,
          })
          return
        }
        // Resolve the model a given mode will actually use — mirrors the /model
        // picker + slash-suffix resolveModeModel logic (P2-10: each mode's
        // options come from ITS model's reasoning capabilities).
        const modelForMode = (m: EffortMode): AppModelDefinition | undefined => {
          return models
            .AVAILABLE_MODELS()
            .find((model) => model.id === models.effectiveModelForMode(m))
        }
        const effectiveEffort = (m: EffortMode): EffortLevel | undefined =>
          models.effortByMode()[m] ?? (models.effortLevel() || undefined)
        const modeStatusLine = (m: EffortMode): string =>
          effortModeStatusLine(t, m, modelForMode(m), effectiveEffort(m))
        // Unscoped commands target the CURRENT conversation mode.
        const targetMode: EffortMode =
          (effortCmd.kind !== 'invalid' && effortCmd.mode) || chat.mode()
        const targetModel = modelForMode(targetMode)
        const targetOptions = effortOptionsForModel(targetModel)
        const targetModelLabel = targetModel?.label ?? '?'
        if (effortCmd.kind === 'invalid') {
          systemCards.addSystemCard(
            t('ide.chat.effort.usage', undefined, {
              defaultValue:
                'Usage: /effort <level> (current mode), /effort --plan|--execute <level>, /effort ? for status.',
            }),
          )
        } else if (effortCmd.kind === 'query') {
          systemCards.addSystemCard(
            [
              t('ide.chat.effort.header', undefined, {
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
            systemCards.addSystemCard(
              t(
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
            systemCards.addSystemCard(
              t(
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
          await modelActions.applyEffortLevel(targetMode, level, targetModel)
        }
        return
      }
      case 'max-loops': {
        const n = route.loops
        try {
          await env.http.patch(chat.settingsPatchUrl(), { settings: { maxToolLoops: n } })
          models.setCurrentMaxLoops(n)
          systemCards.addSystemCard(
            t('ide.chat.maxLoopsSet', { n }, { defaultValue: 'Max tool iterations set to {{n}}' }),
          )
        } catch (error) {
          const refusal = limitRefusalFromError(error)
          if (refusal?.limitType === 'max_tool_loops') {
            systemCards.addSystemCard(
              refusal.error ??
                t('ide.chat.maxLoopsReached', undefined, {
                  defaultValue: 'Max loops limit reached.',
                }),
              // Host owns the upgrade/sign-in button(s); forward the backend's whole
              // description of the refusal — `requiresSignup`, the `limitType` that
              // fired, the `billingAction` remedy it resolved, and `upgradeTier`
              // (null = no higher plan) — so the host picks the right one instead of
              // defaulting to "Upgrade".
              {
                action:
                  props.buildUpgradeCta?.({
                    requiresSignup: refusal.requiresSignup,
                    limitType: refusal.limitType,
                    billingAction: refusal.billingAction,
                    upgradeTier: refusal.upgradeTier,
                  }) ?? undefined,
              },
            )
          } else {
            systemCards.addSystemCard(
              t('ide.chat.maxLoopsError', undefined, {
                defaultValue: 'Failed to update max tool iterations.',
              }),
            )
          }
        }
        composer.setInputValue('')
        return
      }
      case 'explain':
        composer.setInputValue('')
        void chat.sendMessage(route.prompt)
        return
      case 'lint':
        composer.setInputValue('')
        void chat.sendMessage(route.prompt)
        return
      case 'side-channel':
        // The sent note must not survive as a draft: the keystroke-debounced
        // persistDraft already holds the full "/teamsay …" text, and the viewer
        // re-prefill below is non-empty so setInputValue never clears it — a
        // reload then reopened the already-SENT message in the composer. Cancel
        // any pending draft write and drop the stored draft; the mount prefill
        // recreates the bare prefix.
        if (composer.draftTimerRef.current) clearTimeout(composer.draftTimerRef.current)
        try {
          sessionStorage.removeItem(composer.draftKey)
        } catch (_error) {
          /* sessionStorage unavailable — draft persistence is best-effort */
        }
        // A viewer's composer is the team-chat box — re-fill the /teamsay prefix
        // after each sent team message so the next one is one keystroke away.
        if (props.canEdit === false) input.setInputAndCursorEnd('/teamsay ')
        else composer.setInputValue('')
        // sideChannel: a team note is a human-to-human message, not a turn — it
        // goes out immediately even while a turn streams (it used to queue
        // silently behind the sender's own active turn, and a viewer's note
        // used to tear down their remote-turn tracking).
        void chat.sendMessage(route.message, undefined, {
          suppressUserMessage: true,
          sideChannel: true,
        })
        return
      case 'send': {
        let message = route.message
        const chatAttachments: ChatAttachment[] = []

        if (popups.attachedFiles().length > 0) {
          for (const f of popups.attachedFiles()) {
            if (f.path && !f.file) {
              // @-mentioned sandbox text file — fetch and embed inline
              // Strip leading / so the path annotation matches what the AI's read_file tool expects
              const displayPath = f.path.startsWith('/') ? f.path.slice(1) : f.path
              const ext = f.path.split('.').pop() ?? ''
              try {
                const res = await env.http.get<{ content: string }>(
                  `/projects/${props.projectId}/files${f.path}`,
                )
                message =
                  (message ? `${message}\n\n` : '') +
                  buildFileMentionBlock(displayPath, ext, res.data.content)
              } catch (_error) {
                // File unreadable (sandbox not responding, permission error, etc.) — include a
                // placeholder so the AI still sees which file was intended
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

        // A send still carrying dictated text — any mic-button transcript survived
        // the live prune — is flagged `viaDictation` so history badges it with the
        // mic. Checked against the FINAL text (after /explain etc. rewrites it, the
        // synthesized prompt is not what was dictated, so no badge). The list is
        // consumed here; setInputValue('') below prunes it anyway.
        const viaDictation = composer.dictatedSnippetsRef.current.some((snippet) =>
          message.includes(snippet),
        )
        composer.dictatedSnippetsRef.current = []
        composer.setInputValue('')
        popups.setAttachedFiles([])
        popups.setAttachmentError(null)
        void chat.sendMessage(
          message,
          chatAttachments.length > 0 ? chatAttachments : undefined,
          viaDictation ? { viaDictation: true } : undefined,
        )
        return
      }
    }
  }
}
