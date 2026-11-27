/**
 * `chat:render-handlers` — the stable callbacks the render builds lists with
 * and the two modal handlers (React's `chat:render-handlers` region, ported by
 * unit P5).
 *
 * React wraps each slice action in `useStableCallback`, so building a list
 * never captures a function that touches refs and a click always runs the
 * latest committed handler. Here each handler is a plain function that looks
 * its slice up on the ctx at CALL time, which is the same guarantee.
 *
 * @module
 */

import { DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import type { ReportResult } from '@molecule/app-ide-panel-logic'
import { formatReportConfirmation } from '@molecule/app-ide-panel-logic'
import type {
  AddSystemCardOptions,
  CommandId,
  FileEntry,
  ModelMode,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, ModelRegion, SliceEffects } from './context.js'

/** What other slices and sections read from `chat:render-handlers`. */
export interface ChatRenderHandlersSlice {
  /** Runs a slash command through the latest committed handler. */
  stableExecuteCommand: (id: CommandId) => Promise<void>
  /** Attaches a picked mention entry through the latest committed handler. */
  stableSelectFileEntry: (entry: FileEntry) => void
  /** Opens the tests browser through the latest committed handler. */
  stableOpenTestsBrowser: (query?: string, runAll?: boolean) => void
  /** Replaces the composer text through the latest committed handler. */
  stableSetInputValue: (value: string) => void
  /** Adds a system card through the latest committed handler. */
  stableAddSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Selects a model through the latest committed handler. */
  stableSelectModel: (modelId: string, displayName?: string, mode?: ModelMode) => Promise<void>
  /** Sets a model's region through the latest committed handler. */
  stableSetModelRegion: (modelId: string, region: ModelRegion) => Promise<void>
  /** Inserts `@` at the caret and opens the file picker. */
  insertMentionAtCaret: () => void
  /** Toggles the slash-command menu from the composer's `/` glyph. */
  toggleSlashMenu: () => void
  /** Closes the bug-report modal. */
  closeReportModal: () => void
  /** Handles a submitted bug report (closes and announces it). */
  handleReportSubmitted: (result: ReportResult) => void
  /** Closes the share-link modal. */
  closeShareModal: () => void
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:render-handlers`.
 * @param ctx - The inner ctx (every slice the handlers forward to, and the
 *   popups that hold the two modal states).
 * @returns The render-handlers slice.
 */
export function createChatRenderHandlers(ctx: ChatInnerCtx): ChatRenderHandlersSlice {
  /**
   * Runs one command by id through the commands slice.
   * @param id - The command's id.
   * @returns A promise that settles once the command finished.
   */
  const stableExecuteCommand = (id: CommandId): Promise<void> => ctx.commands.executeCommand(id)

  /**
   * Stages the picked file as an attachment.
   * @param entry - The picked file entry.
   */
  const stableSelectFileEntry = (entry: FileEntry): void => ctx.mention.selectFileEntry(entry)

  /**
   * Opens the `/test` browser through the tests slice.
   * @param query - An optional filter.
   * @param runAll - Whether to start every test.
   */
  const stableOpenTestsBrowser = (query?: string, runAll?: boolean): void =>
    ctx.tests.openTestsBrowser(query, runAll)

  /**
   * Writes the composer's text.
   * @param value - The new text.
   */
  const stableSetInputValue = (value: string): void => ctx.composer.setInputValue(value)

  /**
   * Publishes a persistent inline card.
   * @param text - The card's body.
   * @param options - The variant's own fields.
   */
  const stableAddSystemCard = (text: string, options?: AddSystemCardOptions): void =>
    ctx.systemCards.addSystemCard(text, options)

  /**
   * Selects a model (optionally for one mode only) and persists it.
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
   * @param modelId - The model's id.
   * @param region - The region code.
   * @returns A promise that settles once the choice is persisted.
   */
  const stableSetModelRegion = (modelId: string, region: ModelRegion): Promise<void> =>
    ctx.modelActions.setModelRegion(modelId, region)

  /** The composer's @ glyph: insert a mention at the caret and open the file picker. */
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
      ctx.composer.textareaRef.current?.focus()
      ctx.composer.textareaRef.current?.setSelectionRange(pos + 1, pos + 1)
    }, 0)
  }

  /**
   * The composer's / glyph: TOGGLE the menu regardless of the composer's current
   * text — never clobbering it. With text present the menu opens in showAll mode
   * (every command listed; picking one replaces the input via executeCommand's
   * prefill). An empty box still gets the type-ahead '/' so filtering-by-typing
   * works as before.
   */
  const toggleSlashMenu = (): void => {
    if (ctx.composer.commandMenu()) {
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

  // The modals' handlers: new functions on every render, as the inline ones
  // were, but created outside the `reportModal && …` / `shareModal && …`
  // branches, which otherwise make the compiler treat the setters as reactive.
  /** Closes the bug-report modal. */
  const closeReportModal = (): void => {
    ctx.popups.setReportModal(null)
  }
  /**
   * Closes the report modal and announces the created issue.
   * @param result - What the report endpoint returned.
   */
  const handleReportSubmitted = (result: ReportResult): void => {
    ctx.popups.setReportModal(null)
    const { key, defaultValue } = formatReportConfirmation(result)
    ctx.systemCards.addSystemCard(
      ctx.env.t(
        key,
        { productName: ctx.props.productName ?? DEFAULT_PRODUCT_NAME },
        { defaultValue },
      ),
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
  /** Closes the share-link modal. */
  const closeShareModal = (): void => {
    ctx.popups.setShareModal(null)
  }

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
    effects: {},
  }
}
