import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-i18n', () => ({
  t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue: string }) =>
    opts?.defaultValue
      ? Object.entries(values ?? {}).reduce(
          (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
          opts.defaultValue,
        )
      : key,
}))

import {
  basename,
  diffLineCount,
  extractFilePath,
  fileDiffStats,
  moleculeDocPath,
  parseJudgeVerdict,
  readFileLabelEntries,
  readFilePaths,
  toolLabel,
  toolSummary,
} from '../components/tool-call-utilities.js'

// ---------------------------------------------------------------------------
// basename
// ---------------------------------------------------------------------------

describe('basename', () => {
  it('extracts last segment from a path', () => {
    expect(basename('a/b/c.ts')).toBe('c.ts')
  })

  it('returns the filename when no slashes', () => {
    expect(basename('file.ts')).toBe('file.ts')
  })

  it('returns empty string for undefined', () => {
    expect(basename(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(basename('')).toBe('')
  })

  it('handles trailing slash', () => {
    expect(basename('a/b/')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// toolLabel
// ---------------------------------------------------------------------------

describe('toolLabel', () => {
  it('labels list_files with basename', () => {
    expect(toolLabel('list_files', { path: 'src/components' })).toBe('List `components`')
  })

  it('labels list_files with "project" when no path', () => {
    expect(toolLabel('list_files', {})).toBe('List `project`')
  })

  it('labels read_file with basename', () => {
    expect(toolLabel('read_file', { path: 'src/index.ts' })).toBe('Read `index.ts`')
  })

  it('labels a batch read_file with every file it read', () => {
    expect(toolLabel('read_file', { paths: ['a/App.tsx', 'b/Home.tsx'] })).toBe(
      'Read `App.tsx`, `Home.tsx`',
    )
  })

  it('counts the files a long batch read_file does not spell out', () => {
    expect(toolLabel('read_file', { paths: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'] })).toBe(
      'Read `a.ts`, `b.ts`, `c.ts` +2 more',
    )
  })

  it('labels read_file with no backticks while its input is still streaming', () => {
    expect(toolLabel('read_file', undefined)).toBe('Read')
    expect(toolLabel('read_file', { paths: [] })).toBe('Read')
  })

  it('never leaves a dangling comma for a path whose basename is empty', () => {
    // `src/` has no basename, so it names nothing — spending a named slot on it
    // rendered `Read , \`Home.tsx\``. It must not, and it still counts as a
    // file read in the "+N more" tally.
    expect(toolLabel('read_file', { paths: ['src/', 'b/Home.tsx'] })).toBe(
      'Read `Home.tsx` +1 more',
    )
    expect(toolLabel('read_file', { paths: ['/'] })).toBe('Read +1 more')
  })

  it('opens the first file of a batch read_file', () => {
    expect(extractFilePath('read_file', { paths: ['x/a.ts', 'x/b.ts'] })).toBe('x/a.ts')
    expect(readFilePaths({ paths: ['x/a.ts', 7, ''] })).toEqual(['x/a.ts'])
  })

  it('pairs each label name with the path it belongs to, dropping nameless paths', () => {
    // The single list the label's names AND their click targets are indexed
    // from: `src/` names nothing, so it must not occupy a slot (its presence in
    // the raw path list is what made a name open the wrong file).
    expect(readFileLabelEntries({ paths: ['src/', 'x/a.ts', 'y/b.ts'] })).toEqual([
      { name: 'a.ts', path: 'x/a.ts' },
      { name: 'b.ts', path: 'y/b.ts' },
    ])
    expect(readFileLabelEntries({ path: 'x/a.ts' })).toEqual([{ name: 'a.ts', path: 'x/a.ts' }])
    expect(readFileLabelEntries({ paths: ['/'] })).toEqual([])
  })

  it('labels write_file with basename', () => {
    expect(toolLabel('write_file', { path: 'src/types.ts' })).toBe('Write `types.ts`')
  })

  it('labels edit_file with basename', () => {
    expect(toolLabel('edit_file', { path: 'a/b/c.tsx' })).toBe('Edit `c.tsx`')
  })

  it('labels search_files with pattern', () => {
    expect(toolLabel('search_files', { pattern: 'TODO' })).toBe('Search `TODO`')
  })

  it('labels create_directory with basename', () => {
    expect(toolLabel('create_directory', { path: 'src/utils' })).toBe('Create dir `utils`')
  })

  it('labels rename_file with old basename', () => {
    expect(toolLabel('rename_file', { old_path: 'a/old.ts', new_path: 'a/new.ts' })).toBe(
      'Rename `old.ts`',
    )
  })

  it('labels delete_file with basename', () => {
    expect(toolLabel('delete_file', { path: 'temp.log' })).toBe('Delete `temp.log`')
  })

  it('labels find_files with pattern', () => {
    expect(toolLabel('find_files', { pattern: '*.test.ts' })).toBe('Find `*.test.ts`')
  })

  it('labels web_fetch with hostname', () => {
    expect(toolLabel('web_fetch', { url: 'https://example.com/api/data' })).toBe(
      'Fetch example.com',
    )
  })

  it('labels web_fetch with raw URL on invalid URL', () => {
    expect(toolLabel('web_fetch', { url: 'not-a-url' })).toBe('Fetch not-a-url')
  })

  it('labels load_skill with the skill name', () => {
    expect(toolLabel('load_skill', { name: 'styling' })).toBe('Load skill `styling`')
    expect(toolLabel('load_skill', {})).toBe('Load skill')
  })

  it('labels exec_command with truncated command', () => {
    expect(toolLabel('exec_command', { command: 'npm test' })).toBe('Bash `npm test`')
  })

  it('truncates exec_command at 60 chars with ellipsis', () => {
    const longCmd = 'a'.repeat(80)
    const label = toolLabel('exec_command', { command: longCmd })
    expect(label).toBe(`Bash \`${'a'.repeat(60)}…\``)
  })

  it('labels ask_user with question text', () => {
    expect(toolLabel('ask_user', { question: 'Continue?' })).toBe('Continue?')
  })

  it('labels ask_user with "Question" when no question', () => {
    expect(toolLabel('ask_user', {})).toBe('Question')
  })

  it('falls back to formatted name for unknown tools', () => {
    expect(toolLabel('custom_tool', {})).toBe('Custom tool')
  })

  it('labels find_package with the query, falling back to category', () => {
    expect(toolLabel('find_package', { query: 'send email' })).toBe('Find package `send email`')
    expect(toolLabel('find_package', { category: 'payments' })).toBe('Find package `payments`')
    expect(toolLabel('find_package', {})).toBe('Find package')
  })

  it('labels read_molecule_doc with the normalized package name', () => {
    expect(toolLabel('read_molecule_doc', { name: '@molecule/api-payments-stripe' })).toBe(
      'Read docs `@molecule/api-payments-stripe`',
    )
    expect(toolLabel('read_molecule_doc', { name: 'api-payments-stripe' })).toBe(
      'Read docs `@molecule/api-payments-stripe`',
    )
    expect(toolLabel('read_molecule_doc', {})).toBe('Read docs')
  })

  it('handles null/empty input without flashing empty backticks', () => {
    // While a tool call streams, its input arrives a beat after the block is
    // created — the label must omit the backticks entirely (not render `Read ``)
    // until the path is known.
    expect(toolLabel('read_file', null)).toBe('Read')
    expect(toolLabel('read_file', {})).toBe('Read')
    expect(toolLabel('search_files', {})).toBe('Search')
    expect(toolLabel('exec_command', {})).toBe('Bash')
  })

  it('labels sandbox_fetch with method + protocol-stripped URL', () => {
    expect(toolLabel('sandbox_fetch', { url: 'http://localhost:4000/api/todos' })).toBe(
      'GET `localhost:4000/api/todos`',
    )
    expect(
      toolLabel('sandbox_fetch', { url: 'http://localhost:4000/api/todos', method: 'post' }),
    ).toBe('POST `localhost:4000/api/todos`')
    expect(toolLabel('sandbox_fetch', {})).toBe('GET')
  })

  it('labels navigate_preview with the target path', () => {
    expect(toolLabel('navigate_preview', { path: '/dashboard' })).toBe('Go to `/dashboard`')
    expect(toolLabel('navigate_preview', {})).toBe('Go to')
  })

  it('labels open_file with basename', () => {
    expect(toolLabel('open_file', { path: 'app/src/pages/Dashboard.tsx' })).toBe(
      'Open `Dashboard.tsx`',
    )
  })

  it('labels interact_preview by action verb + target, never the value', () => {
    expect(toolLabel('interact_preview', { action: 'click', text: 'Sign up' })).toBe(
      'Click `Sign up`',
    )
    expect(
      toolLabel('interact_preview', { action: 'fill', molId: 'password-input', value: 'hunter2' }),
    ).toBe('Fill `password-input`')
    expect(toolLabel('interact_preview', { action: 'select', text: 'Country' })).toBe(
      'Select `Country`',
    )
    expect(toolLabel('interact_preview', { action: 'waitFor', selector: '.toast' })).toBe(
      'Wait for `.toast`',
    )
    // text beats molId (the visible name reads best), molId beats selector
    expect(
      toolLabel('interact_preview', { action: 'click', text: 'Save', molId: 'save-btn' }),
    ).toBe('Click `Save`')
    // Streaming: action not yet arrived → generic verb, no empty backticks
    expect(toolLabel('interact_preview', {})).toBe('Interact')
  })

  it('labels the preview/IDE state tools with plain verbs', () => {
    expect(toolLabel('read_preview_ui', {})).toBe('Inspect preview')
    expect(toolLabel('reload_preview', {})).toBe('Reload preview')
    expect(toolLabel('restart_preview', {})).toBe('Start preview servers')
    expect(toolLabel('restart_preview', { restart: true })).toBe('Restart preview servers')
    expect(toolLabel('get_ide_state', {})).toBe('Check IDE status')
    expect(toolLabel('request_repo_import', { reason: 'to add the feature' })).toBe(
      'Import repository',
    )
  })

  it('labels read_logs with source and optional filter', () => {
    expect(toolLabel('read_logs', { source: 'api' })).toBe('Read api logs')
    expect(toolLabel('read_logs', { source: 'all' })).toBe('Read logs')
    expect(toolLabel('read_logs', { source: 'browser', filter: 'error' })).toBe(
      'Read browser logs `error`',
    )
    expect(toolLabel('read_logs', {})).toBe('Read logs')
  })

  it('labels find_example, save_script and web_search with their key argument', () => {
    expect(toolLabel('find_example', { query: 'reset password' })).toBe(
      'Find example `reset password`',
    )
    expect(toolLabel('save_script', { name: 'run-tests' })).toBe('Save script `run-tests`')
    expect(toolLabel('web_search', { query: 'vite hmr websocket error' })).toBe(
      'Search web `vite hmr websocket error`',
    )
  })

  it('falls back to the salient string argument for unknown tools', () => {
    expect(toolLabel('mystery_tool', { path: 'src/thing.ts' })).toBe('Mystery tool `src/thing.ts`')
    expect(toolLabel('mystery_tool', { query: 'how do I' })).toBe('Mystery tool `how do I`')
    expect(toolLabel('mystery_tool', { count: 3 })).toBe('Mystery tool')
    const long = 'x'.repeat(80)
    expect(toolLabel('mystery_tool', { query: long })).toBe(`Mystery tool \`${'x'.repeat(40)}…\``)
  })
})

// ---------------------------------------------------------------------------
// toolSummary
// ---------------------------------------------------------------------------

describe('toolSummary', () => {
  it('returns empty for pending status', () => {
    expect(toolSummary('read_file', null, 'pending')).toBe('')
  })

  it('returns Running (no ellipsis) for running status', () => {
    expect(toolSummary('read_file', null, 'running')).toBe('Running')
  })

  it('returns Not found for "not found" errors', () => {
    expect(toolSummary('read_file', { error: 'File not found' }, 'done')).toBe('Not found')
  })

  it('returns Not found for "no such file" errors', () => {
    expect(toolSummary('read_file', { error: 'ENOENT: no such file' }, 'done')).toBe('Not found')
  })

  it('returns Permission denied for permission errors', () => {
    expect(toolSummary('write_file', { error: 'Permission denied' }, 'done')).toBe(
      'Permission denied',
    )
  })

  it('returns Permission denied for access denied errors', () => {
    expect(toolSummary('read_file', { error: 'Access denied to path' }, 'done')).toBe(
      'Permission denied',
    )
  })

  it('returns Failed for generic errors', () => {
    expect(toolSummary('read_file', { error: 'Something went wrong' }, 'done')).toBe('Failed')
  })

  it('returns Unchanged for write_file with unchanged diff', () => {
    expect(toolSummary('write_file', { diff: { type: 'unchanged' } }, 'done')).toBe('Unchanged')
  })

  it('returns empty for write_file with no diff', () => {
    expect(toolSummary('write_file', {}, 'done')).toBe('')
  })

  it('returns empty for write_file with modified diff', () => {
    expect(
      toolSummary(
        'write_file',
        { diff: { type: 'modified', linesAdded: 5, linesRemoved: 3 } },
        'done',
      ),
    ).toBe('')
  })

  it('returns entry count for list_files', () => {
    expect(toolSummary('list_files', { entries: [1, 2, 3] }, 'done')).toBe('3 entries')
  })

  it('returns empty for list_files with no entries', () => {
    expect(toolSummary('list_files', {}, 'done')).toBe('')
  })

  it('returns match count for search_files', () => {
    expect(toolSummary('search_files', { matches: [1] }, 'done')).toBe('1 matches')
  })

  it('returns file count for find_files', () => {
    expect(toolSummary('find_files', { files: [1, 2] }, 'done')).toBe('2 files')
  })

  it('returns empty for edit_file', () => {
    expect(toolSummary('edit_file', {}, 'done')).toBe('')
  })

  it('returns empty for read_file', () => {
    expect(toolSummary('read_file', {}, 'done')).toBe('')
  })

  it('returns Not found for web_fetch 404', () => {
    expect(toolSummary('web_fetch', { status: 404 }, 'done')).toBe('Not found')
  })

  it('returns Failed for web_fetch 4xx', () => {
    expect(toolSummary('web_fetch', { status: 403 }, 'done')).toBe('Failed')
  })

  it('returns Server error for web_fetch 5xx', () => {
    expect(toolSummary('web_fetch', { status: 500 }, 'done')).toBe('Server error')
  })

  it('returns empty for web_fetch 2xx', () => {
    expect(toolSummary('web_fetch', { status: 200 }, 'done')).toBe('')
  })

  it('returns Failed for exec_command with non-zero exit code', () => {
    expect(toolSummary('exec_command', { exitCode: 1 }, 'done')).toBe('Failed')
  })

  it('returns empty for exec_command with zero exit code', () => {
    expect(toolSummary('exec_command', { exitCode: 0 }, 'done')).toBe('')
  })

  it('returns response text for ask_user string output', () => {
    expect(
      toolSummary('ask_user', 'user response' as unknown as Record<string, unknown>, 'done'),
    ).toBe('user response')
  })

  it('returns empty for ask_user awaiting response', () => {
    expect(toolSummary('ask_user', { status: 'awaiting_response' }, 'done')).toBe('')
  })

  it('returns empty for unknown tools', () => {
    expect(toolSummary('unknown_tool', {}, 'done')).toBe('')
  })

  it('returns package count for find_package', () => {
    expect(toolSummary('find_package', { found: 3 }, 'done')).toBe('3 packages')
    expect(toolSummary('find_package', { found: 0 }, 'done')).toBe('No matches')
    expect(toolSummary('find_package', {}, 'done')).toBe('')
  })

  it('maps sandbox_fetch statuses like web_fetch', () => {
    expect(toolSummary('sandbox_fetch', { status: 200 }, 'done')).toBe('')
    expect(toolSummary('sandbox_fetch', { status: 404 }, 'done')).toBe('Not found')
    expect(toolSummary('sandbox_fetch', { status: 422 }, 'done')).toBe('Failed')
    expect(toolSummary('sandbox_fetch', { status: 500 }, 'done')).toBe('Server error')
    expect(toolSummary('sandbox_fetch', {}, 'done')).toBe('')
  })

  it('shows where the preview actually landed for navigate/interact', () => {
    expect(
      toolSummary(
        'navigate_preview',
        { url: 'https://p-abc123.preview.molecule.dev/login?next=%2Fdashboard' },
        'done',
      ),
    ).toBe('/login?next=%2Fdashboard')
    expect(toolSummary('interact_preview', { url: '/dashboard' }, 'done')).toBe('/dashboard')
    expect(toolSummary('navigate_preview', {}, 'done')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// diffLineCount (LCS algorithm)
// ---------------------------------------------------------------------------

describe('diffLineCount', () => {
  it('returns zero for identical arrays', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({ added: 0, removed: 0 })
  })

  it('counts added lines', () => {
    expect(diffLineCount(['a'], ['a', 'b', 'c'])).toEqual({ added: 2, removed: 0 })
  })

  it('counts removed lines', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['a'])).toEqual({ added: 0, removed: 2 })
  })

  it('counts both added and removed', () => {
    expect(diffLineCount(['a', 'b'], ['b', 'c'])).toEqual({ added: 1, removed: 1 })
  })

  it('handles completely different content', () => {
    expect(diffLineCount(['a', 'b'], ['c', 'd'])).toEqual({ added: 2, removed: 2 })
  })

  it('handles empty old array', () => {
    expect(diffLineCount([], ['a', 'b'])).toEqual({ added: 2, removed: 0 })
  })

  it('handles empty new array', () => {
    expect(diffLineCount(['a', 'b'], [])).toEqual({ added: 0, removed: 2 })
  })

  it('handles both empty arrays', () => {
    expect(diffLineCount([], [])).toEqual({ added: 0, removed: 0 })
  })

  it('handles interleaved changes', () => {
    expect(diffLineCount(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'y'])).toEqual({
      added: 2,
      removed: 2,
    })
  })

  it('handles duplicate lines', () => {
    expect(diffLineCount(['a', 'a', 'a'], ['a', 'a'])).toEqual({ added: 0, removed: 1 })
  })

  it('counts a moved line as added and removed, not as unchanged', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['b', 'c', 'a'])).toEqual({ added: 1, removed: 1 })
  })

  it('stays exact on a large file with a small edit in the middle', () => {
    const oldLines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const newLines = [...oldLines]
    newLines[1500] = 'line 1500 edited'
    newLines.splice(1501, 0, 'inserted')
    expect(diffLineCount(oldLines, newLines)).toEqual({ added: 2, removed: 1 })
  })

  it('answers a whole-file rewrite of tens of thousands of lines in bounded time', () => {
    // 20 000 × 20 000 lines is a 400-million-cell LCS table — the shape an
    // `edit_file` replacement takes when a model rewrites a file whole, and the
    // one that used to allocate gigabytes inside the card's render.
    const oldLines = Array.from({ length: 20_000 }, (_, i) => `old line ${i}`)
    const newLines = Array.from({ length: 20_000 }, (_, i) => `new line ${i}`)
    const started = performance.now()
    const counts = diffLineCount(oldLines, newLines)
    expect(counts).toEqual({ added: 20_000, removed: 20_000 })
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('never reports a capped (too-large for the exact table) reordering as unchanged', () => {
    // 3000 × 3000 lines is above the LCS cell cap, so the exact table is not
    // built — but only the ORDER of the lines changed, and the count of shared
    // lines must not ignore order: the order-ignoring multiset this used to
    // fall back on found all 3000 lines on both sides and answered
    // `{ added: 0, removed: 0 }`, i.e. a card claiming a real 1500-line move
    // changed nothing.
    const oldLines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const newLines = [...oldLines.slice(1500), ...oldLines.slice(0, 1500)]
    expect(diffLineCount(oldLines, newLines)).toEqual({ added: 1500, removed: 1500 })
  })

  it('still counts a capped rewrite whose sides share lines in a different order', () => {
    // The same cap, with duplicate lines on the left: the in-order matches are
    // still found, and the count stays a change count rather than a claim of
    // sameness. `}`-heavy blocks are the shape — half the lines are identical
    // braces, so the matches that can be proven are the unique ones.
    const braces = Array.from({ length: 2100 }, () => '}')
    const bodies = Array.from({ length: 2100 }, (_, i) => `body ${i}`)
    const oldLines = [...bodies.slice(0, 1050), ...braces]
    const newLines = [...braces, ...bodies.slice(0, 1050)]
    const counts = diffLineCount(oldLines, newLines)
    expect(counts.added).toBeGreaterThan(0)
    expect(counts.removed).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// fileDiffStats
// ---------------------------------------------------------------------------

describe('fileDiffStats', () => {
  it('returns null for unsupported tool names', () => {
    expect(fileDiffStats('read_file', {}, {})).toBeNull()
  })

  it('returns null for edit_file with no replacements', () => {
    expect(fileDiffStats('edit_file', { replacements: [] }, {})).toBeNull()
  })

  it('returns null for edit_file with missing replacements', () => {
    expect(fileDiffStats('edit_file', {}, {})).toBeNull()
  })

  it('computes stats for edit_file with single replacement', () => {
    const input = {
      replacements: [{ old_string: 'line1\nline2', new_string: 'line1\nline2\nline3' }],
    }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 1, removed: 0 })
  })

  it('accumulates stats across multiple replacements', () => {
    const input = {
      replacements: [
        { old_string: 'a', new_string: 'a\nb' },
        { old_string: 'x\ny', new_string: 'z' },
      ],
    }
    const result = fileDiffStats('edit_file', input, {})
    expect(result).toEqual({ added: 2, removed: 2 })
  })

  it('returns stats for write_file new file', () => {
    expect(
      fileDiffStats('write_file', {}, { diff: { type: 'new', linesAdded: 10, linesRemoved: 0 } }),
    ).toEqual({
      added: 10,
      removed: 0,
    })
  })

  it('returns stats for write_file modified file', () => {
    expect(
      fileDiffStats(
        'write_file',
        {},
        { diff: { type: 'modified', linesAdded: 5, linesRemoved: 3 } },
      ),
    ).toEqual({ added: 5, removed: 3 })
  })

  it('returns null for write_file unchanged', () => {
    expect(
      fileDiffStats(
        'write_file',
        {},
        { diff: { type: 'unchanged', linesAdded: 0, linesRemoved: 0 } },
      ),
    ).toBeNull()
  })

  it('returns null for write_file with no diff', () => {
    expect(fileDiffStats('write_file', {}, {})).toBeNull()
  })

  it('skips replacements with undefined old_string or new_string', () => {
    const input = {
      replacements: [
        { old_string: undefined, new_string: 'b' },
        { old_string: 'a', new_string: undefined },
        { old_string: 'x', new_string: 'x\ny' },
      ],
    }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 1, removed: 0 })
  })

  it('returns zero stats when a non-empty replacements list is entirely unreadable', () => {
    const input = {
      replacements: [{ old_string: undefined, new_string: undefined }],
    }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 0, removed: 0 })
  })

  // The card calls this inside a useMemo in its RENDER path, so a replacement
  // entry that is null/undefined (or a bare primitive) must be skipped, not
  // read through — `entry.old_string` on null throws a TypeError that takes the
  // whole IDE down, the same hazard renderIn() guards with `entry ?? {}`.
  it('skips a null replacement entry instead of throwing, and counts the readable ones', () => {
    const input = {
      replacements: [null, { old_string: 'a', new_string: 'a\nb' }],
    }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 1, removed: 0 })
  })

  it('skips undefined and primitive replacement entries instead of throwing', () => {
    const input = {
      replacements: [undefined, 'not-an-entry', 42],
    }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 0, removed: 0 })
  })
})

// ---------------------------------------------------------------------------
// extractFilePath
// ---------------------------------------------------------------------------

describe('extractFilePath', () => {
  it('extracts path for read_file', () => {
    expect(extractFilePath('read_file', { path: 'src/index.ts' })).toBe('src/index.ts')
  })

  it('extracts path for write_file', () => {
    expect(extractFilePath('write_file', { path: 'src/types.ts' })).toBe('src/types.ts')
  })

  it('extracts path for edit_file', () => {
    expect(extractFilePath('edit_file', { path: 'a/b.ts' })).toBe('a/b.ts')
  })

  it('extracts path for open_file', () => {
    expect(extractFilePath('open_file', { path: 'app/src/App.tsx' })).toBe('app/src/App.tsx')
  })

  it('extracts new_path for rename_file', () => {
    expect(extractFilePath('rename_file', { old_path: 'a.ts', new_path: 'b.ts' })).toBe('b.ts')
  })

  it('returns null for unsupported tools', () => {
    expect(extractFilePath('exec_command', { command: 'npm test' })).toBeNull()
    expect(extractFilePath('search_files', { pattern: 'TODO' })).toBeNull()
  })

  it('returns null when path is missing', () => {
    expect(extractFilePath('read_file', {})).toBeNull()
  })

  it('returns null for null input', () => {
    expect(extractFilePath('read_file', null)).toBeNull()
  })

  it('maps read_molecule_doc to the sandbox README.md path', () => {
    expect(extractFilePath('read_molecule_doc', { name: '@molecule/api-payments-stripe' })).toBe(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
    expect(extractFilePath('read_molecule_doc', { name: 'app-ui' })).toBe(
      '/workspace/node_modules/@molecule/app-ui/README.md',
    )
    expect(extractFilePath('read_molecule_doc', {})).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// moleculeDocPath
// ---------------------------------------------------------------------------

describe('moleculeDocPath', () => {
  it('builds the sandbox README.md path with or without the @molecule/ prefix', () => {
    expect(moleculeDocPath('@molecule/api-cache-redis')).toBe(
      '/workspace/node_modules/@molecule/api-cache-redis/README.md',
    )
    expect(moleculeDocPath('api-cache-redis')).toBe(
      '/workspace/node_modules/@molecule/api-cache-redis/README.md',
    )
  })

  it('rejects names that are not plain package slugs', () => {
    expect(moleculeDocPath('../../etc/passwd')).toBeNull()
    expect(moleculeDocPath('@molecule/api cache')).toBeNull()
    expect(moleculeDocPath('')).toBeNull()
    expect(moleculeDocPath(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parseJudgeVerdict
// ---------------------------------------------------------------------------

describe('parseJudgeVerdict', () => {
  it('collects EVERY bullet of the ISSUES block, not just the first', () => {
    // The judge writes one `- ` bullet per failure. Treating a bullet as the
    // block's terminator kept only the first: the card's FAIL list showed one
    // of the three failures the judge named.
    const verdict = parseJudgeVerdict(
      [
        'VERDICT: FAIL',
        '',
        'ISSUES:',
        '- The build script does not exist.',
        '- The acceptance test for the new route is missing.',
        '- The README still documents the removed flag.',
        '',
        'EVIDENCE:',
        '1. package.json has no build script.',
      ].join('\n'),
    )
    expect(verdict?.verdict).toBe('FAIL')
    expect(verdict?.issues).toEqual([
      'The build script does not exist.',
      'The acceptance test for the new route is missing.',
      'The README still documents the removed flag.',
    ])
    // The heading after the block is not swallowed into the issue list.
    expect(verdict?.issues.some((issue) => issue.includes('EVIDENCE'))).toBe(false)
  })

  it('keeps every bullet when the block runs to the end of the report', () => {
    const verdict = parseJudgeVerdict('VERDICT: FAIL\n\nISSUES:\n- one\n- two\n')
    expect(verdict?.issues).toEqual(['one', 'two'])
  })

  it('does not repeat the issue bullets in the card body', () => {
    // The FAIL list renders `issues`; the body renders `rest`. Leaving the
    // issue lines in `rest` (the old code stripped only the `ISSUES:` label)
    // showed every failure twice on the same card. The body is what is LEFT
    // once the verdict scaffold comes out — the evidence.
    const verdict = parseJudgeVerdict(
      [
        'VERDICT: FAIL',
        '',
        'ISSUES:',
        '- The build script does not exist.',
        '- The acceptance test for the new route is missing.',
        '',
        'EVIDENCE:',
        '1. package.json has no build script.',
      ].join('\n'),
    )
    expect(verdict?.rest).not.toContain('The build script does not exist.')
    expect(verdict?.rest).not.toContain('The acceptance test for the new route is missing.')
    expect(verdict?.rest).toContain('EVIDENCE:')
    expect(verdict?.rest).toContain('1. package.json has no build script.')
  })

  it('leaves a report with no ISSUES block untouched in the body', () => {
    const verdict = parseJudgeVerdict('VERDICT: PASS\n\nEVIDENCE:\nEvery criterion met.\n')
    expect(verdict?.issues).toEqual([])
    expect(verdict?.rest).toBe('EVIDENCE:\nEvery criterion met.')
  })

  it('stops the block at a heading when there is no blank line before it', () => {
    const verdict = parseJudgeVerdict('VERDICT: FAIL\nISSUES:\n- one\n- two\nEVIDENCE:\n- x\n')
    expect(verdict?.issues).toEqual(['one', 'two'])
  })

  it('collects an unbulleted issue list too, instead of ending at its second line', () => {
    // The block ends at a HEADING — a line opening with a CAPITAL. Matching
    // `[A-Z]` under the same case-insensitive flag that tolerates a lowercase
    // `issues:` also made it match any lowercase line, so a judge that wrote its
    // issues as plain lines lost every one after the first.
    const verdict = parseJudgeVerdict(
      [
        'VERDICT: FAIL',
        'ISSUES:',
        'the build script is missing',
        'the acceptance test never runs',
        '',
        'EVIDENCE:',
        'package.json has no build script.',
      ].join('\n'),
    )
    expect(verdict?.issues).toEqual([
      'the build script is missing',
      'the acceptance test never runs',
    ])
    expect(verdict?.rest).toContain('EVIDENCE:')
  })

  it('returns null when the report carries no verdict line', () => {
    expect(parseJudgeVerdict('Everything looked fine to me.')).toBeNull()
  })
})
