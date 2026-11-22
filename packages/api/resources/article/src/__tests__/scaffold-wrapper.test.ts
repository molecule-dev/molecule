import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { expect, it } from 'vitest'

import * as article from '../index.js'

// The case builds a TypeScript program from cold (the lib files, @types/node, this package's
// declarations): 3.1 s of the default 5 s in CI on 2026-11-22, so the limit is sized to that work.
it(
  'type-checks the standard scaffold wrapper against the exported article contract',
  { timeout: 20_000 },
  () => {
    const directory = mkdtempSync(join(tmpdir(), 'article-wrapper-'))
    try {
      const fixture = join(directory, 'wrapper.mts')
      const entry = JSON.stringify(fileURLToPath(new URL('../index.js', import.meta.url)))
      // mlcl's public resource convention calls this reserved factory with the
      // generic HTTP wrapper. A differently shaped configuration factory must not
      // claim its name, or a newly generated project fails before any app edit.
      const source =
        'createRequestHandlerMap' in article
          ? `import { createRequestHandlerMap } from ${entry}
         import { createRequestHandler } from '@molecule/api-resource'
         export const handlers = createRequestHandlerMap(createRequestHandler)`
          : `export { requestHandlerMap } from ${entry}`
      writeFileSync(fixture, source)
      const program = ts.createProgram([fixture], {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['node'],
      })
      const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
        code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      }))
      expect(diagnostics).toEqual([])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  },
)
