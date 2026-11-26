import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { applyPlan, rewriteSource } from '../codemod-vi-mock-keeps-actual.mjs'

describe('codemod-vi-mock-keeps-actual', () => {
  it('rewrites direct, block, typed and doMock factories while preserving properties', () => {
    const source = `
vi.mock('@molecule/app-ui', () => ({ getClassMap: vi.fn() }))
vi.mock('@molecule/api-http', async (importOriginal: ImportOriginal) => {
  const mocked = { request: vi.fn() }
  return mocked
})
vi.doMock('@molecule/app-i18n', () => i18n)
`

    const result = rewriteSource(source, 'fixture.test.ts')

    expect(result.matches).toHaveLength(3)
    expect(result.text).toContain(
      'async (importOriginal) => ({...(await importOriginal<Record<string, unknown>>()), getClassMap: vi.fn() })',
    )
    expect(result.text).toContain(
      'async (importOriginal: ImportOriginal) => {\n  const mocked = { request: vi.fn() }\n  return ({ ...(await importOriginal<Record<string, unknown>>()), ...(await (mocked)) })',
    )
    expect(result.text).toContain(
      'async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), ...(await (i18n)) })',
    )
  })

  it('does not rewrite a factory that already spreads the real module', () => {
    const source = `vi.mock('@molecule/app-ui', async () => ({
  ...(await vi.importActual('@molecule/app-ui')),
  getClassMap: vi.fn(),
}))`

    expect(rewriteSource(source, 'fixture.test.tsx').matches).toEqual([])
  })

  it('validates every file before writing any file', () => {
    const root = mkdtempSync(join(tmpdir(), 'vi-mock-keeps-actual-'))
    const first = 'first.test.ts'
    const second = 'second.test.ts'
    const firstText = 'const first = true\n'
    writeFileSync(join(root, first), firstText)
    writeFileSync(join(root, second), 'const second = true\n')

    expect(() =>
      applyPlan(
        {
          files: [
            {
              file: first,
              sha256: createHash('sha256').update(firstText).digest('hex'),
              matches: [],
            },
            {
              file: second,
              sha256: 'changed-after-dry-run',
              matches: [],
            },
          ],
        },
        root,
      ),
    ).toThrow('source changed after dry run: second.test.ts')
    expect(readFileSync(join(root, first), 'utf8')).toBe(firstText)
  })
})
