/**
 * A run narrowed to one feature reads only that feature's cases file: another feature's file,
 * part-way through being written by a parallel worker, cannot fail it (2026-11-17: a half-written
 * ChatPanel cases file failed the margin-notes recording, because the scoped tests imported the
 * loaders from the module that loads every cases file).
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { featureCaseFileNames, loadFeatureCases } from '../features/load.js'

// A directory of its own in the package's ignored node_modules: the test runner loads modules only
// from inside the package. Not under node_modules/.cache: the release's committed-tree export links
// that directory to the live checkout, whose real path Vite will not load from (2026-11-20: the
// loading case failed there with "Cannot find module").
const modules = join(import.meta.dirname, '../../node_modules')
mkdirSync(modules, { recursive: true })
const dir = mkdtempSync(join(modules, '.conformance-cases-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
writeFileSync(
  join(dir, 'tag-input.ts'),
  "export const tagInputCases = { package: '@molecule/app-tag-input-react', families: [] }\n",
)
writeFileSync(join(dir, 'chat-panel.ts'), 'export const chatPanelCases = MODELS_FIXED\n')

describe('loading one feature’s cases', () => {
  it('finds every cases file in the directory', () => {
    expect(featureCaseFileNames(dir)).toEqual(['chat-panel', 'tag-input'])
  })

  it('loads one feature while another feature’s cases file throws', async () => {
    const cases = await loadFeatureCases('tag-input', dir)
    expect(cases.package).toBe('@molecule/app-tag-input-react')
    await expect(loadFeatureCases('chat-panel', dir)).rejects.toThrow('MODELS_FIXED')
  })

  // Every test that loads one feature's cases, read from the directory, so a new one is covered and an
  // absent one is not named (2026-11-21: a commit that held back two such tests failed this list).
  const scoped = readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith('.test.ts') && file !== 'features-load.test.ts')
    .filter((file) =>
      /\b(?:loadFeatureCases|featureCaseFileNames)\b/.test(
        readFileSync(join(import.meta.dirname, file), 'utf8'),
      ),
    )
    .sort()

  it('finds the tests that load one feature at a time', () => {
    expect(scoped).toContain('features-goldens.test.ts')
  })

  it.each(scoped)('%s takes its loaders from the module that loads nothing at import', (file) => {
    const source = readFileSync(join(import.meta.dirname, file), 'utf8')
    expect(source).toContain("from '../features/load.js'")
    expect(source).not.toContain("from '../features/all.js'")
  })
})
