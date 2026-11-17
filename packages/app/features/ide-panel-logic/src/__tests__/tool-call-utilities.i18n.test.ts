import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * Every English word `toolLabel` emits goes through the CALLER's translate
 * function (`ide.tool.*`, the ide locale bond) with the file names, commands
 * and other data riding along as `` `backtick` `` segments or
 * `{{placeholder}}`s. A MARKER translator — one that names the key it was
 * called with and interpolates the English default — proves the words travel
 * through `t` while the data segments survive verbatim: a label refactor that
 * hardcoded English (or shredded the backtick markup a translation must keep)
 * fails here. The marker is passed in as the first parameter (the
 * caller-supplied-translate-function contract), the way the card passes
 * `useTranslation()`'s `t`.
 *
 * @module
 */
import { toolLabel } from '../components/tool-call-utilities.js'

/** Marker translator: `⟦<key>⟧<interpolated English default>`. */
const markerT: TranslateFunction = (key, values, opts) => {
  const filled = (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )
  return `⟦${key}⟧${filled}`
}

describe('toolLabel routes its English through ide.tool.* keys (marker translator)', () => {
  it('names the key for the plain verbs and keeps the backtick data segment', () => {
    expect(toolLabel(markerT, 'list_files', { path: 'src/components' })).toBe(
      '⟦ide.tool.list⟧List `components`',
    )
    expect(toolLabel(markerT, 'write_file', { path: 'src/types.ts' })).toBe(
      '⟦ide.tool.write⟧Write `types.ts`',
    )
    expect(toolLabel(markerT, 'edit_file', { path: 'a/b/c.tsx' })).toBe(
      '⟦ide.tool.edit⟧Edit `c.tsx`',
    )
    expect(toolLabel(markerT, 'delete_file', { path: 'temp.log' })).toBe(
      '⟦ide.tool.delete⟧Delete `temp.log`',
    )
  })

  it('keeps every batch-read backtick segment while the verb goes through t', () => {
    expect(toolLabel(markerT, 'read_file', { paths: ['a/App.tsx', 'b/Home.tsx'] })).toBe(
      '⟦ide.tool.read⟧Read `App.tsx`, `Home.tsx`',
    )
    // The "+N more" tally is its own key with the count as data.
    expect(
      toolLabel(markerT, 'read_file', { paths: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'] }),
    ).toBe('⟦ide.tool.read⟧Read `a.ts`, `b.ts`, `c.ts` ⟦ide.tool.readMore⟧+2 more')
  })

  it('interpolates placeholders as data (host, source, mode, model, plan name)', () => {
    expect(toolLabel(markerT, 'web_fetch', { url: 'https://example.com/api/data' })).toBe(
      '⟦ide.tool.fetchHost⟧Fetch example.com',
    )
    expect(toolLabel(markerT, 'read_logs', { source: 'server' })).toBe(
      '⟦ide.tool.readSourceLogs⟧Read server logs',
    )
    expect(toolLabel(markerT, 'set_mode', { mode: 'plan' })).toBe(
      '⟦ide.tool.switchToMode⟧Switch to plan mode',
    )
    expect(toolLabel(markerT, 'spawn_agent', { type: 'judge', model: 'gpt-6.1-sol' })).toBe(
      '⟦ide.tool.subagentJudgeOn⟧Subagent — acceptance judge on gpt-6.1-sol',
    )
    // The plan name is data inside the label's backtick markup (a backtick in it
    // is substituted, never dropped) — and the name travels through {{name}}.
    expect(toolLabel(markerT, 'save_plan', { name: 'milestone `one`' })).toBe(
      "⟦ide.tool.savePlanNamed⟧Save plan `milestone 'one'`",
    )
  })

  it('translates the sentence-shaped labels as whole keys', () => {
    expect(toolLabel(markerT, 'reload_preview', {})).toBe('⟦ide.tool.reloadPreview⟧Reload preview')
    expect(toolLabel(markerT, 'restart_preview', { restart: true })).toBe(
      '⟦ide.tool.restartPreviewServers⟧Restart preview servers',
    )
    expect(toolLabel(markerT, 'list_sessions', {})).toBe(
      '⟦ide.tool.listSessions⟧Other sessions on this project',
    )
    expect(
      toolLabel(markerT, 'update_task_list', { todos: [{ content: 'a' }, { content: 'b' }] }),
    ).toBe('⟦ide.tool.workingPlanTasks⟧Working plan — 2 tasks')
    // A background command's executor reason is model-authored data; only the
    // "(background)" suffix around it is our text.
    expect(
      toolLabel(markerT, 'exec_command', { description: 'Install deps', run_in_background: true }),
    ).toBe('⟦ide.tool.descriptionBackground⟧Install deps (background)')
  })
})
