/**
 * React's `chat:keyboard` region of ChatPanel.tsx (lines 4738–4880): the native
 * `keydown` listener on the composer textarea and the key reducer's effects.
 *
 * The decision itself is shared — `composerKeyAction` from
 * `@molecule/app-ide-panel-logic` returns what one key does for the open
 * popups, and this slice only applies the effect it names, in React's order.
 * React wraps the handler in `useEffectEvent`, so the listener always calls the
 * latest version; this slice reads every value at event time through
 * `ChatInnerState.slice`, which is the same guarantee.
 *
 * `#effect chat:keyboard:1` is mount-only in React: it attaches the listener to
 * the textarea element, so the work is the {@link ChatKeyboard.mount} pass at
 * this slice's position in the mount ledger, and the registered entry keeps
 * React's position in the effect ledger. The IME guard runs both where React
 * puts it — before the reducer, and again inside `composerKeyAction`.
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector } from '@angular/core'

import type { ComposerKeyState } from '@molecule/app-ide-panel-logic/panels'
import { composerKeyAction, SOUND_EVENTS, wrapIdx } from '@molecule/app-ide-panel-logic/panels'

import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatMention } from './chat-mention.slice.js'
import { ChatModelActions } from './chat-model-actions.slice.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatSubmit } from './chat-submit.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The identifiers other slices and sections read from the `chat:keyboard` slice. */
export interface ChatKeyboardSlice {
  /** React's mount I/O for the region: attach the textarea's `keydown` listener. */
  mount(): void

  /** React's `#effect chat:keyboard:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * React's `chat:keyboard` slice: the composer's native `keydown` listener and
 * the effects the key reducer's decision names.
 */
@Injectable()
export class ChatKeyboard implements ChatKeyboardSlice {
  /** The shared state, read for the props and the slice lookup at call time. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the effect in. */
  private readonly injector = inject(Injector)

  /** The panel's destroy hook, which drops the listener React's cleanup removes. */
  private readonly destroyRef = inject(DestroyRef)

  /** Removes the listener the current mount attached, when one is attached. */
  private removeKeyListener: (() => void) | null = null

  /** Drops the listener on destroy, as React's effect cleanup does on unmount. */
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.removeKeyListener?.()
      this.removeKeyListener = null
    })
  }

  /** React's `#effect chat:keyboard:<n>` entry points, at React's positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; attached by `mount()`.
      })
    },
  }

  /**
   * React's mount I/O for the region: attach the `keydown` listener to the
   * composer textarea, skipping a key that is part of an IME composition.
   */
  mount(): void {
    const ta = this.state.slice(ChatComposer).textareaRef.current
    if (!ta) return
    const handler = (event: KeyboardEvent): void => {
      // A key that is part of an IME composition (Enter accepting a Japanese,
      // Chinese or Korean candidate) must reach the input method, not send the
      // message.
      if (event.isComposing || event.keyCode === 229) return
      this.handleNativeKeyDown(event)
    }
    ta.addEventListener('keydown', handler)
    this.removeKeyListener = (): void => ta.removeEventListener('keydown', handler)
  }

  /**
   * React's `handleNativeKeyDown`: decides what the key does against the live
   * popup state, prevents the browser default when the reducer says so, then
   * applies the named effect.
   *
   * @param event - The composer textarea's keydown event.
   */
  private handleNativeKeyDown(event: KeyboardEvent): void {
    const props = this.state.props()
    const composer = this.state.slice(ChatComposer)
    const sounds = this.state.slice(ChatSounds)
    const voice = this.state.slice(ChatVoice)
    const pickers = this.state.slice(ChatPickers)
    const models = this.state.slice(ChatModels)
    const chat = this.state.slice(ChatChat)
    const popups = this.state.slice(ChatPopups)
    const overlay = this.state.slice(ChatOverlay)
    const modelActions = this.state.slice(ChatModelActions)
    const mention = this.state.slice(ChatMention)
    const commands = this.state.slice(ChatCommands)
    const submit = this.state.slice(ChatSubmit)

    const state: ComposerKeyState = {
      input: composer.inputRef.current,
      soundsPicker: sounds.soundsPicker(),
      micOpen: voice.micPicker() !== null,
      effortPicker: composer.effortPicker(),
      effortPickerVisible: pickers.effortPickerVisible(),
      modelPicker: composer.modelPicker(),
      visibleModels: pickers.visibleModels(),
      hasManageCustomModels: Boolean(props.onManageCustomModels),
      liveMode: chat.liveModelMode(),
      overlayOpen: overlay.panelOverlay() !== null,
      filePicker: popups.filePicker(),
      filteredEntries: pickers.filteredEntries(),
      commandMenu: composer.commandMenu(),
      filteredCmds: pickers.filteredCmds(),
      abortable: chat.isLoading() || chat.isRemoteStreaming(),
      isFreeTier: models.isFreeTier(),
      freeTierModelId: models.FREE_TIER_MODEL(),
      models: models.AVAILABLE_MODELS(),
      serverModelDefaults: models.serverModelDefaults(),
    }

    const action = composerKeyAction(event, state)
    if (action.preventDefault) event.preventDefault()
    const effect = action.effect
    switch (effect.kind) {
      case 'none':
        return
      case 'close-sounds':
        sounds.setSoundsPicker(null)
        return
      case 'close-mic':
        voice.setMicPicker(null)
        return
      case 'close-effort':
        composer.setEffortPicker(null)
        return
      case 'close-model':
        composer.setModelPicker(null)
        return
      case 'close-overlay':
        overlay.setPanelOverlay(null)
        return
      case 'close-file':
        popups.setFilePicker(null)
        return
      case 'close-command':
        composer.setCommandMenu(null)
        return
      case 'abort':
        // Same path as the Stop button: kill the stream AND drop the pending
        // automatic follow-ups (deferred auto-fix, verification countdown).
        chat.handleAbort()
        return
      case 'sounds-move':
        sounds.setSoundsPicker((s) =>
          s ? { selectedIdx: wrapIdx(s.selectedIdx, effect.delta, SOUND_EVENTS.length + 1) } : null,
        )
        return
      case 'sounds-pick':
        void sounds.cycleSoundMode(effect.event)
        return
      case 'effort-move':
        composer.setEffortPicker((p) =>
          p
            ? {
                ...p,
                selectedIdx: wrapIdx(
                  p.selectedIdx,
                  effect.delta,
                  pickers.effortPickerVisible().length,
                ),
              }
            : null,
        )
        return
      case 'effort-pick':
        void modelActions.applyEffortLevel(effect.mode, effect.level, pickers.effortPickerModel())
        return
      case 'model-move':
        composer.setModelPicker((m) =>
          m
            ? {
                ...m,
                selectedIdx: wrapIdx(
                  m.selectedIdx,
                  effect.delta,
                  pickers.visibleModels().length + (props.onManageCustomModels ? 1 : 0),
                ),
              }
            : null,
        )
        return
      case 'model-manage':
        composer.setModelPicker(null)
        composer.setInputValue('')
        if (props.onManageCustomModels) props.onManageCustomModels({ mode: effect.mode })
        return
      case 'model-pick':
        if (!effect.locked) {
          void modelActions.selectModel(effect.model.id, effect.model.label, effect.mode)
        }
        return
      case 'file-move':
        popups.setFilePicker((p) =>
          p
            ? {
                ...p,
                selectedIdx: wrapIdx(p.selectedIdx, effect.delta, pickers.filteredEntries().length),
              }
            : null,
        )
        return
      case 'file-pick':
        mention.selectFileEntry(effect.entry)
        return
      case 'command-move':
        composer.setCommandMenu((m) =>
          m
            ? {
                ...m,
                selectedIdx: wrapIdx(m.selectedIdx, effect.delta, pickers.filteredCmds().length),
              }
            : null,
        )
        return
      case 'command-dismiss-submit':
        composer.setCommandMenu(null)
        void submit.handleSubmit()
        return
      case 'command-run':
        void commands.executeCommand(effect.id)
        return
      case 'submit':
        void submit.handleSubmit()
        return
    }
  }
}
