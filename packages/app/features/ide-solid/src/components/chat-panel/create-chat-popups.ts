/**
 * `chat:popups` — every popup's open state that is not a picker: the `@`-file
 * picker, the attachment chips, the system cards and the report/share modals.
 * React's region is plain state with no effects, so the port is the signals
 * alone (unit P2).
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createSignal } from 'solid-js'

import type { ShareRole } from '@molecule/app-ide-panel-logic'
import type { AttachedFile, FilePicker, SystemCard } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** The open `/report` modal's state. */
export interface ReportModalState {
  /** The bug's initial title. */
  title: string
}

/** The open `/share` modal's state. */
export interface ShareModalState {
  /** The role a new link mints at. */
  role: ShareRole
}

/** What other slices read from `chat:popups`. */
export interface ChatPopupsSlice {
  /** The `@`-file picker, or null when closed. */
  filePicker: Accessor<FilePicker | null>
  /** Opens, moves or closes the file picker. */
  setFilePicker: Setter<FilePicker | null>
  /** The composer offset the `@` that opened the picker sits at. */
  mentionStart: Accessor<number>
  /** Sets the mention offset. */
  setMentionStart: Setter<number>
  /** The files the composer will send along with the message. */
  attachedFiles: Accessor<AttachedFile[]>
  /** Adds, replaces or removes attachments. */
  setAttachedFiles: Setter<AttachedFile[]>
  /** The attachment error line, or null. */
  attachmentError: Accessor<string | null>
  /** Sets the attachment error line. */
  setAttachmentError: Setter<string | null>
  /** The conversation's local system cards. */
  systemCards: Accessor<SystemCard[]>
  /** Sets the local system cards. */
  setSystemCards: Setter<SystemCard[]>
  /** The open bug-report modal, or null. */
  reportModal: Accessor<ReportModalState | null>
  /** Opens or closes the bug-report modal. */
  setReportModal: Setter<ReportModalState | null>
  /** The open share-link modal, or null. */
  shareModal: Accessor<ShareModalState | null>
  /** Opens or closes the share-link modal. */
  setShareModal: Setter<ShareModalState | null>
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:popups`.
 * @param _ctx - The inner ctx (unread: this region is state with no effects).
 * @returns The popups slice.
 */
export function createChatPopups(_ctx: ChatInnerCtx): ChatPopupsSlice {
  const [filePicker, setFilePicker] = createSignal<FilePicker | null>(null)
  const [mentionStart, setMentionStart] = createSignal(0)
  const [attachedFiles, setAttachedFiles] = createSignal<AttachedFile[]>([])
  const [attachmentError, setAttachmentError] = createSignal<string | null>(null)
  const [systemCards, setSystemCards] = createSignal<SystemCard[]>([])
  const [reportModal, setReportModal] = createSignal<ReportModalState | null>(null)
  const [shareModal, setShareModal] = createSignal<ShareModalState | null>(null)
  return {
    filePicker,
    setFilePicker,
    mentionStart,
    setMentionStart,
    attachedFiles,
    setAttachedFiles,
    attachmentError,
    setAttachmentError,
    systemCards,
    setSystemCards,
    reportModal,
    setReportModal,
    shareModal,
    setShareModal,
    effects: {},
  }
}
