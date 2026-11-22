/**
 * `ChatPanel` cases: Attachments and @-mentions. Every case name starts with `attachments: `.
 *
 * What the composer attaches and sends as context: the `@` file reference's data path (the
 * one-time file-list fetch and its reuse across keystrokes, the git-status tick that
 * invalidates the cache, a failed fetch closing the picker instead of showing stale rows,
 * clicking a row attaching it, the same file attaching once), the chips a mention or a
 * dropped/pasted file renders (name, size, remove button, an image's object-URL preview and
 * its revoke on removal), the drag-and-drop overlay (shown on enter, surviving an inner
 * leave, hidden on the real leave or the drop), the 20 MB limit (its banner, a mixed drop
 * that still attaches the small file, and the two ways the banner clears), and the send
 * itself (a mentioned file fetched and embedded as a `<file>` block, a placeholder when the
 * sandbox cannot read it, a `/workspace` entry attaching at its relative path, `/explain`
 * rewritten around the attachments, a dropped file riding the send as a base64 or
 * octet-stream attachment, files sending with an empty composer, and the sent bubble
 * listing its attachments).
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction, TransferFile } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { base, click, key, LOG, props, TA, type } from './fixtures.js'

/** Just over the 20 MB attachment limit (`ChatPanel` refuses `size > MAX_ATTACHMENT_SIZE`). */
const HUGE = 21 * 1024 * 1024

/** The hidden attachment input, which always precedes the popups inside the input area. */
const PICKER_ROW = 'input[type="file"] ~ div button'

/** The mount's files-list answer: the skills seed reads an empty project. */
const SEED_FILES_LIST: HttpScript = {
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files: [] },
}

/**
 * A later files-list answer: what the `@` picker's own fetch reads.
 *
 * @param files - The project's files.
 * @returns The scripted request.
 */
const fileList = (files: string[]): HttpScript => ({
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files },
})

/**
 * A project file's contents, as the send of a @-mentioned file fetches it.
 *
 * @param path - The file's project-relative path.
 * @param content - Its contents.
 * @returns The scripted request.
 */
const fileBody = (path: string, content: string): HttpScript => ({
  method: 'GET',
  url: `/projects/p1/files/${path}`,
  data: { content },
})

/** A clean git-status answer, for the tick that invalidates the file-list cache. */
const GIT_CLEAN: HttpScript = { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } }

/**
 * A file entry for a `transfer` step (a drop or a paste).
 *
 * @param name - The file's name.
 * @param type - Its MIME type.
 * @param content - Its text content.
 * @param size - The byte size a component reads (default: the content's length).
 * @returns The entry.
 */
const file = (name: string, type: string, content: string, size?: number): TransferFile => ({
  name,
  type,
  content,
  ...(size === undefined ? {} : { size }),
})

/**
 * Drops files onto the messages log, whose drag events bubble to the panel's drop zone.
 *
 * @param entries - The files the drag carries.
 * @returns The step.
 */
const drop = (entries: TransferFile[]): Interaction => ({
  type: 'transfer',
  selector: LOG,
  event: 'drop',
  files: entries,
})

/** Attachments and @-mentions. */
export const attachmentsCases: FeatureCase[] = [
  // ── The @ picker's file-list fetch ─────────────────────────────────────────
  base('attachments: typing @ after a failed file-list fetch leaves no picker open', [type('@')], {
    http: [SEED_FILES_LIST, { method: 'GET', url: '/projects/p1/files-list', status: 500 }],
  }),
  base(
    'attachments: the picker fetches the file list once and reuses it across keystrokes',
    [type('@notes'), type('@src')],
    {
      http: [SEED_FILES_LIST, fileList(['notes/plan.md', 'src/app.ts'])],
    },
  ),
  base(
    'attachments: a git-status tick invalidates the cached file list so the next @ refetches',
    [type('@re'), props({ gitStatusTick: 1 }), type('@')],
    {
      http: [
        SEED_FILES_LIST,
        fileList(['readme.md', 're-auth.ts']),
        fileList(['notes/plan.md']),
        GIT_CLEAN,
        GIT_CLEAN,
      ],
    },
  ),

  // ── Attaching from the picker ──────────────────────────────────────────────
  base(
    'attachments: clicking a picker row attaches the file and lifts the @ query out',
    [type('@ut'), click(PICKER_ROW)],
    {
      http: [SEED_FILES_LIST, fileList(['src/util.ts'])],
    },
  ),
  base(
    'attachments: attaching the same file twice keeps one chip',
    [type('@ut'), key('Enter'), type('@ut'), key('Enter')],
    {
      http: [SEED_FILES_LIST, fileList(['src/util.ts'])],
    },
  ),
  base(
    'attachments: removing a mentioned file chip takes it back out',
    [type('@ut'), key('Enter'), click('[data-mol-id="chat-attachment-remove-/src/util.ts"]')],
    {
      http: [SEED_FILES_LIST, fileList(['src/util.ts'])],
    },
  ),

  // ── Sending a mentioned file ───────────────────────────────────────────────
  base(
    'attachments: sending a mentioned file fetches its contents and embeds them in the message',
    [type('@src/app.ts'), key('Enter'), type('Review this file'), key('Enter')],
    {
      http: [
        SEED_FILES_LIST,
        fileList(['src/app.ts', 'src/util.ts']),
        fileBody('src/app.ts', 'export const app = 1'),
      ],
    },
  ),
  base(
    'attachments: an unreadable mentioned file sends a placeholder note instead',
    [type('@src/app.ts'), key('Enter'), type('Review this file'), key('Enter')],
    {
      http: [
        SEED_FILES_LIST,
        fileList(['src/app.ts', 'src/util.ts']),
        { method: 'GET', url: '/projects/p1/files/src/app.ts', status: 500 },
      ],
    },
  ),
  base(
    'attachments: a /workspace file-list entry attaches and sends at its relative path',
    [type('@src/app.ts'), key('Enter'), type('Look here'), key('Enter')],
    {
      http: [SEED_FILES_LIST, fileList(['/workspace/src/app.ts']), fileBody('src/app.ts', 'ready')],
    },
  ),
  base(
    'attachments: /explain rewrites itself around the attached file',
    [type('@src/app.ts'), key('Enter'), type('/explain '), key('Enter')],
    {
      http: [SEED_FILES_LIST, fileList(['src/app.ts']), fileBody('src/app.ts', 'x = 1')],
    },
  ),

  // ── Dropping files ─────────────────────────────────────────────────────────
  base('attachments: dropping files attaches them as chips with their sizes', [
    drop([
      file('notes.txt', 'text/plain', 'hello world', 2048),
      file('app.rb', 'text/x-ruby', 'puts 1', 3),
    ]),
  ]),
  base('attachments: a dropped file over the size limit shows the too-large banner', [
    drop([file('huge.iso', 'application/octet-stream', 'x', HUGE)]),
  ]),
  base('attachments: a mixed drop attaches the small file and reports the large one', [
    drop([
      file('huge.iso', 'application/octet-stream', 'x', HUGE),
      file('notes.txt', 'text/plain', 'ok', 2),
    ]),
  ]),
  base('attachments: adding another file clears the too-large banner', [
    drop([file('huge.iso', 'application/octet-stream', 'x', HUGE)]),
    drop([file('notes.txt', 'text/plain', 'ok', 2)]),
  ]),
  base('attachments: sending clears the too-large banner', [
    drop([file('huge.iso', 'application/octet-stream', 'x', HUGE)]),
    type('Go'),
    key('Enter'),
  ]),
  base('attachments: a dropped image attaches with a preview thumbnail', [
    drop([file('shot.png', 'image/png', 'PNGDATA', 7)]),
  ]),
  base('attachments: removing an image attachment revokes its preview URL', [
    drop([file('shot.png', 'image/png', 'PNGDATA', 7)]),
    click('[data-mol-id="chat-attachment-remove-shot.png"]'),
  ]),
  base('attachments: removing one of two chips leaves the other', [
    drop([file('a.txt', 'text/plain', 'a', 1), file('b.txt', 'text/plain', 'b', 1)]),
    click('[data-mol-id="chat-attachment-remove-a.txt"]'),
  ]),

  // ── The drag overlay ───────────────────────────────────────────────────────
  base('attachments: dragging over the panel shows the drop overlay', [
    { type: 'transfer', selector: LOG, event: 'dragenter' },
    { type: 'transfer', selector: LOG, event: 'dragover' },
  ]),
  base('attachments: leaving the panel hides the drop overlay again', [
    { type: 'transfer', selector: LOG, event: 'dragenter' },
    { type: 'transfer', selector: LOG, event: 'dragleave' },
  ]),
  base('attachments: the overlay survives a drag that only leaves an inner layer', [
    { type: 'transfer', selector: LOG, event: 'dragenter' },
    { type: 'transfer', selector: LOG, event: 'dragenter' },
    { type: 'transfer', selector: LOG, event: 'dragleave' },
  ]),
  base('attachments: a drop attaches the files and clears the overlay', [
    { type: 'transfer', selector: LOG, event: 'dragenter' },
    drop([file('notes.txt', 'text/plain', 'ok', 2)]),
  ]),

  // ── Pasting files ──────────────────────────────────────────────────────────
  base('attachments: pasting files into the composer attaches them', [
    {
      type: 'transfer',
      selector: TA,
      event: 'paste',
      files: [file('clip.txt', 'text/plain', 'pasted', 6)],
    },
  ]),
  base('attachments: a paste without files is left to the browser', [
    { type: 'transfer', selector: TA, event: 'paste', data: { 'text/plain': 'just words' } },
  ]),

  // ── Riding the send ────────────────────────────────────────────────────────
  base('attachments: a dropped file rides the send as a base64 attachment', [
    drop([file('notes.txt', 'text/plain', 'hello', 5)]),
    type('Check this file'),
    key('Enter'),
  ]),
  base('attachments: a file with no type rides the send as an octet-stream attachment', [
    drop([file('blob.bin', '', 'x', 1)]),
    type('Run this'),
    key('Enter'),
  ]),
  base('attachments: files send even with an empty composer', [
    drop([file('notes.txt', 'text/plain', 'ok', 2)]),
    key('Enter'),
  ]),
]
