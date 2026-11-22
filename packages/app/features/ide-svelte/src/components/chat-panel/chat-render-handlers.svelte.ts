/**
 * React's `chat:render-handlers` region of ChatPanel.tsx (lines 5112–5187):
 * the stable callbacks the rendered lists attach — each calls its slice at CALL
 * time, React's `useStableCallback` guarantee — plus the composer's `@` and `/`
 * glyph handlers and the two modal handlers React declares outside the
 * `reportModal && …` / `shareModal && …` branches.
 *
 * @module
 */

import type { ReportResult } from '@molecule/app-ide-panel-logic'
import { formatReportConfirmation } from '@molecule/app-ide-panel-logic'
import type {
  AddSystemCardOptions,
  CommandId,
  FileEntry,
  ModelMode,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, ModelRegion } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:render-handlers` slice. */
export interface ChatRenderHandlersSlice {
  /** Runs a slash command through the latest committed handler. */
  readonly stableExecuteCommand: (id: CommandId) => Promise<void>
  /** Attaches a picked mention entry through the latest committed handler. */
  readonly stableSelectFileEntry: (entry: FileEntry) => void
  /** Opens the tests browser through the latest committed handler. */
  readonly stableOpenTestsBrowser: (query?: string, runAll?: boolean) => void
  /** Replaces the composer text through the latest committed handler. */
  readonly stableSetInputValue: (value: string) => void
  /** Adds a system card through the latest committed handler. */
  readonly stableAddSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Selects a model through the latest committed handler. */
  readonly stableSelectModel: (
    modelId: string,
    displayName?: string,
    mode?: ModelMode,
  ) => Promise<void>
  /** Sets a model's region through the latest committed handler. */
  readonly stableSetModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /** Inserts `@` at the caret and opens the file picker. */
  readonly insertMentionAtCaret: () => void
  /** Toggles the slash-command menu from the composer's `/` glyph. */
  readonly toggleSlashMenu: () => void
  /** Closes the bug-report modal. */
  readonly closeReportModal: () => void
  /** Confirms a submitted bug report with a card. */
  readonly handleReportSubmitted: (result: ReportResult) => void
  /** Closes the share-link modal. */
  readonly closeShareModal: () => void

  /** React's mount work for the region: none — the region declares callbacks. */
  mount(): void
}

/**
 * Creates the `chat:render-handlers` slice.
 *
 * @param ctx - The shared chat context (every slice the handlers forward to).
 * @returns The stable callbacks, the glyph handlers and the modal handlers.
 */
export function createChatRenderHandlers(ctx: ChatContext): ChatRenderHandlersSlice {
  /**
   * Runs one command by id through the commands slice.
   *
   * @param id - The command's id.
   * @returns A promise that settles once the command finished.
   */
  const stableExecuteCommand = (id: CommandId): Promise<void> => ctx.commands.executeCommand(id)

  /**
   * Stages the picked file as an attachment.
   *
   * @param entry - The picked file entry.
   */
  const stableSelectFileEntry = (entry: FileEntry): void => ctx.mention.selectFileEntry(entry)

  /**
   * Opens the `/test` browser through the tests slice.
   *
   * @param query - An optional filter.
   * @param runAll - Whether to start every test.
   */
  const stableOpenTestsBrowser = (query?: string, runAll?: boolean): void =>
    ctx.tests.openTestsBrowser(query, runAll)

  /**
   * Writes the composer's text.
   *
   * @param value - The new text.
   */
  const stableSetInputValue = (value: string): void => ctx.composer.setInputValue(value)

  /**
   * Publishes a local inline card.
   *
   * @param text - The card's body.
   * @param options - The variant's own fields.
   */
  const stableAddSystemCard = (text: string, options?: AddSystemCardOptions): void =>
    ctx.systemCards.addSystemCard(text, options)

  /**
   * Selects a model (optionally for one mode only) and persists it.
   *
   * @param modelId - The model's id.
   * @param displayName - The model's display name, when the picker has one.
   * @param mode - The mode to persist the choice for.
   * @returns A promise that settles once the choice is persisted.
   */
  const stableSelectModel = (
    modelId: string,
    displayName?: string,
    mode?: ModelMode,
  ): Promise<void> => ctx.modelActions.selectModel(modelId, displayName, mode)

  /**
   * Sets one model's billing region and persists it.
   *
   * @param modelId - The model's id.
   * @param region - The region code.
   * @returns A promise that settles once the choice is persisted.
   */
  const stableSetModelRegion = (modelId: string, region: ModelRegion): Promise<void> =>
    ctx.modelActions.setModelRegion(modelId, region)

  // The composer's @ glyph: insert a mention at the caret and open the file picker.
  const insertMentionAtCaret = (): void => {
    const val = ctx.composer.inputRef.current
    const pos = ctx.composer.textareaRef.current?.selectionStart ?? val.length
    const newVal = val.slice(0, pos) + '@' + val.slice(pos)
    ctx.composer.setInputValue(newVal)
    ctx.composer.autoResize()
    ctx.popups.setMentionStart(pos)
    void ctx.mention.openFilePicker('')
    ctx.composer.setCommandMenu(null)
    setTimeout(() => {
      const textarea = ctx.composer.textareaRef.current
      textarea?.focus()
      textarea?.setSelectionRange(pos + 1, pos + 1)
    }, 0)
  }

  // The composer's / glyph: TOGGLE the menu regardless of the composer's current
  // text — never clobbering it.
  const toggleSlashMenu = (): void => {
    if (ctx.composer.commandMenu) {
      ctx.composer.setCommandMenu(null)
      if (ctx.composer.inputRef.current === '/') {
        // Remove the slash this button added on open.
        ctx.composer.setInputValue('')
        ctx.composer.autoResize()
      }
      setTimeout(() => {
        ctx.composer.textareaRef.current?.focus()
      }, 0)
      return
    }
    // Popups are one-at-a-time — close siblings first.
    ctx.voice.setMicPicker(null)
    ctx.composer.setModelPicker(null)
    ctx.composer.setEffortPicker(null)
    ctx.sounds.setSoundsPicker(null)
    const cur = ctx.composer.inputRef.current
    if (!cur) ctx.input.setInputAndCursorEnd('/')
    ctx.composer.setCommandMenu({
      selectedIdx: -1,
      showAll: cur !== '' && cur !== '/',
      text: cur || '/',
    })
  }

  // The modals' handlers, created outside their `modal && …` branches.
  const closeReportModal = (): void => ctx.popups.setReportModal(null)

  /**
   * Publishes the confirmation card React's `handleReportSubmitted` adds: the
   * localized result line and, when the server returned one, the issue link.
   *
   * @param result - The submitted report's result.
   */
  const handleReportSubmitted = (result: ReportResult): void => {
    ctx.popups.setReportModal(null)
    const { key, defaultValue } = formatReportConfirmation(result)
    ctx.systemCards.addSystemCard(
      ctx.env.t(key, { productName: ctx.productName }, { defaultValue }),
      {
        action: result.url
          ? {
              label: ctx.env.t('ide.chat.report.viewIssue', undefined, {
                defaultValue: 'View issue',
              }),
              href: result.url,
            }
          : undefined,
      },
    )
  }

  const closeShareModal = (): void => ctx.popups.setShareModal(null)

  return {
    stableExecuteCommand,
    stableSelectFileEntry,
    stableOpenTestsBrowser,
    stableSetInputValue,
    stableAddSystemCard,
    stableSelectModel,
    stableSetModelRegion,
    insertMentionAtCaret,
    toggleSlashMenu,
    closeReportModal,
    handleReportSubmitted,
    closeShareModal,
    mount(): void {
      // React's region builds callbacks from render-time state; there is no
      // mount I/O.
    },
  }
}
