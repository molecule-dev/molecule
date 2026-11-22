/**
 * `ToolCallCard` cases: one tool call of the chat transcript, in every shape
 * the card renders — the compact row and its status dot, the expandable IN/OUT
 * pane of a command or a fetch, the file-change diffs and their undo (and a
 * revert the host rejects, which the card logs), the
 * `spawn_agent` subagent card, the `save_plan` row, the `ask_user` question with
 * its options, previews and free text, and the Skip control.
 *
 * The card reads the theme (`isLight`) and the pointer/viewport queries from
 * the case's `context.theme` / `pointer` / `viewportWidth`; a `locale` step
 * proves its text follows a language switch. Only the background-task map (a
 * context the chat panel provides) is out of reach here — it is covered by the
 * ported unit tests.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/**
 * The row an expanded card click reaches: the row itself is the first
 * role="button". The file-name open controls (`code button`) and the undo
 * affordance are the row's SIBLINGS, not its children — a control cannot sit
 * inside the row (axe `nested-interactive`).
 */
const ROW = '[role="button"]'

/** `ToolCallCard`. */
export const toolCallCardCases: FeatureComponentCases = {
  component: 'ToolCallCard',
  cases: [
    // ── The compact row ─────────────────────────────────────────────────────
    {
      name: 'a running read',
      props: { id: 't1', name: 'read_file', input: { path: 'src/index.ts' }, status: 'running' },
    },
    {
      name: 'a finished read names its file and opens it',
      props: {
        id: 't2',
        name: 'read_file',
        input: { path: 'my-app/AGENTS.md' },
        output: { path: '/workspace/my-app/AGENTS.md', content: '# Agents' },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [{ type: 'click', selector: 'code button' }],
    },
    {
      name: 'a batch read names each file and opens the one clicked',
      props: {
        id: 't3',
        name: 'read_file',
        input: { paths: ['my-app/app/src/App.tsx', 'my-app/app/src/pages/Home.tsx'] },
        output: {
          files: [
            { path: '/workspace/my-app/app/src/App.tsx', content: 'export const App = 1' },
            { path: '/workspace/my-app/app/src/pages/Home.tsx', error: 'No such file' },
          ],
        },
        status: 'done',
      },
      callbacks: ['onFileOpen', 'onFileDoubleClick'],
      interactions: [
        { type: 'click', selector: 'code:nth-of-type(2) button' },
        { type: 'dblclick', selector: 'code:nth-of-type(2) button' },
      ],
    },
    {
      name: 'a path with no basename never takes a click target from the next file',
      props: {
        id: 't4',
        name: 'read_file',
        input: { paths: ['src/', 'my-app/app/src/App.tsx'] },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [{ type: 'click', selector: 'code button' }],
    },
    {
      name: 'an empty read result',
      props: {
        id: 't5',
        name: 'read_file',
        input: { path: 'src/empty.ts' },
        output: { content: '' },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a read result is truncated past 3000 characters',
      props: {
        id: 't6',
        name: 'read_file',
        input: { path: 'src/big.ts' },
        output: { content: 'x'.repeat(3001) },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a pending call carries no summary',
      props: { id: 't7', name: 'list_files', input: { path: 'src' }, status: 'pending' },
    },
    {
      name: 'an unknown tool renders its input as JSON when expanded',
      props: {
        id: 't8',
        name: 'custom_thing',
        input: { b: 2, a: [1, 2] },
        output: { ok: true },
        status: 'done',
      },
    },
    {
      name: 'the className lands on the card root',
      props: {
        id: 't9',
        name: 'read_file',
        input: { path: 'a.ts' },
        status: 'done',
        className: 'my-tool-row',
      },
    },
    {
      name: 'a failed result reads as failed',
      props: {
        id: 't10',
        name: 'write_file',
        input: { path: 'src/a.ts' },
        output: { error: 'permission denied writing src/a.ts' },
        status: 'error',
      },
    },
    {
      name: 'a missing file is told apart from a plain failure',
      props: {
        id: 't11',
        name: 'read_file',
        input: { path: 'src/gone.ts' },
        output: { error: 'No such file or directory' },
        status: 'done',
      },
    },
    {
      name: 'a call the person skipped reads as skipped, never as a success',
      props: {
        id: 't12',
        name: 'exec_command',
        input: { command: 'npm run build' },
        output: {
          status: 'skipped_by_user',
          message: 'This command did not run to completion — the person skipped it.',
        },
        status: 'done',
      },
    },
    {
      name: 'a call a restart cut off reads as interrupted, not as done',
      props: {
        id: 't13',
        name: 'exec_command',
        input: { command: 'npm test' },
        output: { status: 'interrupted_by_restart' },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'the light theme fades the diff stats to the light palette',
      props: {
        id: 't14',
        name: 'edit_file',
        input: {
          path: 'src/a.ts',
          replacements: [{ old_string: 'a', new_string: 'b' }],
        },
        output: { replacementsApplied: 1 },
        status: 'done',
      },
      context: { theme: 'light' },
    },
    {
      name: 'a coarse pointer grows the row and always shows the undo control',
      props: {
        id: 't15',
        name: 'edit_file',
        input: {
          path: 'src/a.ts',
          replacements: [{ old_string: 'a', new_string: 'b' }],
        },
        output: { replacementsApplied: 1 },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
      },
      callbacks: ['onFileRevert', 'onUndoToggle'],
      pointer: 'coarse',
    },
    {
      name: 'the label follows a locale switch',
      props: {
        id: 't16',
        name: 'read_file',
        input: { path: 'src/index.ts' },
        output: { content: 'export {}' },
        status: 'done',
      },
      interactions: [{ type: 'locale', locale: 'en-XA' }],
    },

    // ── exec_command: the IN / OUT pane ────────────────────────────────────
    {
      name: 'a command expands to its request and its output',
      props: {
        id: 'c1',
        name: 'exec_command',
        input: { command: 'npx playwright test' },
        output: { stdout: 'Running 3 tests\n', stderr: '', exitCode: 0 },
        status: 'done',
      },
      interactions: [
        { type: 'click', selector: ROW },
        { type: 'click', selector: ROW },
      ],
    },
    {
      name: 'a failing command shows stderr and its exit code',
      props: {
        id: 'c2',
        name: 'exec_command',
        input: { command: 'npm run build' },
        output: { stdout: '', stderr: 'error TS2322: bad type', exitCode: 2 },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a command with output only adds no stderr block',
      props: {
        id: 'c3',
        name: 'exec_command',
        input: { command: 'ls' },
        output: { stdout: 'src\npackage.json\n', exitCode: 0 },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a command that printed nothing says so',
      props: {
        id: 'c4',
        name: 'exec_command',
        input: { command: 'true' },
        output: { exitCode: 0 },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a command result the restart cut off explains itself',
      props: {
        id: 'c5',
        name: 'exec_command',
        input: { command: 'sleep 90' },
        output: { status: 'interrupted_by_restart' },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a command error result renders in the error colour',
      props: {
        id: 'c6',
        name: 'exec_command',
        input: { command: 'npm install' },
        output: { error: 'spawn ENOENT' },
        status: 'error',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },

    // ── web_fetch ───────────────────────────────────────────────────────────
    {
      name: 'a fetch expands to its request and a successful body',
      props: {
        id: 'w1',
        name: 'web_fetch',
        input: { method: 'POST', url: 'https://example.com/api' },
        output: { status: 200, body: '{"ok":true}' },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a fetch that failed shows its status in the error colour',
      props: {
        id: 'w2',
        name: 'web_fetch',
        input: { url: 'https://example.com/missing' },
        output: { status: 404, body: 'not here' },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a fetch body is truncated past 2000 characters',
      props: {
        id: 'w3',
        name: 'web_fetch',
        input: { url: 'https://example.com/big' },
        output: { status: 200, body: 'y'.repeat(2001) },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a fetch without a body shows its status alone',
      props: {
        id: 'w4',
        name: 'web_fetch',
        input: { url: 'https://example.com/empty' },
        output: { status: 204 },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },

    // ── write_file / edit_file: diffs and undo ─────────────────────────────
    {
      name: 'a new file reports its line count',
      props: {
        id: 'f1',
        name: 'write_file',
        input: { path: 'src/new.ts', content: 'a\nb\n' },
        output: { diff: { type: 'new', linesAdded: 2, linesRemoved: 0 } },
        status: 'done',
      },
      callbacks: ['onFileOpen', 'onFileDoubleClick'],
      interactions: [{ type: 'dblclick', selector: ROW }],
    },
    {
      name: 'a modified file reports its added and removed lines',
      props: {
        id: 'f2',
        name: 'write_file',
        input: { path: 'src/a.ts', content: 'b\n' },
        output: { diff: { type: 'modified', linesAdded: 1, linesRemoved: 1 } },
        status: 'done',
      },
    },
    {
      name: 'an unchanged write says unchanged',
      props: {
        id: 'f3',
        name: 'write_file',
        input: { path: 'src/a.ts', content: 'a\n' },
        output: { diff: { type: 'unchanged', linesAdded: 0, linesRemoved: 0 } },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a write without a diff reports it was written',
      props: {
        id: 'f4',
        name: 'write_file',
        input: { path: 'src/a.ts', content: 'a\n' },
        output: {},
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'clicking a modified file opens its diff',
      props: {
        id: 'f5',
        name: 'write_file',
        input: { path: 'src/a.ts', content: 'b\n' },
        output: { diff: { type: 'modified', linesAdded: 1, linesRemoved: 1 } },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
      },
      callbacks: ['onFileDiff'],
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'undoing a change writes the original back and reports it',
      props: {
        id: 'f6',
        name: 'edit_file',
        input: { path: 'src/a.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
        output: { replacementsApplied: 1 },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
      },
      callbacks: ['onFileRevert', 'onUndoToggle'],
      callbackResults: { onFileRevert: { resolve: undefined } },
      interactions: [
        { type: 'click', selector: '[title="Undo this change"]' },
        { type: 'click', selector: '[title="Re-apply this change"]' },
      ],
    },
    {
      name: 'a change the host marked undone offers to re-apply it',
      props: {
        id: 'f7',
        name: 'edit_file',
        input: { path: 'src/a.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
        output: { replacementsApplied: 1 },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
        isUndone: true,
      },
      callbacks: ['onFileRevert', 'onUndoToggle'],
      callbackResults: { onFileRevert: { resolve: undefined } },
      interactions: [{ type: 'click', selector: '[title="Re-apply this change"]' }],
    },
    {
      name: 'a revert the host rejects is logged and leaves the change as it was',
      props: {
        id: 'f9',
        name: 'edit_file',
        input: { path: 'src/a.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
        output: { replacementsApplied: 1 },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
      },
      callbacks: ['onFileRevert', 'onUndoToggle'],
      callbackResults: { onFileRevert: { reject: 'the file is read-only' } },
      interactions: [{ type: 'click', selector: '[title="Undo this change"]' }],
    },
    {
      name: 'a malformed edit still reports the applied count',
      props: {
        id: 'f8',
        name: 'edit_file',
        input: { path: 'src/a.ts', replacements: [{ old_string: 7, new_string: null }] },
        output: { replacementsApplied: undefined },
        status: 'done',
      },
    },

    // ── listing, search, rename: the expanded result rows ──────────────────
    {
      name: 'a listing expands to its entries',
      props: {
        id: 'l1',
        name: 'list_files',
        input: { path: 'src' },
        output: {
          entries: [
            { name: 'app', type: 'directory' },
            { name: 'index.ts', type: 'file' },
          ],
        },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'an empty listing says it is empty',
      props: {
        id: 'l2',
        name: 'list_files',
        input: { path: 'src' },
        output: { entries: [] },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a file find expands to its paths',
      props: {
        id: 'l3',
        name: 'find_files',
        input: { pattern: '*.ts', path: 'src' },
        output: { files: ['src/a.ts', 'src/b.ts'] },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a find that matched nothing says so',
      props: {
        id: 'l4',
        name: 'find_files',
        input: { pattern: '*.zzz' },
        output: { files: [] },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a search expands to its matches and counts the rest',
      props: {
        id: 'l5',
        name: 'search_files',
        input: { pattern: 'useState', path: 'src', include: '*.tsx' },
        output: {
          matches: Array.from({ length: 32 }, (_, i) => ({
            file: `src/f${i}.tsx`,
            line: String(i + 1),
            content: '  const [x] = useState(0)',
          })),
        },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a search that matched nothing says so',
      props: {
        id: 'l6',
        name: 'search_files',
        input: { pattern: 'zzz' },
        output: { matches: [] },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a rename expands to the old and new paths',
      props: {
        id: 'l7',
        name: 'rename_file',
        input: { old_path: 'src/a.ts', new_path: 'src/b.ts' },
        output: {},
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },

    // ── find_package ───────────────────────────────────────────────────────
    {
      name: 'package matches open their docs',
      props: {
        id: 'p1',
        name: 'find_package',
        input: { query: 'ui' },
        output: {
          results: [
            { name: '@molecule/app-ui', label: 'UI contracts' },
            { name: '@molecule/app-ui-react' },
          ],
        },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [
        { type: 'click', selector: ROW },
        { type: 'mouseenter', selector: '[data-mol-id="find-package-result-0"]' },
        { type: 'mouseleave', selector: '[data-mol-id="find-package-result-0"]' },
        { type: 'keydown', selector: '[data-mol-id="find-package-result-0"]', key: 'Enter' },
      ],
    },
    {
      name: 'package matches parsed from markdown when no results array exists',
      props: {
        id: 'p2',
        name: 'find_package',
        input: { query: 'auth' },
        output: {
          packages: '### `@molecule/app-auth` — Login and session\n### `@molecule/app-auth-react`',
        },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a package search that matched nothing says so',
      props: {
        id: 'p3',
        name: 'find_package',
        input: { query: 'zzz' },
        output: { results: [] },
        status: 'done',
      },
      interactions: [{ type: 'click', selector: ROW }],
    },

    // ── The card shapes of other tools ─────────────────────────────────────
    {
      name: 'an update_task_list call draws nothing',
      props: {
        id: 'u1',
        name: 'update_task_list',
        input: { tasks: [{ title: 'One', status: 'pending' }] },
        status: 'done',
      },
    },
    {
      name: 'a skill load opens the markdown the result names',
      props: {
        id: 'u2',
        name: 'load_skill',
        input: { name: 'capability-first' },
        output: { name: 'capability-first', path: '.agents/skills/capability-first/SKILL.md' },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [{ type: 'click', selector: 'code button' }],
    },
    {
      name: 'a molecule doc row opens the package README',
      props: {
        id: 'u3',
        name: 'read_molecule_doc',
        input: { package: '@molecule/app-ui', name: '@molecule/app-ui' },
        status: 'done',
      },
      callbacks: ['onFileOpen'],
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'a wait falls back to the task id it was handed',
      props: {
        id: 'u4',
        name: 'wait_for_task',
        input: { taskId: 'mol-bg-abc-123' },
        output: { taskId: 'mol-bg-abc-123', exitCode: 0 },
        status: 'done',
      },
    },
    {
      name: 'a save plan row opens the plan file',
      props: {
        id: 'u5',
        name: 'save_plan',
        input: {},
        output: { path: 'plans/implementation.md' },
        status: 'done',
      },
      callbacks: ['onFileOpen', 'onFileDoubleClick'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="save-plan-row"]' },
        { type: 'click', selector: '[data-mol-id="save-plan-row"]' },
      ],
    },
    {
      name: 'a named plan keeps its name in the label',
      props: {
        id: 'u6',
        name: 'save_plan',
        input: { name: 'Implementation plan' },
        output: { path: 'plans/implementation.md' },
        status: 'done',
      },
    },

    // ── spawn_agent: the subagent card ─────────────────────────────────────
    {
      name: 'a research subagent shows its report',
      props: {
        id: 's1',
        name: 'spawn_agent',
        input: { type: 'explore', prompt: 'find the routes', model: 'glm-5.3' },
        output: { report: 'The routes live in src/routes.ts.' },
        status: 'done',
      },
    },
    {
      name: 'a long subagent report collapses behind a toggle',
      props: {
        id: 's2',
        name: 'spawn_agent',
        input: { type: 'explore', prompt: 'read everything' },
        output: { report: 'Line of the report.\n'.repeat(40) },
        status: 'done',
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="subagent-report-toggle"]' },
        { type: 'click', selector: '[data-mol-id="subagent-report-toggle"]' },
      ],
    },
    {
      name: 'a judge subagent shows its verdict and issues',
      props: {
        id: 's3',
        name: 'spawn_agent',
        input: { type: 'judge' },
        output: {
          report:
            'VERDICT: FAIL\nISSUES:\n- The landing page still says TODO\n- No test for checkout\n\nEVIDENCE:\nThe walk failed at step 3.',
        },
        status: 'done',
      },
    },
    {
      name: 'a passing judge subagent shows PASS',
      props: {
        id: 's4',
        name: 'spawn_agent',
        input: { type: 'judge' },
        output: { report: 'VERDICT: PASS\nEVIDENCE: every screen rendered.' },
        status: 'done',
      },
    },
    {
      name: 'a failed subagent shows the sentence the server wrote',
      props: {
        id: 's5',
        name: 'spawn_agent',
        input: { type: 'build' },
        output: { error: 'The build subagent ran out of steps.' },
        status: 'error',
      },
    },
    {
      name: 'a subagent that failed with raw error text gets the plain sentence',
      props: {
        id: 's6',
        name: 'spawn_agent',
        input: { type: 'explore' },
        output: { report: 'Subagent failed: connection reset' },
        status: 'done',
      },
    },
    {
      name: 'a subagent a restart interrupted says its effect is unknown',
      props: {
        id: 's7',
        name: 'spawn_agent',
        input: { type: 'explore' },
        output: { status: 'interrupted_by_restart' },
        status: 'done',
      },
    },
    {
      name: 'a background subagent reports what it started',
      props: {
        id: 's8',
        name: 'spawn_agent',
        input: { type: 'build', model: 'sol' },
        output: { agentId: 'agent-1', changedPaths: ['src/a.ts', 3] },
        status: 'running',
      },
    },
    {
      name: 'a judge report with no verdict line renders as the plain report',
      props: {
        id: 's9',
        name: 'spawn_agent',
        input: { type: 'judge' },
        output: { report: 'I could not reach the app.' },
        status: 'done',
      },
    },

    // ── Ask user ───────────────────────────────────────────────────────────
    {
      name: 'a question renders its options and answers on click',
      props: {
        id: 'a1',
        name: 'ask_user',
        input: {
          question: 'Which **framework** should the app use?',
          options: ['React', { label: 'Vue', description: 'Composition API' }],
          hint: 'Pick the one your team knows.',
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="ask-user-option-1"]' },
        { type: 'mouseleave', selector: '[data-mol-id="ask-user-option-1"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-option-1"]' },
      ],
    },
    {
      name: 'a question without a question renders nothing',
      props: {
        id: 'a2',
        name: 'ask_user',
        input: { options: ['One'] },
        status: 'running',
      },
    },
    {
      name: 'a multi-select question confirms the picked labels as one answer',
      props: {
        id: 'a3',
        name: 'ask_user',
        input: {
          question: 'Which checks should run?',
          options: ['Unit', 'E2E', 'Lint'],
          multiSelect: true,
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="ask-user-option-0"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-option-2"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-option-2"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-option-1"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-multiselect-confirm"]' },
      ],
    },
    {
      name: 'a free-text answer is typed and sent with Enter',
      props: {
        id: 'a4',
        name: 'ask_user',
        input: { question: "What's your bakery called?", options: [], allowFreeText: true },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
      interactions: [
        { type: 'input', selector: 'input', value: 'Crumb & Co' },
        { type: 'keydown', selector: 'input', key: 'Enter' },
      ],
    },
    {
      name: 'the free-text box is hidden when the model opts out',
      props: {
        id: 'a5',
        name: 'ask_user',
        input: { question: 'Pick one', options: ['A', 'B'], allowFreeText: false },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
    },
    {
      name: 'a free-text answer already given is shown under the options',
      props: {
        id: 'a6',
        name: 'ask_user',
        input: { question: 'What should we build?', options: ['A recipe box', 'A blog'] },
        output: 'A bakery site',
        status: 'done',
      },
    },
    {
      name: 'a rich option shows the compare pane on a wide screen',
      props: {
        id: 'a7',
        name: 'ask_user',
        input: {
          question: 'Which hero do you prefer?',
          options: [
            { label: 'Split hero', preview: '# Split\nA big one.' },
            { label: 'Centered hero', preview: '# Centered\n- one\n- two' },
          ],
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="ask-user-option-1"]' },
        { type: 'mouseleave', selector: '[data-mol-id="ask-user-option-1"]' },
      ],
    },
    {
      name: 'a rich option expands its preview inline on a narrow screen',
      props: {
        id: 'a8',
        name: 'ask_user',
        input: {
          question: 'Which hero do you prefer?',
          options: [{ label: 'Split hero', preview: '# Split\nA big one.' }],
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
      pointer: 'coarse',
      viewportWidth: 400,
      interactions: [
        { type: 'click', selector: '[data-mol-id="ask-user-option-preview-0"]' },
        { type: 'click', selector: '[data-mol-id="ask-user-option-preview-0"]' },
      ],
    },
    {
      name: 'the plan review card shows the plan and its decisions',
      props: {
        id: 'a9',
        name: 'ask_user',
        input: {
          question: 'Approve the plan?',
          options: ['Approve', 'Request changes'],
          planReview: {
            path: 'plans/implementation.md',
            name: 'Bakery site',
            steps: 6,
            preview: ['Set up the app', 'Build the menu page', 'Run the tests'],
            goesLive: true,
          },
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse', 'onFileOpen'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="plan-review-open"]' },
        { type: 'click', selector: '[data-mol-id="plan-review-cta-0"]' },
      ],
    },
    {
      name: 'a plan review with no name falls back to its file name',
      props: {
        id: 'a10',
        name: 'ask_user',
        input: {
          question: 'Approve the plan?',
          options: ['Approve', 'Request changes'],
          planReview: { path: 'plans/checkout.md', steps: 2, preview: [] },
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      },
      callbacks: ['onAskUserResponse'],
    },
    {
      name: 'an answered question fades the options that were not picked',
      props: {
        id: 'a11',
        name: 'ask_user',
        input: { question: 'Pick a colour', options: ['Red', 'Blue'] },
        output: 'Blue',
        status: 'done',
      },
    },

    // ── Skip ───────────────────────────────────────────────────────────────
    {
      name: 'a running call offers Skip and hands the host its id',
      props: {
        id: 'k1',
        name: 'exec_command',
        input: { command: 'npx playwright test' },
        status: 'running',
      },
      callbacks: ['onSkip'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tool-call-skip-k1"]' }],
    },
    {
      name: 'skip returns to rest when the host says nothing was in flight',
      props: {
        id: 'k2',
        name: 'exec_command',
        input: { command: 'sleep 5' },
        status: 'running',
      },
      callbacks: ['onSkip'],
      callbackResults: { onSkip: { returns: false } },
      interactions: [{ type: 'click', selector: '[data-mol-id="tool-call-skip-k2"]' }],
    },
    {
      name: 'a viewer sees Skip disabled with the reason on it',
      props: {
        id: 'k3',
        name: 'exec_command',
        input: { command: 'rm -rf build' },
        status: 'running',
        skipDisabledReason: 'Only editors can skip this.',
      },
      callbacks: ['onSkip'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tool-call-skip-k3"]' }],
    },
    {
      name: 'a finished call offers no Skip',
      props: {
        id: 'k4',
        name: 'exec_command',
        input: { command: 'ls' },
        output: { exitCode: 0, stdout: 'src\n' },
        status: 'done',
      },
      callbacks: ['onSkip'],
    },
  ],
}
