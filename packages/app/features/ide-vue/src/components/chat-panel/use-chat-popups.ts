/**
 * `chat:popups` — the state every popup and the two modals read, ported from
 * React's `chat:popups` region: the `@` file picker, the staged attachments,
 * the persistent system cards, and the report / share modals.
 *
 * React keeps each of these in `useState`; here the state is a `ref` and the
 * setter accepts a value or an updater, exactly as React's `setX` does, so the
 * ported call sites keep their `setX((previous) => …)` shape.
 *
 * @module
 */

import { type Ref, ref } from 'vue'

import type { ShareRole } from '@molecule/app-ide-panel-logic'
import type { AttachedFile, FilePicker, SystemCard } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, SetState } from './context.js'

/**
 * Wraps a ref as React's `setX`: accepts the next value or an updater of the
 * previous one.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function setterFor<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** What the `chat:popups` slice exposes. */
export interface ChatPopupsSlice {
  /** The open `@` file picker, or `null`. */
  readonly filePicker: Ref<FilePicker | null>
  /** Sets the file picker. */
  readonly setFilePicker: SetState<FilePicker | null>
  /** Where the current `@` mention began in the composer. */
  readonly mentionStart: Ref<number>
  /** Sets the mention's start offset. */
  readonly setMentionStart: SetState<number>
  /** The staged attachment chips. */
  readonly attachedFiles: Ref<AttachedFile[]>
  /** Sets the staged attachments. */
  readonly setAttachedFiles: SetState<AttachedFile[]>
  /** Why the last attachment was rejected, or `null`. */
  readonly attachmentError: Ref<string | null>
  /** Sets the attachment error. */
  readonly setAttachmentError: SetState<string | null>
  /** The persistent system cards in the timeline. */
  readonly systemCards: Ref<SystemCard[]>
  /** Sets the system cards. */
  readonly setSystemCards: SetState<SystemCard[]>
  /** The open bug-report modal's seed, or `null`. */
  readonly reportModal: Ref<{ title: string } | null>
  /** Sets the report modal. */
  readonly setReportModal: SetState<{ title: string } | null>
  /** The open share modal's seed, or `null`. */
  readonly shareModal: Ref<{ role: ShareRole } | null>
  /** Sets the share modal. */
  readonly setShareModal: SetState<{ role: ShareRole } | null>
}

/**
 * Builds the `chat:popups` slice.
 *
 * @param _ctx - The panel context (the state is local to the slice).
 * @returns The popups slice.
 */
export function createChatPopups(_ctx: ChatCtx): ChatPopupsSlice {
  const filePicker = ref<FilePicker | null>(null)
  const mentionStart = ref(0)
  const attachedFiles = ref<AttachedFile[]>([])
  const attachmentError = ref<string | null>(null)
  const systemCards = ref<SystemCard[]>([])
  const reportModal = ref<{ title: string } | null>(null)
  const shareModal = ref<{ role: ShareRole } | null>(null)

  return {
    filePicker,
    setFilePicker: setterFor(filePicker),
    mentionStart,
    setMentionStart: setterFor(mentionStart),
    attachedFiles,
    setAttachedFiles: setterFor(attachedFiles),
    attachmentError,
    setAttachmentError: setterFor(attachmentError),
    systemCards,
    setSystemCards: setterFor(systemCards),
    reportModal,
    setReportModal: setterFor(reportModal),
    shareModal,
    setShareModal: setterFor(shareModal),
  }
}
