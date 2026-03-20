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

  it('handles null input', () => {
    expect(toolLabel('read_file', null)).toBe('Read ``')
  })
})

// ---------------------------------------------------------------------------
// toolSummary
// ---------------------------------------------------------------------------

describe('toolSummary', () => {
  it('returns empty for pending status', () => {
    expect(toolSummary('read_file', null, 'pending')).toBe('')
  })

  it('returns Running… for running status', () => {
    expect(toolSummary('read_file', null, 'running')).toBe('Running…')
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
})
