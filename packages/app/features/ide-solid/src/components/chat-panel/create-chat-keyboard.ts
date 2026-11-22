/**
 * `chat:keyboard` — the composer's native keydown handling (menu navigation,
 * send, IME guard; React's `chat:keyboard` region and its mount effect, ported
 * by unit U17).
 *
 * The decision is framework-neutral (`composerKeyAction` in
 * `@molecule/app-ide-panel-logic`); this slice attaches the listener to the
 * textarea, applies the effect the reducer returns in React's order, and reads
 * every popup and panel value at call time (React's `useEffectEvent`) so the
 * once-registered listener always sees the latest state.
 *
 * @module
 */

import { onCleanup, onMount } from 'solid-js'

import { composerKeyAction, SOUND_EVENTS, wrapIdx } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:keyboard` (nothing yet). */
export interface ChatKeyboardSlice {
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:keyboard`.
 * @param ctx - The inner ctx (every popup and panel value a key reads).
 * @returns The keyboard slice, with its listener effect.
 */
export function createChatKeyboard(ctx: ChatInnerCtx): ChatKeyboardSlice {
  /**
   * Handles one keydown the textarea received, applying the reducer's effect —
   * React's `useEffectEvent` handler, which always reads the latest state.
   * @param event - The native keydown event.
   */
  const handleNativeKeyDown = (event: KeyboardEvent): void => {
    const action = composerKeyAction(event, {
      input: ctx.composer.inputRef.current,
      soundsPicker: ctx.sounds.soundsPicker(),
      micOpen: ctx.voice.micPicker() !== null,
      effortPicker: ctx.composer.effortPicker(),
      effortPickerVisible: ctx.pickers.effortPickerVisible(),
      modelPicker: ctx.composer.modelPicker(),
      visibleModels: ctx.pickers.visibleModels(),
      hasManageCustomModels: Boolean(ctx.props.onManageCustomModels),
      liveMode: ctx.chat.liveModelMode(),
      overlayOpen: ctx.overlay.panelOverlay() !== null,
      filePicker: ctx.popups.filePicker(),
      filteredEntries: ctx.pickers.filteredEntries(),
      commandMenu: ctx.composer.commandMenu(),
      filteredCmds: ctx.pickers.filteredCmds(),
      abortable: ctx.chat.isLoading() || ctx.chat.isRemoteStreaming(),
      isFreeTier: ctx.models.isFreeTier(),
      freeTierModelId: ctx.models.FREE_TIER_MODEL(),
      models: ctx.models.AVAILABLE_MODELS(),
      serverModelDefaults: ctx.models.serverModelDefaults(),
    })
    if (action.preventDefault) event.preventDefault()
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
        ctx.sounds.setSoundsPicker((picker) =>
          picker
            ? {
                selectedIdx: wrapIdx(picker.selectedIdx, effect.delta, SOUND_EVENTS.length + 1),
              }
            : null,
        )
        return
      case 'sounds-pick':
        void ctx.sounds.cycleSoundMode(effect.event)
        return
      case 'effort-move':
        ctx.composer.setEffortPicker((picker) =>
          picker
            ? {
                ...picker,
                selectedIdx: wrapIdx(
                  picker.selectedIdx,
                  effect.delta,
                  ctx.pickers.effortPickerVisible().length,
                ),
              }
            : null,
        )
        return
      case 'effort-pick':
        void ctx.modelActions.applyEffortLevel(
          effect.mode,
          effect.level,
          ctx.pickers.effortPickerModel(),
        )
        return
      case 'model-move':
        ctx.composer.setModelPicker((picker) =>
          picker
            ? {
                ...picker,
                selectedIdx: wrapIdx(
                  picker.selectedIdx,
                  effect.delta,
                  ctx.pickers.visibleModels().length + (ctx.props.onManageCustomModels ? 1 : 0),
                ),
              }
            : null,
        )
        return
      case 'model-manage': {
        ctx.composer.setModelPicker(null)
        ctx.composer.setInputValue('')
        const onManageCustomModels = ctx.props.onManageCustomModels
        if (onManageCustomModels) onManageCustomModels({ mode: effect.mode })
        return
      }
      case 'model-pick':
        if (!effect.locked) {
          void ctx.modelActions.selectModel(effect.model.id, effect.model.label, effect.mode)
        }
        return
      case 'file-move':
        ctx.popups.setFilePicker((picker) =>
          picker
            ? {
                ...picker,
                selectedIdx: wrapIdx(
                  picker.selectedIdx,
                  effect.delta,
                  ctx.pickers.filteredEntries().length,
                ),
              }
            : null,
        )
        return
      case 'file-pick':
        ctx.mention.selectFileEntry(effect.entry)
        return
      case 'command-move':
        ctx.composer.setCommandMenu((menu) =>
          menu
            ? {
                ...menu,
                selectedIdx: wrapIdx(
                  menu.selectedIdx,
                  effect.delta,
                  ctx.pickers.filteredCmds().length,
                ),
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
    effects: {
      // #effect chat:keyboard:1 — attach the native keydown listener to the
      // textarea. A key that is part of an IME composition (Enter accepting a
      // Japanese, Chinese or Korean candidate) must reach the input method.
      1: () => {
        onMount(() => {
          const textarea = ctx.composer.textareaRef.current
          if (!textarea) return
          const handler = (event: KeyboardEvent): void => {
            if (event.isComposing || event.keyCode === 229) return
            handleNativeKeyDown(event)
          }
          textarea.addEventListener('keydown', handler)
          onCleanup(() => textarea.removeEventListener('keydown', handler))
        })
      },
    },
  }
}
