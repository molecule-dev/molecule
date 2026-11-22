/**
 * React's `chat:popups` region of ChatPanel.tsx: the `@` file picker, the
 * staged attachments, the persistent system cards, and the bug-report /
 * share-link modal seeds.
 *
 * The region is pure state — React declares seven `useState`s and no mount I/O
 * — so this slice owns the signals and the setters every other slice reaches
 * for (`setAttachedFiles`, `setSystemCards`, `setReportModal`, …). Each setter
 * accepts a value or an updater, React's `setState` contract, because the
 * composer, attachments and timeline append to these lists functionally.
 *
 * {@link ChatPopups} is provided by `ChatInner`; other slices resolve it at
 * call time through `ChatInnerState.slice`, never in their constructors.
 *
 * @module
 */

import { Injectable, signal } from '@angular/core'

import type { ShareRole } from '@molecule/app-ide-panel-logic'
import type { AttachedFile, FilePicker, SystemCard } from '@molecule/app-ide-panel-logic/panels'

/** React's `setState` contract: a value, or an updater over the previous one. */
export type ChatSetState<T> = (next: T | ((prev: T) => T)) => void

/** The identifiers other slices and sections read from the `chat:popups` slice. */
export interface ChatPopupsSlice {
  /** The open `@` file picker, or null. */
  readonly filePicker: () => FilePicker | null
  /** Sets the file picker (value or updater). */
  readonly setFilePicker: ChatSetState<FilePicker | null>
  /** Where the current `@` mention began in the composer. */
  readonly mentionStart: () => number
  /** Sets the mention's start offset (value or updater). */
  readonly setMentionStart: ChatSetState<number>
  /** The staged attachment chips. */
  readonly attachedFiles: () => AttachedFile[]
  /** Sets the staged attachments (value or updater). */
  readonly setAttachedFiles: ChatSetState<AttachedFile[]>
  /** Why the last attachment was rejected, or null. */
  readonly attachmentError: () => string | null
  /** Sets the attachment error (value or updater). */
  readonly setAttachmentError: ChatSetState<string | null>
  /** The persistent system cards in the timeline. */
  readonly systemCards: () => SystemCard[]
  /** Sets the system cards (value or updater). */
  readonly setSystemCards: ChatSetState<SystemCard[]>
  /** The open bug-report modal's seed, or null. */
  readonly reportModal: () => { title: string } | null
  /** Sets the report modal (value or updater). */
  readonly setReportModal: ChatSetState<{ title: string } | null>
  /** The open share modal's seed, or null. */
  readonly shareModal: () => { role: ShareRole } | null
  /** Sets the share modal (value or updater). */
  readonly setShareModal: ChatSetState<{ role: ShareRole } | null>
  /** React's mount I/O for the region (none: the region is state only). */
  mount(): void
}

/**
 * React's `chat:popups` slice: the state every popup and both modals read.
 */
@Injectable()
export class ChatPopups implements ChatPopupsSlice {
  /** The open `@` file picker, or null. */
  readonly filePicker = signal<FilePicker | null>(null)

  /** Where the current `@` mention began in the composer. */
  readonly mentionStart = signal(0)

  /** The staged attachment chips. */
  readonly attachedFiles = signal<AttachedFile[]>([])

  /** Why the last attachment was rejected, or null. */
  readonly attachmentError = signal<string | null>(null)

  /** The persistent system cards in the timeline. */
  readonly systemCards = signal<SystemCard[]>([])

  /** The open bug-report modal's seed, or null. */
  readonly reportModal = signal<{ title: string } | null>(null)

  /** The open share modal's seed, or null. */
  readonly shareModal = signal<{ role: ShareRole } | null>(null)

  /** Sets the file picker (value or updater). */
  readonly setFilePicker: ChatSetState<FilePicker | null> = (next) => {
    this.filePicker.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the mention's start offset (value or updater). */
  readonly setMentionStart: ChatSetState<number> = (next) => {
    this.mentionStart.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the staged attachments (value or updater). */
  readonly setAttachedFiles: ChatSetState<AttachedFile[]> = (next) => {
    this.attachedFiles.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the attachment error (value or updater). */
  readonly setAttachmentError: ChatSetState<string | null> = (next) => {
    this.attachmentError.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the system cards (value or updater). */
  readonly setSystemCards: ChatSetState<SystemCard[]> = (next) => {
    this.systemCards.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the report modal (value or updater). */
  readonly setReportModal: ChatSetState<{ title: string } | null> = (next) => {
    this.reportModal.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the share modal (value or updater). */
  readonly setShareModal: ChatSetState<{ role: ShareRole } | null> = (next) => {
    this.shareModal.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** React's mount I/O for the region: the region declares state only. */
  mount(): void {}
}
