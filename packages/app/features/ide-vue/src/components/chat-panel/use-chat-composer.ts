/**
 * `chat:composer` — the uncontrolled composer, ported from React's
 * `chat:composer` region: the live value in `inputRef` (never a controlled
 * binding), the persisted draft, the textarea ref, the pickers that filter by
 * the composer text, and the input's height / caret helpers.
 *
 * React keeps the live text in a `useRef` so typing never re-renders the panel;
 * this slice keeps it in a plain `{ current }` object for the same reason. The
 * only reactive state is what React declares with `useState`: the three filter
 * pickers and the sendable-content flag. The draft is read from
 * `sessionStorage` in React's state initializer, so it is read here when the
 * slice is created — before any mount effect, in React's order.
 *
 * @module
 */

import { onMounted, type Ref, ref } from 'vue'

import type { CommandMenu, EffortPicker, ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { chatDraftStorageKey } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/**
 * Reads the draft the composer mounts with, exactly as React's state
 * initializer does: the explicit initial value (prompt→chat morph) first, else
 * the persisted draft, else empty when session storage is unavailable.
 *
 * @param draftKey - The sessionStorage key the draft lives under.
 * @param initialInputValue - The explicit value React's `initialInputValue` prop carries.
 * @returns The draft to start with.
 */
function readInitialDraft(draftKey: string, initialInputValue: string | undefined): string {
  if (initialInputValue) return initialInputValue
  try {
    return sessionStorage.getItem(draftKey) ?? ''
  } catch (_error) {
    // sessionStorage unavailable (e.g. private browsing restrictions) — fall back to empty
    return ''
  }
}

/** What the `chat:composer` slice exposes. */
export interface ChatComposerSlice {
  /** The live composer text — a plain ref, so typing never re-renders the panel. */
  readonly inputRef: MutableRef<string>
  /**
   * The value the textarea's last change saw — React's uncontrolled-input value
   * tracker, which a programmatic write through `setInputValue` also moves, so
   * the `change` a blur fires after one is not handled a second time.
   */
  readonly trackedInputValue: MutableRef<string>
  /** Sets the composer text and every picker's filter. */
  readonly setInputValue: (value: string) => void
  /** Transcripts the mic inserted into the CURRENT draft. */
  readonly dictatedSnippetsRef: MutableRef<string[]>
  /** Auto-resizes the textarea to its content (max 200px). */
  readonly autoResize: () => void
  /** The command menu's state. */
  readonly setCommandMenu: SetState<CommandMenu | null>
  /** The model picker's state. */
  readonly setModelPicker: SetState<ModelPicker | null>
  /** The effort picker's state. */
  readonly setEffortPicker: SetState<EffortPicker | null>
  /** Drops dictated snippets the user has since deleted. */
  readonly pruneDictatedSnippets: () => void
  /** Records whether the composer has sendable content. */
  readonly setHasInput: SetState<boolean>
  /** Persists the draft (debounced). */
  readonly persistDraft: () => void
  /** The textarea element. */
  readonly textareaRef: MutableRef<HTMLTextAreaElement | null>
  /** The pending draft-persist timer. */
  readonly draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null>
  /** The sessionStorage key the draft lives under. */
  readonly draftKey: string
  /** The draft the composer mounts with, read once. */
  readonly initialDraft: Ref<string>
  /** The command menu's state, as the render reads it. */
  readonly commandMenu: Ref<CommandMenu | null>
  /** The model picker's state, as the render reads it. */
  readonly modelPicker: Ref<ModelPicker | null>
  /** The effort picker's state, as the render reads it. */
  readonly effortPicker: Ref<EffortPicker | null>
  /** Whether the composer holds sendable content. */
  readonly hasInput: Ref<boolean>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:composer:1` — seeds the textarea with the draft. */
    readonly 1: ChatEffect
    /** `#effect chat:composer:2` — focuses the textarea and puts the caret at the end. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:composer` slice.
 *
 * @param ctx - The panel context (the draft key is the project's).
 * @returns The composer slice.
 */
export function createChatComposer(ctx: ChatCtx): ChatComposerSlice {
  const draftKey = chatDraftStorageKey(ctx.props.projectId)
  const initialDraft = ref(readInitialDraft(draftKey, ctx.props.initialInputValue))
  const inputRef: MutableRef<string> = { current: initialDraft.value }
  // React's uncontrolled-input value tracker: whatever value the DOM node was
  // last given, by a native change or by React writing the element.
  const trackedInputValue: MutableRef<string> = { current: initialDraft.value }
  const commandMenu = ref<CommandMenu | null>(null)
  const modelPicker = ref<ModelPicker | null>(null)
  const effortPicker = ref<EffortPicker | null>(null)
  const hasInput = ref(Boolean(initialDraft.value))
  const textareaRef: MutableRef<HTMLTextAreaElement | null> = { current: null }
  const dictatedSnippetsRef: MutableRef<string[]> = { current: [] }
  const draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }
  const setCommandMenu = makeSetter(commandMenu)
  const setModelPicker = makeSetter(modelPicker)
  const setEffortPicker = makeSetter(effortPicker)
  const setHasInput = makeSetter(hasInput)

  /**
   * Drops transcripts no longer present in the draft (called on every edit).
   */
  const pruneDictatedSnippets = (): void => {
    const snippets = dictatedSnippetsRef.current
    if (snippets.length === 0) return
    const value = inputRef.current
    dictatedSnippetsRef.current = value ? snippets.filter((s) => value.includes(s)) : []
  }

  /**
   * Auto-resizes the textarea to fit its content (max 200px).
   */
  const autoResize = (): void => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  /**
   * Updates the ref, the DOM element and the hasInput flag without
   * re-rendering the parent.
   *
   * @param val - The composer's new text.
   */
  const setInputValue = (val: string): void => {
    inputRef.current = val
    // An open picker filters by the new text (a keystroke re-opens its picker itself).
    setCommandMenu((m) => (m && m.text !== val ? { ...m, text: val } : m))
    setModelPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
    setEffortPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
    pruneDictatedSnippets()
    const ta = textareaRef.current
    if (ta && ta.value !== val) ta.value = val
    // The DOM tracker follows the element's value, so a programmatic write
    // moves it too — a blur `change` for the same text is then a no-op.
    trackedInputValue.current = val
    // A viewer's composer is pre-filled with '/teamsay ' — the BARE prefix is
    // not sendable content, so it must not light the Send button.
    const bareSideChannel = ctx.props.canEdit === false && /^\/(?:teamsay|t)$/i.test(val.trim())
    setHasInput(Boolean(val.trim()) && !bareSideChannel)
    autoResize()
    // Clear persisted draft when input is emptied (e.g. on submit)
    if (!val) {
      try {
        sessionStorage.removeItem(draftKey)
      } catch (_error) {
        // sessionStorage unavailable — safe to ignore, draft simply persists
      }
    }
  }

  /**
   * Persists the draft text to sessionStorage so it survives a refresh
   * (debounced by 500 ms, exactly as React's timer is).
   */
  const persistDraft = (): void => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const v = inputRef.current
        if (v) sessionStorage.setItem(draftKey, v)
        else sessionStorage.removeItem(draftKey)
      } catch (_error) {
        // quota exceeded or sessionStorage unavailable — draft persistence is best-effort
      }
    }, 500)
  }

  return {
    inputRef,
    trackedInputValue,
    setInputValue,
    dictatedSnippetsRef,
    autoResize,
    setCommandMenu,
    setModelPicker,
    setEffortPicker,
    pruneDictatedSnippets,
    setHasInput,
    persistDraft,
    textareaRef,
    draftTimerRef,
    draftKey,
    initialDraft,
    commandMenu,
    modelPicker,
    effortPicker,
    hasInput,
    effects: {
      1: () => {
        // Seed the textarea with the draft value on mount.
        onMounted(() => {
          const ta = textareaRef.current
          if (ta && inputRef.current) {
            ta.value = inputRef.current
            autoResize()
          }
        })
      },
      2: () => {
        // Focus the input whenever a chat mounts (initial load, "New chat", or a
        // conversation switch — each remounts ChatInner via chatKey) so the user
        // can type immediately. Skipped on coarse pointers: focus there pops the
        // on-screen keyboard over half the workspace uninvited.
        onMounted(() => {
          if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
            return
          }
          const ta = textareaRef.current
          if (!ta) return
          ta.focus()
          // The textarea can mount with content already in it (defaultValue
          // carries a persisted draft, and a viewer's box holds the '/teamsay '
          // prefill) — a fresh element's selection is (0,0), so without this the
          // caret sits BEFORE the text and typing lands in front of '/teamsay'.
          ta.setSelectionRange(ta.value.length, ta.value.length)
        })
      },
    },
  }
}
