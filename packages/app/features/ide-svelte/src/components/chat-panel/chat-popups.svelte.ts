/**
 * React's `chat:popups` region of ChatPanel.tsx: the state every popup and the
 * two modals read — the `@` file picker and where its mention began, the staged
 * attachment chips and the last rejection, the persistent system cards, and the
 * bug-report and share-link modals' seeds.
 *
 * React keeps these six `useState` cells in one region and every other region
 * reads or writes them, so the slice exposes each value reactively plus the
 * setter its owner calls. The setters take React's `SetStateAction` shape: a
 * value, or the updater React's functional form always had
 * (`setSystemCards((previous) => [...previous, card])`).
 *
 * The region has no mount work: React declares state only.
 *
 * @module
 */

import type { ShareRole } from '@molecule/app-ide-panel-logic'
import type { AttachedFile, FilePicker, SystemCard } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/**
 * React's `SetStateAction<T>` as the slices expose it: a value, or a function
 * that receives the latest value and returns the next one.
 */
export type ChatSetState<T> = (value: T | ((previous: T) => T)) => void

/** The identifiers other slices and sections read from the `chat:popups` slice. */
export interface ChatPopupsSlice {
  /** The open `@` file picker, or `null`. */
  readonly filePicker: FilePicker | null
  /** Sets the file picker (React's `setFilePicker`). */
  readonly setFilePicker: ChatSetState<FilePicker | null>
  /** Where the current `@` mention began in the composer. */
  readonly mentionStart: number
  /** Sets the mention's start offset (React's `setMentionStart`). */
  readonly setMentionStart: ChatSetState<number>
  /** The staged attachment chips. */
  readonly attachedFiles: AttachedFile[]
  /** Sets the staged attachments (React's `setAttachedFiles`). */
  readonly setAttachedFiles: ChatSetState<AttachedFile[]>
  /** Why the last attachment was rejected, or `null`. */
  readonly attachmentError: string | null
  /** Sets the attachment error (React's `setAttachmentError`). */
  readonly setAttachmentError: ChatSetState<string | null>
  /** The persistent system cards in the timeline. */
  readonly systemCards: SystemCard[]
  /** Sets the system cards (React's `setSystemCards`). */
  readonly setSystemCards: ChatSetState<SystemCard[]>
  /** The open bug-report modal's seed, or `null` when closed. */
  readonly reportModal: { title: string } | null
  /** Sets the report modal (React's `setReportModal`). */
  readonly setReportModal: ChatSetState<{ title: string } | null>
  /** The open share-link modal's seed, or `null` when closed. */
  readonly shareModal: { role: ShareRole } | null
  /** Sets the share modal (React's `setShareModal`). */
  readonly setShareModal: ChatSetState<{ role: ShareRole } | null>
  /** React's mount work for the region — none: it declares state only. */
  mount(): void
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
 * Creates the `chat:popups` slice.
 *
 * @param _ctx - The shared chat context (the region reads no services).
 * @returns The popups state and its setters, reactive to every reader.
 */
export function createChatPopups(_ctx: ChatContext): ChatPopupsSlice {
  let filePicker = $state.raw<FilePicker | null>(null)
  let mentionStart = $state(0)
  let attachedFiles = $state.raw<AttachedFile[]>([])
  let attachmentError = $state<string | null>(null)
  let systemCards = $state.raw<SystemCard[]>([])
  let reportModal = $state.raw<{ title: string } | null>(null)
  let shareModal = $state.raw<{ role: ShareRole } | null>(null)

  return {
    get filePicker(): FilePicker | null {
      return filePicker
    },
    setFilePicker(
      value: FilePicker | null | ((previous: FilePicker | null) => FilePicker | null),
    ): void {
      filePicker = resolveState(filePicker, value)
    },
    get mentionStart(): number {
      return mentionStart
    },
    setMentionStart(value: number | ((previous: number) => number)): void {
      mentionStart = resolveState(mentionStart, value)
    },
    get attachedFiles(): AttachedFile[] {
      return attachedFiles
    },
    setAttachedFiles(value: AttachedFile[] | ((previous: AttachedFile[]) => AttachedFile[])): void {
      attachedFiles = resolveState(attachedFiles, value)
    },
    get attachmentError(): string | null {
      return attachmentError
    },
    setAttachmentError(value: string | null | ((previous: string | null) => string | null)): void {
      attachmentError = resolveState(attachmentError, value)
    },
    get systemCards(): SystemCard[] {
      return systemCards
    },
    setSystemCards(value: SystemCard[] | ((previous: SystemCard[]) => SystemCard[])): void {
      systemCards = resolveState(systemCards, value)
    },
    get reportModal(): { title: string } | null {
      return reportModal
    },
    setReportModal(
      value:
        | { title: string }
        | null
        | ((previous: { title: string } | null) => { title: string } | null),
    ): void {
      reportModal = resolveState(reportModal, value)
    },
    get shareModal(): { role: ShareRole } | null {
      return shareModal
    },
    setShareModal(
      value:
        | { role: ShareRole }
        | null
        | ((previous: { role: ShareRole } | null) => { role: ShareRole } | null),
    ): void {
      shareModal = resolveState(shareModal, value)
    },
    mount(): void {
      // React's region declares state only; there is no mount I/O to repeat.
    },
  }
}
