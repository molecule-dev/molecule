import { describe, expect, it, vi } from 'vitest'

import {
  addChangeSpan,
  changedSpan,
  countLines,
  EDIT_EXCERPT_MAX_LINES,
  renderEditExcerpt,
  renderSmallFile,
} from '../edit-excerpt.js'
import { buildTools } from '../index.js'
import type { ExecutionBackend } from '../types.js'

/** A file of `n` numbered lines: `line 1` … `line n`. */
const fileOf = (n: number): string =>
  Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n')

/**
 * A backend over one in-memory file, so reads after a write see the write.
 *
 * @param initial - The file's starting content, or null for a missing file.
 * @returns The backend plus a handle on the current content.
 */
function memoryBackend(
  initial: string | null,
): ExecutionBackend & { current: () => string | null } {
  let content = initial
  return {
    projectRoot: '/test',
    current: () => content,
    readFile: vi.fn(async () => {
      if (content === null) throw new Error('ENOENT')
      return content
    }),
    writeFile: vi.fn(async (_p: string, c: string) => {
      content = c
    }),
    deleteFile: vi.fn(),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  }
}

describe('changedSpan / addChangeSpan', () => {
  it('finds the changed region of a single replacement', () => {
    expect(changedSpan('aaa bbb ccc', 'aaa XYZ ccc')).toEqual({ start: 4, end: 7 })
    expect(changedSpan('same', 'same')).toBeNull()
  })

  it('a deletion is a zero-width span at the cut', () => {
    expect(changedSpan('keep DROP keep', 'keep keep')).toEqual({ start: 5, end: 5 })
  })

  it('shifts earlier spans that sit after a later change, keeping latest coordinates', () => {
    // First change near the end, then a growing change near the start.
    let spans = addChangeSpan([], 'aaa bbb ccc', 'aaa bbb ZZZ')
    expect(spans).toEqual([{ start: 8, end: 11 }])
    spans = addChangeSpan(spans, 'aaa bbb ZZZ', 'LONGER bbb ZZZ')
    expect(spans).toEqual([
      { start: 0, end: 6 },
      { start: 11, end: 14 },
    ])
  })

  it('merges overlapping changes', () => {
    let spans = addChangeSpan([], 'abcdef', 'abXYef')
    spans = addChangeSpan(spans, 'abXYef', 'abXYZZf')
    expect(spans).toEqual([{ start: 2, end: 6 }])
  })
})

describe('countLines', () => {
  it('counts the way read_file does', () => {
    expect(countLines('')).toBe(0)
    expect(countLines('a')).toBe(1)
    expect(countLines('a\nb')).toBe(2)
    expect(countLines('a\nb\n')).toBe(3)
  })
})

describe('renderEditExcerpt', () => {
  it('numbers the edited line with context', () => {
    const content = fileOf(20)
    const at = content.indexOf('line 10')
    const out = renderEditExcerpt(content, [{ start: at, end: at + 'line 10'.length }])
    expect(out.split('\n')).toEqual([
      '7: line 7',
      '8: line 8',
      '9: line 9',
      '10: line 10',
      '11: line 11',
      '12: line 12',
      '13: line 13',
    ])
  })

  it('separates distant regions and merges touching ones', () => {
    const content = fileOf(40)
    const span = (n: number): { start: number; end: number } => {
      const at = content.indexOf(`line ${n}\n`)
      return { start: at, end: at + `line ${n}`.length }
    }
    const out = renderEditExcerpt(content, [span(5), span(8), span(30)])
    const rows = out.split('\n')
    expect(rows[0]).toBe('2: line 2')
    expect(rows).toContain('11: line 11')
    expect(rows).toContain('…')
    expect(rows).toContain('27: line 27')
    expect(rows[rows.length - 1]).toBe('33: line 33')
  })

  it(`caps a huge edit at ${EDIT_EXCERPT_MAX_LINES} lines and names what it left out`, () => {
    const content = fileOf(500)
    const start = content.indexOf('line 100\n')
    const end = content.indexOf('line 400\n') + 'line 400'.length
    const rows = renderEditExcerpt(content, [{ start, end }]).split('\n')
    const numberedRows = rows.filter((r) => /^\d+: /.test(r))
    expect(numberedRows.length).toBe(EDIT_EXCERPT_MAX_LINES)
    expect(rows[0]).toBe('97: line 97')
    expect(rows[rows.length - 1]).toBe('403: line 403')
    expect(rows.some((r) => /^… \(lines \d+-\d+ not shown\)$/.test(r))).toBe(true)
  })

  it('lists regions that did not fit at all', () => {
    const content = fileOf(1000)
    const spans = [100, 200, 300, 400, 500, 600, 700, 800, 900, 990].map((n) => {
      const at = content.indexOf(`line ${n}\n`)
      return { start: at, end: at + `line ${n}`.length }
    })
    const out = renderEditExcerpt(content, spans)
    const numberedRows = out.split('\n').filter((r) => /^\d+: /.test(r))
    expect(numberedRows.length).toBeLessThanOrEqual(EDIT_EXCERPT_MAX_LINES)
    expect(out).toMatch(/also edited, not shown: lines 987-993\)$/)
  })

  it('cuts a very long (minified) line', () => {
    const content = `short\n${'x'.repeat(5000)}\nshort`
    const at = content.indexOf('x')
    const out = renderEditExcerpt(content, [{ start: at, end: at + 1 }])
    expect(out.length).toBeLessThan(600)
    expect(out).toMatch(/\(\+4760 chars\)/)
  })
})

describe('renderSmallFile', () => {
  it('numbers a small file and declines a big one', () => {
    expect(renderSmallFile('a\nb')).toBe('1: a\n2: b')
    expect(renderSmallFile(fileOf(200))).toBeNull()
    expect(renderSmallFile('')).toBeNull()
  })
})

describe('edit_file / write_file results show the result', () => {
  it('edit_file returns the edited region as it now reads, numbered, plus the total line count', async () => {
    const backend = memoryBackend(fileOf(50))
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await edit.execute({
      path: 'src/a.ts',
      old_string: 'line 25',
      new_string: 'line 25\ninserted A\ninserted B',
    })) as Record<string, unknown>
    expect(result).toMatchObject({ ok: true, replacementsApplied: 1, totalLines: 52 })
    const rows = String(result.excerpt).split('\n')
    expect(rows).toContain('26: inserted A')
    expect(rows).toContain('27: inserted B')
    // The insertion lands before line 26, so context starts three lines above it.
    expect(rows[0]).toBe('23: line 23')
    expect(rows[rows.length - 1]).toBe('30: line 28')
    // The excerpt agrees with what was written.
    expect(backend.current()!.split('\n')[25]).toBe('inserted A')
  })

  it('a batch edit shows each region at its FINAL line numbers', async () => {
    const backend = memoryBackend(fileOf(100))
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await edit.execute({
      path: 'src/a.ts',
      replacements: [
        { old_string: 'line 80\n', new_string: 'line 80 changed\n' },
        { old_string: 'line 10\n', new_string: 'line 10\nnew 1\nnew 2\n' },
      ],
    })) as Record<string, unknown>
    const rows = String(result.excerpt).split('\n')
    expect(rows).toContain('11: new 1')
    // Two lines were added above, so line 80 is now line 82.
    expect(rows).toContain('82: line 80 changed')
    expect(backend.current()!.split('\n')[81]).toBe('line 80 changed')
  })

  it('a whitespace-tolerant edit is shown too', async () => {
    const backend = memoryBackend('a\n    const x = 1\nb')
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await edit.execute({
      path: 'src/a.ts',
      old_string: 'const x=1',
      new_string: '    const x = 2',
    })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(String(result.excerpt)).toContain('2:     const x = 2')
  })

  it('keeps the old fields and shape (alreadyApplied still reported)', async () => {
    const backend = memoryBackend('aaa\nthis new text is already in the file\n')
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await edit.execute({
      path: 'src/a.ts',
      replacements: [
        { old_string: 'aaa', new_string: 'bbb' },
        { old_string: 'gone', new_string: 'this new text is already in the file' },
      ],
    })) as Record<string, unknown>
    expect(result).toMatchObject({
      path: '/test/src/a.ts',
      ok: true,
      replacementsApplied: 1,
      alreadyApplied: 1,
    })
    expect(String(result.excerpt)).toContain('1: bbb')
  })

  it('redacts secrets in the excerpt', async () => {
    const backend = memoryBackend('# env\nOTHER=1\n')
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await edit.execute({
      path: '.env',
      old_string: 'OTHER=1',
      new_string: 'OTHER=1\nAPI_KEY=sk-live-abcdef123456',
    })) as Record<string, unknown>
    expect(String(result.excerpt)).not.toContain('sk-live-abcdef123456')
    expect(String(result.excerpt)).toContain('API_KEY=[REDACTED]')
  })

  it('write_file of a small new file returns its numbered lines and line count', async () => {
    const backend = memoryBackend(null)
    const write = buildTools(backend).find((t) => t.name === 'write_file')!
    const result = (await write.execute({
      path: 'src/b.ts',
      content: 'export const a = 1\nexport const b = 2\n',
    })) as Record<string, unknown>
    expect(result).toMatchObject({ ok: true, totalLines: 3 })
    expect(result.excerpt).toBe('1: export const a = 1\n2: export const b = 2\n3: ')
    expect(result.diff).toMatchObject({ type: 'created' })
  })

  it('write_file of a big file returns only the line count — never echoes it back', async () => {
    const backend = memoryBackend(null)
    const write = buildTools(backend).find((t) => t.name === 'write_file')!
    const result = (await write.execute({ path: 'src/big.ts', content: fileOf(300) })) as Record<
      string,
      unknown
    >
    expect(result).toMatchObject({ ok: true, totalLines: 300 })
    expect(result.excerpt).toBeUndefined()
  })
})

describe('write_file diff counts the lines it changed, not the length delta', () => {
  /** m141's file before the rewrite: `{article.favoriteLabel ?? 'Favorite'}`. */
  const articleBefore = [
    'export function ArticlePreview({ article }: { article: Article }) {',
    '  return (',
    '    <div className="article-preview">',
    '      <button className="btn btn-outline-primary">',
    "        {article.favoriteLabel ?? 'Favorite'}",
    '      </button>',
    '    </div>',
    '  )',
    '}',
  ].join('\n')

  /** m141's file after the rewrite: the same line, one ternary instead. */
  const articleAfter = articleBefore.replace(
    "{article.favoriteLabel ?? 'Favorite'}",
    "{article.favorited ? 'Unfavorite' : 'Favorite'}",
  )

  /**
   * Run write_file over an in-memory file and return its `diff`.
   *
   * @param before - The file's content before the write.
   * @param after - The content the tool is asked to write.
   * @returns The diff summary from the tool result.
   */
  async function writeDiff(
    before: string | null,
    after: string,
  ): Promise<{ type: string; linesAdded: number; linesRemoved: number }> {
    const backend = memoryBackend(before)
    const write = buildTools(backend).find((t) => t.name === 'write_file')!
    const result = (await write.execute({ path: 'src/ArticlePreview.tsx', content: after })) as {
      diff: { type: string; linesAdded: number; linesRemoved: number }
    }
    return result.diff
  }

  it("reports m141's one-line rewrite as +1/−1 (a 0/0 result reads as a no-op)", async () => {
    // The rewrite leaves the line count identical — the shape the length delta
    // reported as `0/0`, telling the model its write changed nothing.
    expect(articleAfter.split('\n').length).toBe(articleBefore.split('\n').length)
    expect(await writeDiff(articleBefore, articleAfter)).toEqual({
      type: 'modified',
      linesAdded: 1,
      linesRemoved: 1,
    })
  })

  it('reports a whitespace-only change as +1/−1 too', async () => {
    const before = 'a\nconst value = 1\nb'
    const after = 'a\nconst value = 1  \nb'
    expect(await writeDiff(before, after)).toEqual({
      type: 'modified',
      linesAdded: 1,
      linesRemoved: 1,
    })
  })

  it('reports the real counts for a block rewrite that adds a line', async () => {
    // Two lines become three: the length delta happened to equal +1, but the
    // lines that actually changed are all five.
    const before = 'a\ntwo old lines\nthat are replaced\nz'
    const after = 'a\nthree new lines\nthat replace them\nand say more\nz'
    expect(await writeDiff(before, after)).toEqual({
      type: 'modified',
      linesAdded: 3,
      linesRemoved: 2,
    })
  })

  it('reports an insertion as +1/−0', async () => {
    expect(await writeDiff('a\nb', 'a\ninserted\nb')).toEqual({
      type: 'modified',
      linesAdded: 1,
      linesRemoved: 0,
    })
  })

  it('reports a content-identical write as unchanged, not modified 0/0', async () => {
    expect(await writeDiff(articleBefore, articleBefore)).toEqual({
      type: 'unchanged',
      linesAdded: 0,
      linesRemoved: 0,
    })
  })

  it('still reports a new file as created with its line count', async () => {
    expect(await writeDiff(null, articleBefore)).toEqual({
      type: 'created',
      linesAdded: 9,
      linesRemoved: 0,
    })
  })
})
