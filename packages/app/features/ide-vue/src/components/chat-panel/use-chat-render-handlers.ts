/**
 * `chat:render-handlers` — the stable callbacks the rendered lists attach,
 * ported from React's `chat:render-handlers` region. React wraps each slice
 * action in `useStableCallback` so building a list never captures a function
 * that touches refs; here each handler is a plain function that calls its slice
 * at CALL time, which is the same guarantee.
 *
 * The composer's glyph handlers and the two modal handlers live here too, as
 * React declares them outside the `reportModal && …` / `shareModal && …`
 * branches.
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
import { DEFAULT_PRODUCT_NAME } from '@molecule/app-vue'

import type { ChatCtx } from './context.js'

/** What the `chat:render-handlers` slice exposes. */
export interface ChatRenderHandlersSlice {
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
  readonly stableSetModelRegion: (modelId: string, region: string) => Promise<void>
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
 * Builds the `chat:render-handlers` slice.
 *
 * @param ctx - The panel context (every slice the handlers forward to).
 * @returns The render-handlers slice.
 */
export function createChatRenderHandlers(ctx: ChatCtx): ChatRenderHandlersSlice {
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
   * Publishes a persistent inline card.
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
  const stableSetModelRegion = (modelId: string, region: string): Promise<void> =>
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
    if (ctx.composer.commandMenu.value) {
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
  }
}
