/**
 * `ChatPanel` cases: /undo and the undo state of file changes. Every case name starts with
 * `undo: `.
 *
 * Two surfaces share one undo state:
 *
 * - `/undo` in the composer reverts the most recent assistant turn that changed files: it
 *   writes each file's earliest original back through the host's `onFileRevert`, refreshes
 *   git status, marks every tool call it reverted undone, persists them with one POST to the
 *   project's tool-call-undo route, and reports the file count as a local system card. It
 *   reports "nothing to undo" instead when no turn changed files, when a change has no diff
 *   snapshot or no file path in its input, or when the revert fails — and changes nothing in
 *   those cases. As shipped it also repeats a revert when run twice (the dispatch reads the
 *   undo set from the render it was created in — see the case comment below).
 * - Each file-change card in the timeline carries its own undo control: it flips that one
 *   change (persisted with its own POST, whose failure only warns — the in-session state
 *   stays), a second click while the revert is still running does nothing, and a change a
 *   history load reports undone renders struck through and re-applyable — for an editor,
 *   but a viewer gets no control.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { HttpScript } from '../../../../bindings/spec.js'
import type { CallbackResult, Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import type { BaseExtra } from './fixtures.js'
import {
  adv,
  base,
  CALLBACKS,
  click,
  DIFF,
  DONE,
  emit,
  finish,
  key,
  NOW,
  SEND,
  START,
  TOOL,
  type,
} from './fixtures.js'

/** The composer text and Enter that run one slash command the way the menu does. */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** The undo control on a file-change card. */
const UNDO = '[title="Undo this change"]'

/** The re-apply control an undone card offers. */
const REDO = '[title="Re-apply this change"]'

/** A `GET git-status` answer the mount, a turn boundary or a revert refresh consumes. */
const gitStatus: HttpScript = { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } }

/** The undo persist a successful toggle scripts. */
const UNDO_POST: HttpScript = {
  method: 'POST',
  url: '/projects/p1/tool-call-undo',
  data: { ok: true },
}

/**
 * Streams one assistant turn whose single tool call writes one file, with the diff snapshot
 * a `file_diff` event attaches unless {@link withDiff} says to leave it out.
 *
 * @param messageId - The assistant message id.
 * @param toolCallId - The tool call id.
 * @param path - The file, workspace-relative (the stream prefixes `/workspace/`).
 * @param withDiff - Whether the turn carries the file's diff snapshot.
 * @returns The steps.
 */
const writeTurn = (
  messageId: string,
  toolCallId: string,
  path: string,
  withDiff = true,
): Interaction[] => [
  type('Change the file'),
  click(SEND),
  emit(START(messageId)),
  emit(TOOL(toolCallId, 'write_file', { path: `/workspace/${path}`, content: 'written\n' })),
  adv(50),
  emit({
    type: 'tool_result',
    id: toolCallId,
    output: { diff: { type: 'modified', linesAdded: 2, linesRemoved: 1 } },
  }),
  adv(50),
  ...(withDiff ? [emit(DIFF(`/workspace/${path}`, 'original\n', 'written\n')), adv(50)] : []),
  emit(DONE),
  finish,
]

/** Streams one turn that writes a file and then edits it again, so two calls hold diffs for one path. */
const rewriteTurn: Interaction[] = [
  type('Rewrite the file twice'),
  click(SEND),
  emit(START('a1')),
  emit(TOOL('t1', 'write_file', { path: '/workspace/src/app.ts', content: 'first\n' })),
  adv(50),
  emit({
    type: 'tool_result',
    id: 't1',
    output: { diff: { type: 'modified', linesAdded: 1, linesRemoved: 1 } },
  }),
  adv(50),
  emit(DIFF('/workspace/src/app.ts', 'zeroth\n', 'first\n')),
  emit(
    TOOL('t2', 'edit_file', {
      path: '/workspace/src/app.ts',
      replacements: [{ old_string: 'first', new_string: 'second' }],
    }),
  ),
  adv(50),
  emit({ type: 'tool_result', id: 't2', output: { replacementsApplied: 1 } }),
  adv(50),
  emit(DIFF('/workspace/src/app.ts', 'first\n', 'second\n')),
  adv(50),
  emit(DONE),
  finish,
]

/** Streams one turn that writes two files, so /undo reverts and counts both. */
const twoFileTurn: Interaction[] = [
  type('Write both files'),
  click(SEND),
  emit(START('a1')),
  emit(TOOL('t1', 'write_file', { path: '/workspace/src/app.ts', content: 'one\n' })),
  adv(50),
  emit({
    type: 'tool_result',
    id: 't1',
    output: { diff: { type: 'modified', linesAdded: 1, linesRemoved: 0 } },
  }),
  adv(50),
  emit(DIFF('/workspace/src/app.ts', '', 'one\n')),
  emit(TOOL('t2', 'write_file', { path: '/workspace/src/other.ts', content: 'two\n' })),
  adv(50),
  emit({
    type: 'tool_result',
    id: 't2',
    output: { diff: { type: 'modified', linesAdded: 2, linesRemoved: 0 } },
  }),
  adv(50),
  emit(DIFF('/workspace/src/other.ts', '', 'two\n')),
  adv(50),
  emit(DONE),
  finish,
]

/** Streams one assistant turn that only runs a command — no file change for /undo to reach. */
const commandTurn: Interaction[] = [
  type('Run the tests'),
  click(SEND),
  emit(START('a2')),
  emit(TOOL('t9', 'exec_command', { command: 'npm test' })),
  adv(50),
  emit({ type: 'tool_result', id: 't9', output: { exitCode: 0 } }),
  adv(50),
  emit(DONE),
  finish,
]

/** The user message a seeded conversation starts with. */
const USER: ChatMessage = { id: 'u1', role: 'user', content: 'Update the app', timestamp: NOW + 1 }

/**
 * The persisted assistant turn the history cases load: one edit_file card with its diff
 * snapshot, undone when the host recorded it so.
 *
 * @param undone - Whether the record carries the persisted undone flag.
 * @returns The message.
 */
const editRecord = (undone: boolean): ChatMessage => ({
  id: 'a1',
  role: 'assistant',
  content: 'Done.',
  timestamp: NOW + 2,
  toolCalls: [
    {
      id: 't1',
      name: 'edit_file',
      input: { path: 'src/app.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
      output: { replacementsApplied: 1 },
      status: 'done',
      fileDiff: { original: 'a\n', modified: 'b\n' },
      ...(undone ? { isUndone: true } : {}),
    },
  ],
})

/**
 * The persisted turn the pathless case loads: an eligible call with a diff snapshot but no
 * file path in its input, so /undo finds no original to write back.
 */
const PATHLESS_RECORD: ChatMessage = {
  id: 'a1',
  role: 'assistant',
  content: 'Done.',
  timestamp: NOW + 2,
  toolCalls: [
    {
      id: 't1',
      name: 'write_file',
      input: {},
      output: 'ok',
      status: 'done',
      fileDiff: { original: 'a\n', modified: 'b\n' },
    },
  ],
}

/**
 * A {@link base} case that also records `onFileRevert`, the host call each revert and
 * re-apply makes with the path and the content written back.
 *
 * @param name - The case name.
 * @param interactions - Its steps.
 * @param extra - What the case adds to the baseline, plus what `onFileRevert` answers.
 * @returns The case.
 */
const withRevert = (
  name: string,
  interactions: Interaction[],
  extra: BaseExtra & { callbackResults?: Record<string, CallbackResult> } = {},
): FeatureCase => {
  const { callbackResults, ...rest } = extra
  return {
    ...base(name, interactions, rest),
    callbacks: [...CALLBACKS, 'onFileRevert'],
    ...(callbackResults ? { callbackResults } : {}),
  }
}

/** /undo and the undo state of file changes. */
export const undoCases: FeatureCase[] = [
  // ── The /undo command on an empty or unchanged conversation ────────────────
  base('undo: /undo with nothing to undo reports it and changes nothing', run('/undo')),
  base(
    'undo: a file change without a diff snapshot gives /undo nothing to revert',
    [...writeTurn('a1', 't1', 'src/app.ts', false), ...run('/undo')],
    { http: [gitStatus, gitStatus] },
  ),
  base(
    'undo: an eligible change with no file path in its input gives /undo nothing to revert',
    [...run('/undo')],
    { context: { areas: { chat: { history: [[USER, PATHLESS_RECORD]] } } } },
  ),

  // ── The revert the command performs ────────────────────────────────────────
  withRevert(
    "undo: /undo writes the last turn's original back and reports the reverted count",
    [...writeTurn('a1', 't1', 'src/app.ts'), ...run('/undo'), adv(500)],
    { http: [gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
  // The command dispatch reads the undo set of the latest render (2026-11-17: it
  // read the render it was created in, so a second /undo reverted the same files
  // again), so the already-undone calls are no longer eligible.
  withRevert(
    'undo: a second /undo finds nothing left to undo and reverts nothing',
    [...writeTurn('a1', 't1', 'src/app.ts'), ...run('/undo'), adv(500), ...run('/undo'), adv(500)],
    { http: [gitStatus, gitStatus, gitStatus, UNDO_POST, gitStatus] },
  ),
  withRevert(
    'undo: /undo skips a turn that only ran commands and reverts the last one that changed files',
    [...writeTurn('a1', 't1', 'src/app.ts'), ...commandTurn, ...run('/undo'), adv(500)],
    { http: [gitStatus, gitStatus, gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
  withRevert(
    'undo: /undo reverts only the latest of two file-changing turns',
    [
      ...writeTurn('a1', 't1', 'src/app.ts'),
      ...writeTurn('a2', 't2', 'src/other.ts'),
      ...run('/undo'),
      adv(500),
    ],
    { http: [gitStatus, gitStatus, gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
  withRevert(
    'undo: two changes to one file revert once, to the earliest original, and are marked together',
    [...rewriteTurn, ...run('/undo'), adv(500)],
    {
      http: [gitStatus, gitStatus, gitStatus, UNDO_POST],
      callbackResults: { onFileRevert: { resolve: undefined } },
    },
  ),
  withRevert(
    "undo: /undo reverts both of the turn's files and counts them",
    [...twoFileTurn, ...run('/undo'), adv(500)],
    { http: [gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
  withRevert(
    'undo: a failed revert reports the failure and leaves the change undoable',
    [...writeTurn('a1', 't1', 'src/app.ts'), ...run('/undo')],
    {
      http: [gitStatus, gitStatus],
      callbackResults: { onFileRevert: { reject: 'The sandbox refused the write' } },
    },
  ),

  // ── The undo control on a file-change card ─────────────────────────────────
  withRevert(
    "undo: a card's undo control undoes its single change",
    [...writeTurn('a1', 't1', 'src/app.ts'), click(UNDO), adv(500)],
    { http: [gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
  withRevert(
    'undo: a change the history marked undone loads re-applyable and toggles back to the modified content',
    [click(REDO), adv(500)],
    {
      context: { areas: { chat: { history: [[USER, editRecord(true)]] } } },
      http: [gitStatus, UNDO_POST],
    },
  ),
  base('undo: a viewer sees an undone change struck through and without its re-apply control', [], {
    props: { canEdit: false },
    context: { areas: { chat: { history: [[USER, editRecord(true)]] } } },
  }),
  withRevert(
    "undo: a card's rejected revert is logged and leaves the change undoable",
    [...writeTurn('a1', 't1', 'src/app.ts'), click(UNDO)],
    {
      http: [gitStatus, gitStatus],
      callbackResults: { onFileRevert: { reject: 'The sandbox refused the write' } },
    },
  ),
  withRevert(
    'undo: a revert already running swallows a second click on the control',
    [
      ...writeTurn('a1', 't1', 'src/app.ts'),
      click(UNDO),
      click(UNDO),
      { type: 'settle', callback: 'onFileRevert' },
      adv(500),
    ],
    {
      http: [gitStatus, gitStatus, gitStatus, UNDO_POST],
      callbackResults: { onFileRevert: { defer: true } },
    },
  ),
  withRevert(
    'undo: a failed undo persist warns but keeps the undone state',
    [...writeTurn('a1', 't1', 'src/app.ts'), click(UNDO), adv(500)],
    {
      http: [
        gitStatus,
        gitStatus,
        gitStatus,
        { method: 'POST', url: '/projects/p1/tool-call-undo', status: 500 },
      ],
    },
  ),

  // ── The undo state a later history load must not disturb ───────────────────
  withRevert(
    'undo: an undone change stays undone when another message joins the conversation',
    [
      ...writeTurn('a1', 't1', 'src/app.ts'),
      ...run('/undo'),
      adv(500),
      type('More work'),
      click(SEND),
    ],
    { http: [gitStatus, gitStatus, gitStatus, gitStatus, UNDO_POST] },
  ),
]
