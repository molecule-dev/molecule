/**
 * `chat:composer` — the composer's draft, its uncontrolled text value, and the
 * three pickers that filter by it (React's `chat:composer` region and its two
 * mount effects, ported by unit P4).
 *
 * The textarea is uncontrolled so typing never re-renders the panel: the live
 * text lives in `inputRef`, a plain `{ current }` holder, and only what React
 * declares with `useState` — the three filter pickers and the sendable-content
 * flag — is reactive here. The draft the composer mounts with is read where
 * React's `useState` initializer reads it (while the slice is created), from the
 * explicit initial value, else sessionStorage, else empty.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createSignal, onMount } from 'solid-js'

import type { CommandMenu, EffortPicker, ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { chatDraftStorageKey } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:composer`. */
export interface ChatComposerSlice {
  /** The sessionStorage key of the conversation's draft. */
  draftKey: Accessor<string>
  /** The draft the composer mounts with, read once. */
  initialDraft: Accessor<string>
  /** The textarea's current value (uncontrolled: a ref, not a signal). */
  inputRef: MutableRef<string>
  /** The slash-command menu, or null when closed. */
  commandMenu: Accessor<CommandMenu | null>
  /** Opens, moves or closes the command menu. */
  setCommandMenu: Setter<CommandMenu | null>
  /** The `/model` picker, or null when closed. */
  modelPicker: Accessor<ModelPicker | null>
  /** Opens, moves or closes the model picker. */
  setModelPicker: Setter<ModelPicker | null>
  /** The `/effort` picker, or null when closed. */
  effortPicker: Accessor<EffortPicker | null>
  /** Opens, moves or closes the effort picker. */
  setEffortPicker: Setter<EffortPicker | null>
  /** Whether the composer holds non-blank text (the send button's gate). */
  hasInput: Accessor<boolean>
  /** Sets the send button's gate. */
  setHasInput: Setter<boolean>
  /** The textarea element. */
  textareaRef: MutableRef<HTMLTextAreaElement | null>
  /**
   * The value the input handler last saw. React's value tracker watches every
   * assignment to the node's `value` (a programmatic clear included), so a
   * keystroke after a command rewrote the box still counts as a change; this
   * ref is updated by both the input handler and {@link setInputValue}.
   */
  trackedInputValueRef: MutableRef<string>
  /** The dictation transcripts still present in the draft. */
  dictatedSnippetsRef: MutableRef<string[]>
  /** Drops transcripts no longer present in the draft. */
  pruneDictatedSnippets: () => void
  /** Resizes the textarea to fit its content (max 200px). */
  autoResize: () => void
  /** Replaces the composer text. */
  setInputValue: (value: string) => void
  /** The debounce timer that persists the draft to sessionStorage. */
  draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null>
  /** Persists the draft to sessionStorage. */
  persistDraft: () => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
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

/**
 * Creates `chat:composer`.
 * @param ctx - The inner ctx (its props carry the project and the initial value).
 * @returns The composer slice.
 */
export function createChatComposer(ctx: ChatInnerCtx): ChatComposerSlice {
  const draftKey = (): string => chatDraftStorageKey(ctx.props.projectId)
  // Read once, where React's `useState` initializer reads it.
  const initialDraftValue = readInitialDraft(draftKey(), ctx.props.initialInputValue)
  const inputRef: MutableRef<string> = { current: initialDraftValue }
  const [commandMenu, setCommandMenu] = createSignal<CommandMenu | null>(null)
  const [modelPicker, setModelPicker] = createSignal<ModelPicker | null>(null)
  const [effortPicker, setEffortPicker] = createSignal<EffortPicker | null>(null)
  const [hasInput, setHasInput] = createSignal(Boolean(initialDraftValue))
  const textareaRef: MutableRef<HTMLTextAreaElement | null> = { current: null }
  const trackedInputValueRef: MutableRef<string> = { current: initialDraftValue }
  const dictatedSnippetsRef: MutableRef<string[]> = { current: [] }
  const draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }

  /** Drops transcripts no longer present in the draft (called on every edit). */
  const pruneDictatedSnippets = (): void => {
    const snippets = dictatedSnippetsRef.current
    if (snippets.length === 0) return
    const value = inputRef.current
    dictatedSnippetsRef.current = value ? snippets.filter((snippet) => value.includes(snippet)) : []
  }

  /** Auto-resizes the textarea to fit its content (max 200px). */
  const autoResize = (): void => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  /**
   * Updates the ref, the DOM element and the `hasInput` flag without
   * re-rendering the parent.
   * @param val - The composer's new text.
   */
  const setInputValue = (val: string): void => {
    inputRef.current = val
    // An open picker filters by the new text (a keystroke re-opens its picker itself).
    setCommandMenu((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    setModelPicker((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    setEffortPicker((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    pruneDictatedSnippets()
    const ta = textareaRef.current
    if (ta && ta.value !== val) ta.value = val
    // React's value tracker sees a programmatic assignment too, so the next
    // keystroke still reaches the input handler.
    trackedInputValueRef.current = val
    // A viewer's composer is pre-filled with '/teamsay ' — the BARE prefix is
    // not sendable content, so it must not light the Send button.
    const bareSideChannel = ctx.props.canEdit === false && /^\/(?:teamsay|t)$/i.test(val.trim())
    setHasInput(Boolean(val.trim()) && !bareSideChannel)
    autoResize()
    // Clear persisted draft when input is emptied (e.g. on submit)
    if (!val) {
      try {
        sessionStorage.removeItem(draftKey())
      } catch (_error) {
        // sessionStorage unavailable — safe to ignore, draft simply persists
      }
    }
  }

  /** Persists the draft text to sessionStorage so it survives refresh (debounced). */
  const persistDraft = (): void => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const value = inputRef.current
        if (value) sessionStorage.setItem(draftKey(), value)
        else sessionStorage.removeItem(draftKey())
      } catch (_error) {
        // quota exceeded or sessionStorage unavailable — draft persistence is best-effort
      }
    }, 500)
  }

  return {
    draftKey,
    initialDraft: () => initialDraftValue,
    inputRef,
    commandMenu,
    setCommandMenu,
    modelPicker,
    setModelPicker,
    effortPicker,
    setEffortPicker,
    hasInput,
    setHasInput,
    textareaRef,
    trackedInputValueRef,
    dictatedSnippetsRef,
    pruneDictatedSnippets,
    autoResize,
    setInputValue,
    draftTimerRef,
    persistDraft,
    effects: {
      // #effect chat:composer:1 — seed the textarea with the draft value on mount.
      1: () => {
        onMount(() => {
          const ta = textareaRef.current
          if (ta && inputRef.current) {
            ta.value = inputRef.current
            autoResize()
          }
        })
      },
      // #effect chat:composer:2 — focus the input whenever a chat mounts (initial
      // load, "New chat", or a conversation switch — each remounts ChatInner via
      // chatKey) so the user can type immediately. Skipped on coarse pointers:
      // focus there pops the on-screen keyboard over half the workspace uninvited.
      2: () => {
        onMount(() => {
          if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
            return
          }
          const ta = textareaRef.current
          if (!ta) return
          ta.focus()
          // The textarea can mount with content already in it (the draft seeds
          // the element, and a viewer's box holds the '/teamsay ' prefill) — a
          // fresh element's selection is (0,0), so without this the caret sits
          // BEFORE the text and typing lands in front of '/teamsay'.
          ta.setSelectionRange(ta.value.length, ta.value.length)
        })
      },
    },
  }
}
