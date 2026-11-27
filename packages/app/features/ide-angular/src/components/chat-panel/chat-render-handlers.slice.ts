/**
 * React's `chat:render-handlers` region of ChatPanel.tsx (lines 5112–5187):
 * the stable callbacks the render builds attach to lists (`.map` rows, the
 * composer's glyph buttons, the host's tests status), the composer's `@` and
 * `/` glyph handlers, and the two modal handlers.
 *
 * Each stable callback reads its slice at CALL time, which is React's
 * `useStableCallback` guarantee: building a list never captures a function
 * that touches stale state. The two modal handlers are created outside their
 * `reportModal && …` / `shareModal && …` branches, as React does.
 *
 * @module
 */

import { inject, Injectable } from '@angular/core'

import { DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import type { ReportResult } from '@molecule/app-ide-panel-logic'
import { formatReportConfirmation } from '@molecule/app-ide-panel-logic'
import type {
  AddSystemCardOptions,
  CommandId,
  FileEntry,
  ModelMode,
} from '@molecule/app-ide-panel-logic/panels'

import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatMention } from './chat-mention.slice.js'
import { ChatModelActions } from './chat-model-actions.slice.js'
import type { ModelRegion } from './chat-models.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The identifiers other slices and sections read from the `chat:render-handlers` slice. */
export interface ChatRenderHandlersSlice {
  /** React's mount work for the region: none — the region declares callbacks. */
  mount(): void

  /** The list rows' command dispatcher. */
  readonly stableExecuteCommand: (id: CommandId) => Promise<void>
  /** The `@` picker rows' selection handler. */
  readonly stableSelectFileEntry: (entry: FileEntry) => void
  /** The tests status strip's open handler. */
  readonly stableOpenTestsBrowser: (query?: string, runAll?: boolean) => void
  /** The composer glyphs' setter. */
  readonly stableSetInputValue: (value: string) => void
  /** The picker rows' card publisher. */
  readonly stableAddSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** The model picker rows' selection handler. */
  readonly stableSelectModel: (
    modelId: string,
    displayName?: string,
    mode?: ModelMode,
  ) => Promise<void>
  /** The model picker rows' region handler. */
  readonly stableSetModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /** The composer's `@` glyph: inserts a mention at the caret and opens the picker. */
  readonly insertMentionAtCaret: () => void
  /** The composer's `/` glyph: toggles the command menu. */
  readonly toggleSlashMenu: () => void
  /** Closes the report modal. */
  readonly closeReportModal: () => void
  /** Confirms a submitted report with a card. */
  readonly handleReportSubmitted: (result: ReportResult) => void
  /** Closes the share modal. */
  readonly closeShareModal: () => void
}

/**
 * React's `chat:render-handlers` slice: the stable callbacks, the glyph
 * handlers and the modal handlers.
 */
@Injectable()
export class ChatRenderHandlers implements ChatRenderHandlersSlice {
  /** The shared state, read for the props (the product name on the report card). */
  private readonly state = inject(ChatInnerState)

  /** React's mount work for the region: none — the region declares callbacks. */
  mount(): void {
    // No mount I/O in `chat:render-handlers`: React builds callbacks only.
  }

  /**
   * Runs one command by id through the commands slice.
   *
   * @param id - The command's id.
   * @returns A promise that settles once the command finished.
   */
  readonly stableExecuteCommand = (id: CommandId): Promise<void> =>
    this.state.slice(ChatCommands).executeCommand(id)

  /**
   * Stages the picked file as an attachment.
   *
   * @param entry - The picked file entry.
   */
  readonly stableSelectFileEntry = (entry: FileEntry): void =>
    this.state.slice(ChatMention).selectFileEntry(entry)

  /**
   * Opens the `/test` browser through the tests slice.
   *
   * @param query - An optional filter.
   * @param runAll - Whether to start every test.
   */
  readonly stableOpenTestsBrowser = (query?: string, runAll?: boolean): void =>
    this.state.slice(ChatTests).openTestsBrowser(query, runAll)

  /**
   * Writes the composer's text.
   *
   * @param value - The new text.
   */
  readonly stableSetInputValue = (value: string): void =>
    this.state.slice(ChatComposer).setInputValue(value)

  /**
   * Publishes a local inline card.
   *
   * @param text - The card's body.
   * @param options - The variant's own fields.
   */
  readonly stableAddSystemCard = (text: string, options?: AddSystemCardOptions): void =>
    this.state.slice(ChatSystemCards).addSystemCard(text, options)

  /**
   * Selects a model (optionally for one mode only) and persists it.
   *
   * @param modelId - The model's id.
   * @param displayName - The model's display name, when the picker has one.
   * @param mode - The mode to persist the choice for.
   * @returns A promise that settles once the choice is persisted.
   */
  readonly stableSelectModel = (
    modelId: string,
    displayName?: string,
    mode?: ModelMode,
  ): Promise<void> => this.state.slice(ChatModelActions).selectModel(modelId, displayName, mode)

  /**
   * Sets one model's billing region and persists it.
   *
   * @param modelId - The model's id.
   * @param region - The region code.
   * @returns A promise that settles once the choice is persisted.
   */
  readonly stableSetModelRegion = (modelId: string, region: ModelRegion): Promise<void> =>
    this.state.slice(ChatModelActions).setModelRegion(modelId, region)

  /** The composer's `@` glyph: insert a mention at the caret and open the picker. */
  readonly insertMentionAtCaret = (): void => {
    const composer = this.state.slice(ChatComposer)
    const val = composer.inputRef.current
    const pos = composer.textareaRef.current?.selectionStart ?? val.length
    const newVal = val.slice(0, pos) + '@' + val.slice(pos)
    composer.setInputValue(newVal)
    composer.autoResize()
    this.state.slice(ChatPopups).setMentionStart(pos)
    void this.state.slice(ChatMention).openFilePicker('')
    composer.setCommandMenu(null)
    setTimeout(() => {
      const textarea = composer.textareaRef.current
      textarea?.focus()
      textarea?.setSelectionRange(pos + 1, pos + 1)
    }, 0)
  }

  /** The composer's `/` glyph: toggle the menu without clobbering its text. */
  readonly toggleSlashMenu = (): void => {
    // TOGGLE the menu regardless of the composer's current text — never
    // clobbering it. With text present the menu opens in showAll mode; an empty
    // box still gets the type-ahead '/' so filtering-by-typing works.
    const composer = this.state.slice(ChatComposer)
    if (composer.commandMenu()) {
      composer.setCommandMenu(null)
      if (composer.inputRef.current === '/') {
        // Remove the slash this button added on open.
        composer.setInputValue('')
        composer.autoResize()
      }
      setTimeout(() => {
        composer.textareaRef.current?.focus()
      }, 0)
      return
    }
    // Popups are one-at-a-time — close siblings first.
    this.state.slice(ChatVoice).setMicPicker(null)
    composer.setModelPicker(null)
    composer.setEffortPicker(null)
    this.state.slice(ChatSounds).setSoundsPicker(null)
    const cur = composer.inputRef.current
    if (!cur) this.state.slice(ChatInput).setInputAndCursorEnd('/')
    composer.setCommandMenu({
      selectedIdx: -1,
      showAll: cur !== '' && cur !== '/',
      text: cur || '/',
    })
  }

  /** Closes the bug-report modal. */
  readonly closeReportModal = (): void => this.state.slice(ChatPopups).setReportModal(null)

  /**
   * Publishes the confirmation card React's `handleReportSubmitted` adds: the
   * localized result line and, when the server returned one, the issue link.
   *
   * @param result - The submitted report's result.
   */
  readonly handleReportSubmitted = (result: ReportResult): void => {
    this.state.slice(ChatPopups).setReportModal(null)
    const { key, defaultValue } = formatReportConfirmation(result)
    this.state
      .slice(ChatSystemCards)
      .addSystemCard(this.state.env.t(key, { productName: this.productName() }, { defaultValue }), {
        action: result.url
          ? {
              label: this.state.env.t('ide.chat.report.viewIssue', undefined, {
                defaultValue: 'View issue',
              }),
              href: result.url,
            }
          : undefined,
      })
  }

  /** Closes the share modal. */
  readonly closeShareModal = (): void => this.state.slice(ChatPopups).setShareModal(null)

  /**
   * The host product's display name (React's `productName` prop, which
   * `ChatInner` defaults to `the IDE`).
   *
   * @returns The product name.
   */
  private productName(): string {
    return this.state.props().productName ?? DEFAULT_PRODUCT_NAME
  }
}
