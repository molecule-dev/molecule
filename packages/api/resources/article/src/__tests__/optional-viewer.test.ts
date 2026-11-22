/** Public article reads accept the optional session identity returned by shared auth helpers. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function diagnostics(body: string): Array<{ code: number; message: string }> {
  const directory = mkdtempSync(join(tmpdir(), 'article-optional-viewer-'))
  try {
    const fixture = join(directory, 'consumer.mts')
    const entry = JSON.stringify(fileURLToPath(new URL('../service.js', import.meta.url)))
    writeFileSync(
      fixture,
      `import { hydrateArticles, getArticleBySlug, listArticles, getFeed } from ${entry}\n${body}`,
    )
    const program = ts.createProgram([fixture], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: ['node'],
    })
    return ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    }))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

// Each case builds a TypeScript program from cold (the lib files, @types/node, this package's
// declarations): 2.6 s of the default 5 s in CI on 2026-11-21, so the limit is sized to that work.
describe('public article reads compose with optional auth identities', { timeout: 20_000 }, () => {
  it('compiles a newsletter reader whose auth helper returns string or null', () => {
    expect(
      diagnostics(`
        declare function getUserId(response: unknown): string | null
        declare const response: unknown
        const viewerId = getUserId(response)
        export const page = listArticles({ tag: 'newsletter', viewerId })
        export const detail = getArticleBySlug('november-issue', viewerId)
        export const projected = hydrateArticles([], viewerId)
      `),
    ).toEqual([])
  })

  it('keeps omitted, undefined and signed-in viewers valid', () => {
    expect(
      diagnostics(`
        listArticles()
        listArticles({ viewerId: undefined })
        listArticles({ viewerId: 'reader' })
        getArticleBySlug('issue')
        getArticleBySlug('issue', undefined)
        getArticleBySlug('issue', 'reader')
        hydrateArticles([])
        hydrateArticles([], undefined)
        hydrateArticles([], 'reader')
      `),
    ).toEqual([])
  })

  it('still rejects non-string identities and an anonymous private feed', () => {
    const result = diagnostics(`
      listArticles({ viewerId: 123 })
      getArticleBySlug('issue', 123)
      getFeed(null)
    `)
    expect(result.map((d) => d.code)).toEqual([2322, 2345, 2345])
    expect(result.every((d) => /not assignable/.test(d.message))).toBe(true)
  })
})
