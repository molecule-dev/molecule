/**
 * React's `chat:keyboard` region of ChatPanel.tsx: the composer's native
 * keydown listener — the popup navigation, Enter to send, Escape's close order
 * and the IME guard.
 *
 * The decision itself is `composerKeyAction` from `@molecule/app-ide-panel-logic`;
 * the slice only performs the effect it returns, reading every popup, picker and
 * panel value through `ctx` at call time — what React's `useEffectEvent`
 * wrapper gives its handler (always the latest values, never a stale capture).
 *
 * @module
 */

import { composerKeyAction, SOUND_EVENTS, wrapIdx } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:keyboard` slice. */
export interface ChatKeyboardSlice {
  /** React's mount I/O for the region: none — the listener is effect 1. */
  mount(): void

  /** React's `#effect chat:keyboard:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Creates the `chat:keyboard` slice.
 *
 * @param ctx - The shared chat context (every popup, picker and action a key
 *   can reach).
 * @returns The keyboard slice with its native-listener effect.
 */
export function createChatKeyboard(ctx: ChatContext): ChatKeyboardSlice {
  /**
   * Handles one keydown on the composer textarea — React's
   * `handleNativeKeyDown`: ask the reducer, suppress the browser default when it
   * says so, then apply the one effect it returned.
   *
   * @param e - The keydown event.
   */
  const handleNativeKeyDown = (e: KeyboardEvent): void => {
    const action = composerKeyAction(e, {
      input: ctx.composer.inputRef.current,
      soundsPicker: ctx.sounds.soundsPicker,
      micOpen: ctx.voice.micPicker !== null,
      effortPicker: ctx.composer.effortPicker,
      effortPickerVisible: ctx.pickers.effortPickerVisible,
      modelPicker: ctx.composer.modelPicker,
      visibleModels: ctx.pickers.visibleModels,
      hasManageCustomModels: Boolean(ctx.props.onManageCustomModels),
      liveMode: ctx.chat.liveModelMode,
      overlayOpen: ctx.overlay.panelOverlay !== null,
      filePicker: ctx.popups.filePicker,
      filteredEntries: ctx.pickers.filteredEntries,
      commandMenu: ctx.composer.commandMenu,
      filteredCmds: ctx.pickers.filteredCmds,
      abortable: ctx.chat.isLoading || ctx.chat.isRemoteStreaming,
      isFreeTier: ctx.models.isFreeTier,
      freeTierModelId: ctx.models.FREE_TIER_MODEL,
      models: ctx.models.AVAILABLE_MODELS,
      serverModelDefaults: ctx.models.serverModelDefaults,
    })
    if (action.preventDefault) e.preventDefault()
    const effect = action.effect
    switch (effect.kind) {
      case 'none':
        return
      case 'close-sounds':
        ctx.sounds.setSoundsPicker(null)
        return
      case 'close-mic':
        ctx.voice.setMicPicker(null)
        return
      case 'close-effort':
        ctx.composer.setEffortPicker(null)
        return
      case 'close-model':
        ctx.composer.setModelPicker(null)
        return
      case 'close-overlay':
        ctx.overlay.setPanelOverlay(null)
        return
      case 'close-file':
        ctx.popups.setFilePicker(null)
        return
      case 'close-command':
        ctx.composer.setCommandMenu(null)
        return
      case 'abort':
        // Same path as the Stop button: kill the stream AND drop the pending
        // automatic follow-ups (deferred auto-fix, verification countdown).
        ctx.chat.handleAbort()
        return
      case 'sounds-move':
        ctx.sounds.setSoundsPicker((s) =>
          s ? { selectedIdx: wrapIdx(s.selectedIdx, effect.delta, SOUND_EVENTS.length + 1) } : null,
        )
        return
      case 'sounds-pick':
        void ctx.sounds.cycleSoundMode(effect.event)
        return
      case 'effort-move':
        ctx.composer.setEffortPicker((p) =>
          p
            ? {
                ...p,
                selectedIdx: wrapIdx(
                  p.selectedIdx,
                  effect.delta,
                  ctx.pickers.effortPickerVisible.length,
                ),
              }
            : null,
        )
        return
      case 'effort-pick':
        void ctx.modelActions.applyEffortLevel(
          effect.mode,
          effect.level,
          ctx.pickers.effortPickerModel,
        )
        return
      case 'model-move':
        ctx.composer.setModelPicker((m) =>
          m
            ? {
                ...m,
                selectedIdx: wrapIdx(
                  m.selectedIdx,
                  effect.delta,
                  ctx.pickers.visibleModels.length + (ctx.props.onManageCustomModels ? 1 : 0),
                ),
              }
            : null,
        )
        return
      case 'model-manage':
        ctx.composer.setModelPicker(null)
        ctx.composer.setInputValue('')
        if (ctx.props.onManageCustomModels) ctx.props.onManageCustomModels({ mode: effect.mode })
        return
      case 'model-pick':
        if (!effect.locked) {
          void ctx.modelActions.selectModel(effect.model.id, effect.model.label, effect.mode)
        }
        return
      case 'file-move':
        ctx.popups.setFilePicker((p) =>
          p
            ? {
                ...p,
                selectedIdx: wrapIdx(
                  p.selectedIdx,
                  effect.delta,
                  ctx.pickers.filteredEntries.length,
                ),
              }
            : null,
        )
        return
      case 'file-pick':
        ctx.mention.selectFileEntry(effect.entry)
        return
      case 'command-move':
        ctx.composer.setCommandMenu((m) =>
          m
            ? {
                ...m,
                selectedIdx: wrapIdx(m.selectedIdx, effect.delta, ctx.pickers.filteredCmds.length),
              }
            : null,
        )
        return
      case 'command-dismiss-submit':
        ctx.composer.setCommandMenu(null)
        void ctx.submit.handleSubmit()
        return
      case 'command-run':
        void ctx.commands.executeCommand(effect.id)
        return
      case 'submit':
        void ctx.submit.handleSubmit()
        return
    }
  }

  return {
    mount(): void {
      // React's region declares the effect event and effect 1, no mount work.
    },
    effects: {
      1: (): void => {
        // Attach native keydown listener directly to the textarea element.
        $effect(() => {
          const ta = ctx.composer.textareaRef.current
          if (!ta) return
          // A key that is part of an IME composition (Enter accepting a Japanese,
          // Chinese or Korean candidate) must reach the input method, not send
          // the message.
          const handler = (e: KeyboardEvent): void => {
            if (e.isComposing || e.keyCode === 229) return
            handleNativeKeyDown(e)
          }
          ta.addEventListener('keydown', handler)
          return () => ta.removeEventListener('keydown', handler)
        })
      },
    },
  }
}
