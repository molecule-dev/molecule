/**
 * React's `chat:composer` region of ChatPanel.tsx (lines 1047–1166): the
 * uncontrolled textarea's value, the draft it mounts with and the debounced
 * sessionStorage persistence, the three input-parsing pickers the composer text
 * filters (`/command`, `/model`, `/effort`), and the send button's `hasInput`
 * gate.
 *
 * The textarea is uncontrolled to avoid re-rendering the whole ChatInner on
 * every keystroke: `inputRef` holds the live value and `hasInput` is the only
 * reactive cell the send button reads. `initialDraft` is read once at creation
 * (React's `useState` initializer) and seeds the element; the live text is
 * `inputRef`.
 *
 * @module
 */

import type { CommandMenu, EffortPicker, ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { chatDraftStorageKey } from '@molecule/app-ide-panel-logic/panels'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:composer` slice. */
export interface ChatComposerSlice {
  /** The sessionStorage key of the conversation's draft. */
  readonly draftKey: string
  /** The draft the composer mounts with, read once. */
  readonly initialDraft: string
  /** The textarea's current value (uncontrolled: a ref, not a state cell). */
  readonly inputRef: MutableRef<string>
  /** The slash-command menu, or null when closed. */
  readonly commandMenu: CommandMenu | null
  /** Opens, moves or closes the command menu. */
  readonly setCommandMenu: ChatSetState<CommandMenu | null>
  /** The `/model` picker, or null when closed. */
  readonly modelPicker: ModelPicker | null
  /** Opens, moves or closes the model picker. */
  readonly setModelPicker: ChatSetState<ModelPicker | null>
  /** The `/effort` picker, or null when closed. */
  readonly effortPicker: EffortPicker | null
  /** Opens, moves or closes the effort picker. */
  readonly setEffortPicker: ChatSetState<EffortPicker | null>
  /** Whether the composer holds non-blank text (the send button's gate). */
  readonly hasInput: boolean
  /** Sets the send button's gate. */
  readonly setHasInput: ChatSetState<boolean>
  /** The textarea element. */
  readonly textareaRef: MutableRef<HTMLTextAreaElement | null>
  /** The dictation transcripts still present in the draft. */
  readonly dictatedSnippetsRef: MutableRef<string[]>
  /** Drops transcripts no longer present in the draft. */
  readonly pruneDictatedSnippets: () => void
  /** Resizes the textarea to fit its content (max 200px). */
  readonly autoResize: () => void
  /** Replaces the composer text. */
  readonly setInputValue: (value: string) => void
  /** The debounce timer of the draft's sessionStorage write. */
  readonly draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null>
  /** Persists the draft to sessionStorage. */
  readonly persistDraft: () => void

  /** React's mount I/O for the region (none: the region declares state only). */
  mount(): void

  /** React's `#effect chat:composer:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Creates the `chat:composer` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The composer's value, pickers, gates and React's two mount effects.
 */
export function createChatComposer(ctx: ChatContext): ChatComposerSlice {
  /** The sessionStorage key for the current project (React recomputes it per render). */
  const readDraftKey = (): string => chatDraftStorageKey(ctx.props.projectId)

  // The draft the composer mounts with, read once. An explicit initial value
  // (prompt→chat morph) wins over the persisted draft.
  const readInitialDraft = (): string => {
    if (ctx.props.initialInputValue) return ctx.props.initialInputValue
    try {
      return sessionStorage.getItem(readDraftKey()) ?? ''
    } catch (_error) {
      // sessionStorage unavailable (e.g. private browsing restrictions) — fall back to empty
      return ''
    }
  }
  const initialDraft = readInitialDraft()

  /** React's `inputRef` — the uncontrolled textarea's value. */
  const inputRef: MutableRef<string> = { current: initialDraft }
  /** React's `textareaRef` — the uncontrolled textarea element. */
  const textareaRef: MutableRef<HTMLTextAreaElement | null> = { current: null }
  /** React's `dictatedSnippetsRef` — the transcripts still in the draft. */
  const dictatedSnippetsRef: MutableRef<string[]> = { current: [] }
  /** React's `draftTimerRef` — the draft-persist debounce timer. */
  const draftTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }

  let commandMenu = $state.raw<CommandMenu | null>(null)
  let modelPicker = $state.raw<ModelPicker | null>(null)
  let effortPicker = $state.raw<EffortPicker | null>(null)
  let hasInput = $state<boolean>(Boolean(initialDraft))

  const setCommandMenu: ChatSetState<CommandMenu | null> = (value): void => {
    commandMenu = resolveState(commandMenu, value)
  }
  const setModelPicker: ChatSetState<ModelPicker | null> = (value): void => {
    modelPicker = resolveState(modelPicker, value)
  }
  const setEffortPicker: ChatSetState<EffortPicker | null> = (value): void => {
    effortPicker = resolveState(effortPicker, value)
  }
  const setHasInput: ChatSetState<boolean> = (value): void => {
    hasInput = resolveState(hasInput, value)
  }

  /** Drop transcripts no longer present in the draft (called on every edit). */
  const pruneDictatedSnippets = (): void => {
    const snippets = dictatedSnippetsRef.current
    if (snippets.length === 0) return
    const value = inputRef.current
    dictatedSnippetsRef.current = value ? snippets.filter((s) => value.includes(s)) : []
  }

  /** Auto-resize the textarea to fit its content (max 200px). */
  const autoResize = (): void => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  /** Update the ref, the DOM element, and the hasInput flag without a render. */
  const setInputValue = (val: string): void => {
    inputRef.current = val
    // An open picker filters by the new text (a keystroke re-opens its picker itself).
    setCommandMenu((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    setModelPicker((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    setEffortPicker((menu) => (menu && menu.text !== val ? { ...menu, text: val } : menu))
    pruneDictatedSnippets()
    const ta = textareaRef.current
    if (ta && ta.value !== val) ta.value = val
    // A viewer's composer is pre-filled with '/teamsay ' — the BARE prefix is
    // not sendable content, so it must not light the Send button.
    const bareSideChannel = ctx.props.canEdit === false && /^\/(?:teamsay|t)$/i.test(val.trim())
    setHasInput(Boolean(val.trim()) && !bareSideChannel)
    autoResize()
    // Clear persisted draft when input is emptied (e.g. on submit)
    if (!val) {
      try {
        sessionStorage.removeItem(readDraftKey())
      } catch (_error) {
        /* sessionStorage unavailable — safe to ignore, draft simply persists */
      }
    }
  }

  /** Persist draft text to sessionStorage so it survives refresh (debounced). */
  const persistDraft = (): void => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const value = inputRef.current
        if (value) sessionStorage.setItem(readDraftKey(), value)
        else sessionStorage.removeItem(readDraftKey())
      } catch (_error) {
        /* quota exceeded or sessionStorage unavailable — draft persistence is best-effort */
      }
    }, 500)
  }

  return {
    get draftKey(): string {
      return readDraftKey()
    },
    initialDraft,
    inputRef,
    get commandMenu(): CommandMenu | null {
      return commandMenu
    },
    setCommandMenu,
    get modelPicker(): ModelPicker | null {
      return modelPicker
    },
    setModelPicker,
    get effortPicker(): EffortPicker | null {
      return effortPicker
    },
    setEffortPicker,
    get hasInput(): boolean {
      return hasInput
    },
    setHasInput,
    textareaRef,
    dictatedSnippetsRef,
    pruneDictatedSnippets,
    autoResize,
    setInputValue,
    draftTimerRef,
    persistDraft,
    mount(): void {
      // React's region declares state only; there is no mount I/O to repeat.
    },
    effects: {
      1: (): void => {
        // Seed the textarea with the draft value on mount.
        $effect(() => {
          const ta = textareaRef.current
          if (ta && inputRef.current) {
            ta.value = inputRef.current
            autoResize()
          }
        })
      },
      2: (): void => {
        // Focus the input whenever a chat mounts (initial load, "New chat", or a
        // conversation switch — each remounts ChatInner) so the user can type
        // immediately. Skipped on coarse pointers: focus there pops the
        // on-screen keyboard over half the workspace uninvited.
        $effect(() => {
          if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
            return
          }
          const ta = textareaRef.current
          if (!ta) return
          ta.focus()
          // The textarea can mount with content already in it — a fresh
          // element's selection is (0,0), so without this the caret sits BEFORE
          // the text and typing lands in front of the prefill.
          ta.setSelectionRange(ta.value.length, ta.value.length)
        })
      },
    },
  }
}
