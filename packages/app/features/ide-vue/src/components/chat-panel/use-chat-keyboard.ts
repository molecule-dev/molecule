/**
 * `chat:keyboard` — the composer's native keydown listener, ported from React's
 * `chat:keyboard` region: the popup navigation, Enter to send, the IME guard.
 *
 * The decisions are `composerKeyAction` from `@molecule/app-ide-panel-logic`; the
 * slice only performs the effect it returns, reading every popup, picker and
 * panel value through the context at call time — what React's `useEffectEvent`
 * wrapper gives its handler (always the latest values, never a stale capture).
 *
 * @module
 */

import { onMounted } from 'vue'

import { composerKeyAction, SOUND_EVENTS, wrapIdx } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect } from './context.js'

/** What the `chat:keyboard` slice exposes. */
export interface ChatKeyboardSlice {
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:keyboard:1` — attaches the native keydown listener. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:keyboard` slice.
 *
 * @param ctx - The panel context (every popup, picker and action a key can reach).
 * @returns The keyboard slice.
 */
export function createChatKeyboard(ctx: ChatCtx): ChatKeyboardSlice {
  /**
   * Handles one keydown on the composer textarea — React's `handleNativeKeyDown`:
   * ask the reducer, suppress the browser default when it says so, then apply
   * the one effect it returned.
   *
   * @param e - The keydown event.
   */
  const handleNativeKeyDown = (e: KeyboardEvent): void => {
    const action = composerKeyAction(e, {
      input: ctx.composer.inputRef.current,
      soundsPicker: ctx.sounds.soundsPicker.value,
      micOpen: ctx.voice.micPicker.value !== null,
      effortPicker: ctx.composer.effortPicker.value,
      effortPickerVisible: ctx.pickers.effortPickerVisible.value,
      modelPicker: ctx.composer.modelPicker.value,
      visibleModels: ctx.pickers.visibleModels.value,
      hasManageCustomModels: Boolean(ctx.props.onManageCustomModels),
      liveMode: ctx.chat.liveModelMode.value,
      overlayOpen: ctx.overlay.panelOverlay.value !== null,
      filePicker: ctx.popups.filePicker.value,
      filteredEntries: ctx.pickers.filteredEntries.value,
      commandMenu: ctx.composer.commandMenu.value,
      filteredCmds: ctx.pickers.filteredCmds.value,
      abortable: ctx.chat.isLoading.value || ctx.chat.isRemoteStreaming.value,
      isFreeTier: ctx.models.isFreeTier.value,
      freeTierModelId: ctx.models.FREE_TIER_MODEL.value,
      models: ctx.models.AVAILABLE_MODELS.value,
      serverModelDefaults: ctx.models.serverModelDefaults.value,
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
                  ctx.pickers.effortPickerVisible.value.length,
                ),
              }
            : null,
        )
        return
      case 'effort-pick':
        void ctx.modelActions.applyEffortLevel(
          effect.mode,
          effect.level,
          ctx.pickers.effortPickerModel.value,
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
                  ctx.pickers.visibleModels.value.length + (ctx.props.onManageCustomModels ? 1 : 0),
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
                  ctx.pickers.filteredEntries.value.length,
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
                selectedIdx: wrapIdx(
                  m.selectedIdx,
                  effect.delta,
                  ctx.pickers.filteredCmds.value.length,
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
      1: () => {
        // Attach native keydown listener directly to the textarea element, once
        // per mount — the element is created by this component's own render.
        onMounted(() => {
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
        })
      },
    },
  }
}
