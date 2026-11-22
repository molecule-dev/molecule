/**
 * React's `chat:composer` region of ChatPanel.tsx (lines 1047–1166): the
 * uncontrolled composer — the live text in a plain `{ current }` box so typing
 * never re-renders the panel, the persisted draft, the textarea ref, the three
 * pickers that filter by the composer text, and the height / caret helpers.
 *
 * The draft React reads in its `useState` initializer is read once per mount on
 * the panel's mount pass (`ChatInner.ngAfterViewInit`), the first moment the
 * props the draft key derives from are bound — Angular creates a child view
 * before the parent's inputs reach it, so a constructor or render-time read
 * would see the empty props. The value reaches the textarea on the next change
 * detection pass, before the panel reports itself settled.
 *
 * `#effect chat:composer:1` seeds the textarea with the draft and resizes it;
 * `#effect chat:composer:2` focuses it (except on coarse pointers) and puts the
 * caret at the end. Both are mount-only in React, and Angular flushes registered
 * effects before the view exists, so both bodies run in the `mount()` pass at
 * the slice's position in React's mount ledger; the registered entries keep the
 * effects' positions in React's effect order.
 *
 * @module
 */

import { inject, Injectable, Injector, signal } from '@angular/core'

import type { CommandMenu, EffortPicker, ModelPicker } from '@molecule/app-ide-panel-logic/panels'
import { chatDraftStorageKey } from '@molecule/app-ide-panel-logic/panels'

import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The identifiers other slices and sections read from the `chat:composer` slice. */
export interface ChatComposerSlice {
  /**
   * React's mount I/O for the region: both mount-only effects' bodies — read
   * the draft, seed and resize the textarea, then focus it.
   */
  mount(): void

  /** React's `#effect chat:composer:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }

  /** The live composer text — a plain `{ current }` box, so typing never re-renders. */
  readonly inputRef: { current: string }
  /** The sessionStorage key the draft lives under. */
  readonly draftKey: string
  /** The draft the composer started from (React's `initialDraft`). */
  readonly initialDraft: () => string
  /** The command menu's state, as the render reads it. */
  readonly commandMenu: () => CommandMenu | null
  /** Sets the command menu's state. */
  readonly setCommandMenu: ChatSetState<CommandMenu | null>
  /** The model picker's state, as the render reads it. */
  readonly modelPicker: () => ModelPicker | null
  /** Sets the model picker's state. */
  readonly setModelPicker: ChatSetState<ModelPicker | null>
  /** The effort picker's state, as the render reads it. */
  readonly effortPicker: () => EffortPicker | null
  /** Sets the effort picker's state. */
  readonly setEffortPicker: ChatSetState<EffortPicker | null>
  /** Whether the composer holds sendable content. */
  readonly hasInput: () => boolean
  /** Records whether the composer has sendable content. */
  readonly setHasInput: ChatSetState<boolean>
  /** The textarea element. */
  readonly textareaRef: { current: HTMLTextAreaElement | null }
  /** Transcripts the mic inserted into the CURRENT draft. */
  readonly dictatedSnippetsRef: { current: string[] }
  /** The pending draft-persist timer. */
  readonly draftTimerRef: { current: ReturnType<typeof setTimeout> | null }
  /** Drops dictated snippets the user has since deleted. */
  readonly pruneDictatedSnippets: () => void
  /** Auto-resizes the textarea to its content (max 200px). */
  readonly autoResize: () => void
  /** Sets the composer text and every picker's filter. */
  readonly setInputValue: (value: string) => void
  /** Persists the draft (debounced). */
  readonly persistDraft: () => void
}

/**
 * Reads the draft the composer mounts with, exactly as React's state
 * initializer does: the explicit initial value (prompt→chat morph) first, else
 * the persisted draft, else empty when session storage is unavailable.
 *
 * @param draftKey - The sessionStorage key the draft lives under.
 * @param initialInputValue - React's `initialInputValue` prop.
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

/** React's `chat:composer` slice: the uncontrolled composer and its draft. */
@Injectable()
export class ChatComposer implements ChatComposerSlice {
  /** The shared state, read for the props (the project and the viewer capability). */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** The live composer text (React's `inputRef`, seeded with the draft on the mount pass). */
  readonly inputRef: { current: string } = { current: '' }

  /** The draft the composer mounts with, read once (React's `useState` initializer). */
  private readonly draft = signal('')

  /** Whether the draft has been read (its one read per mount). */
  private draftRead = false

  /** The command menu's state, as the render reads it. */
  private readonly commandMenuState = signal<CommandMenu | null>(null)

  /** The model picker's state, as the render reads it. */
  private readonly modelPickerState = signal<ModelPicker | null>(null)

  /** The effort picker's state, as the render reads it. */
  private readonly effortPickerState = signal<EffortPicker | null>(null)

  /** Whether the composer holds sendable content. */
  private readonly hasInputState = signal(false)

  /** The textarea element (React's ref, initial `null`). */
  readonly textareaRef: { current: HTMLTextAreaElement | null } = { current: null }

  /** Transcripts the mic inserted into the CURRENT draft (React's ref, initial `[]`). */
  readonly dictatedSnippetsRef: { current: string[] } = { current: [] }

  /** The pending draft-persist timer (React's ref, initial `null`). */
  readonly draftTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }

  /** The sessionStorage key the draft lives under (React's `chatDraftStorageKey(projectId)`). */
  get draftKey(): string {
    return chatDraftStorageKey(this.state.props().projectId)
  }

  /** The command menu's state, as the render reads it. */
  readonly commandMenu = (): CommandMenu | null => this.commandMenuState()

  /** The model picker's state, as the render reads it. */
  readonly modelPicker = (): ModelPicker | null => this.modelPickerState()

  /** The effort picker's state, as the render reads it. */
  readonly effortPicker = (): EffortPicker | null => this.effortPickerState()

  /** Whether the composer holds sendable content. */
  readonly hasInput = (): boolean => this.hasInputState()

  /** Sets the command menu's state (value or updater). */
  readonly setCommandMenu: ChatSetState<CommandMenu | null> = (next) => {
    this.commandMenuState.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the model picker's state (value or updater). */
  readonly setModelPicker: ChatSetState<ModelPicker | null> = (next) => {
    this.modelPickerState.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the effort picker's state (value or updater). */
  readonly setEffortPicker: ChatSetState<EffortPicker | null> = (next) => {
    this.effortPickerState.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Records whether the composer has sendable content (value or updater). */
  readonly setHasInput: ChatSetState<boolean> = (next) => {
    this.hasInputState.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /**
   * The draft the composer started from (React's `initialDraft`), read once by
   * the composer's mount pass from the props the panel mounted with.
   *
   * @returns The draft the composer mounts with.
   */
  readonly initialDraft = (): string => this.draft()

  /** Drops dictated snippets the user has since deleted. */
  readonly pruneDictatedSnippets = (): void => {
    const snippets = this.dictatedSnippetsRef.current
    if (snippets.length === 0) return
    const value = this.inputRef.current
    this.dictatedSnippetsRef.current = value ? snippets.filter((s) => value.includes(s)) : []
  }

  /** Auto-resizes the textarea to its content (max 200px). */
  readonly autoResize = (): void => {
    const ta = this.textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  /**
   * React's `setInputValue`: updates the ref, the DOM element and the
   * `hasInput` flag without re-rendering the parent.
   *
   * @param val - The composer's new text.
   */
  readonly setInputValue = (val: string): void => {
    this.inputRef.current = val
    // An open picker filters by the new text (a keystroke re-opens its picker itself).
    this.setCommandMenu((m) => (m && m.text !== val ? { ...m, text: val } : m))
    this.setModelPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
    this.setEffortPicker((m) => (m && m.text !== val ? { ...m, text: val } : m))
    this.pruneDictatedSnippets()
    const ta = this.textareaRef.current
    if (ta && ta.value !== val) ta.value = val
    // A viewer's composer is pre-filled with '/teamsay ' — the BARE prefix is
    // not sendable content, so it must not light the Send button.
    const bareSideChannel =
      this.state.props().canEdit === false && /^\/(?:teamsay|t)$/i.test(val.trim())
    this.setHasInput(Boolean(val.trim()) && !bareSideChannel)
    this.autoResize()
    // Clear persisted draft when input is emptied (e.g. on submit)
    if (!val) {
      try {
        sessionStorage.removeItem(this.draftKey)
      } catch (_error) {
        // sessionStorage unavailable — safe to ignore, draft simply persists
      }
    }
  }

  /** React's `persistDraft`: writes the draft to sessionStorage, debounced 500 ms. */
  readonly persistDraft = (): void => {
    if (this.draftTimerRef.current) clearTimeout(this.draftTimerRef.current)
    this.draftTimerRef.current = setTimeout(() => {
      try {
        const v = this.inputRef.current
        if (v) sessionStorage.setItem(this.draftKey, v)
        else sessionStorage.removeItem(this.draftKey)
      } catch (_error) {
        // quota exceeded or sessionStorage unavailable — draft persistence is best-effort
      }
    }, 500)
  }

  /**
   * React's mount I/O for the region, which is both of its effects: read the
   * draft the composer mounts with, seed the textarea and resize it
   * (`#effect chat:composer:1`), then focus it and put the caret at the end
   * (`#effect chat:composer:2`). Angular flushes registered effects before the
   * view's `ngAfterViewInit`, where the textarea does not exist yet, so this
   * pass runs the effects' mount bodies in React's ledger order.
   */
  mount(): void {
    this.readDraft()
    const ta = this.textareaRef.current
    if (ta && this.inputRef.current) {
      // Seed the textarea with the draft value on mount.
      ta.value = this.inputRef.current
      this.autoResize()
    }
    // Focus the input whenever a chat mounts (initial load, "New chat", or a
    // conversation switch — each remounts ChatInner via chatKey) so the user
    // can type immediately. Skipped on coarse pointers: focus there pops the
    // on-screen keyboard over half the workspace uninvited.
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return
    if (!ta) return
    ta.focus()
    // The textarea can mount with content already in it (defaultValue carries a
    // persisted draft, and a viewer's box holds the '/teamsay ' prefill) — a
    // fresh element's selection is (0,0), so without this the caret sits BEFORE
    // the text and typing lands in front of '/teamsay'.
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }

  /**
   * React's two composer effects are mount-only (their dependencies never
   * change after the first run), so their work is the {@link mount} pass above
   * and these entries keep React's positions in the effect ledger.
   */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; performed by `mount()`, before the view exists.
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; performed by `mount()`, before the view exists.
      })
    },
  }

  /**
   * Reads the draft once per mount, the way React's state initializer does,
   * and seeds the live text and the sendable-content flag from it.
   *
   * @returns The draft the composer mounts with.
   */
  private readDraft(): string {
    if (!this.draftRead) {
      this.draftRead = true
      const value = readInitialDraft(this.draftKey, this.state.props().initialInputValue)
      this.draft.set(value)
      this.inputRef.current = value
      this.hasInputState.set(Boolean(value))
    }
    return this.draft()
  }
}
