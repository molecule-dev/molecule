import { describe, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import { selectFeedbackSpecs } from '../playwright-feedback-selection.js'
import type {
  FeedbackProject,
  FeedbackSpec,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const spec = (path = '/app/e2e/notes.spec.ts', route = '/notes'): FeedbackSpec => ({
  path,
  content: `test('flow', async ({ page }) => { await page.goto('${route}'); await expect(page.locator('p').filter({hasText: body})).toBeVisible() })`,
  command: 'playwright test',
  cwd: '/app',
})
const project = (): FeedbackProject => ({
  sources: [
    {
      path: '/app/src/routes.tsx',
      content: `import { Notes } from './Notes.js'; import { Catalog } from './Catalog.js'; const routes = <><Route path="/notes" element={<Notes />} /><Route path="/catalog" element={<Catalog />} /></>`,
    },
    { path: '/app/src/Notes.tsx', content: 'export const Notes = () => <div>{note.body}</div>' },
    { path: '/app/src/Catalog.tsx', content: 'export const Catalog = () => <h1>Catalog</h1>' },
  ],
  specs: [spec('/app/e2e/catalog.spec.ts', '/catalog'), spec()],
})
const failure = (s: FeedbackSpec, files: string[], revision: number): PlaywrightFeedbackResult => ({
  spec: s.path,
  revision,
  durationMs: 1,
  status: 'failed',
  failures: [
    {
      spec: s.path,
      line: 12,
      error: 'element(s) not found',
      locator: "locator('p').filter({ hasText: 'note' })",
      rendered: '- generic: note',
      sourceFiles: files,
    },
  ],
})

describe('native Playwright feedback selection', () => {
  it('prioritizes the changed route, preserving every other spec for click/helper navigation', () => {
    const selected = selectFeedbackSpecs(project(), ['/app/src/Notes.tsx'])
    expect(selected.map((s) => s.spec.path)).toEqual([
      '/app/e2e/notes.spec.ts',
      '/app/e2e/catalog.spec.ts',
    ])
    expect(selected[0].sourceFiles).toEqual(['/app/src/Notes.tsx'])
  })
  it('follows local component imports and export barrels', () => {
    const p = project()
    p.sources[1].content = `import { NoteBody } from './body/index.js'; export const Notes = () => <NoteBody />`
    p.sources.push(
      { path: '/app/src/body/index.ts', content: "export * from './NoteBody.js'" },
      {
        path: '/app/src/body/NoteBody.tsx',
        content: 'export const NoteBody = () => <div>{body}</div>',
      },
    )
    expect(selectFeedbackSpecs(p, ['/app/src/body/NoteBody.tsx'])[0].spec.path).toBe(
      '/app/e2e/notes.spec.ts',
    )
  })
  it('matches parameterized routes and supplied route templates', () => {
    const p = project()
    p.sources[0].content = p.sources[0].content.replace('/notes', '/notes/:id')
    p.specs[1].content = 'test("edit", async ({page}) => { await page.goto(`/notes/${id}`) })'
    expect(selectFeedbackSpecs(p, ['/app/src/Notes.tsx'])[0].spec.path).toBe(
      '/app/e2e/notes.spec.ts',
    )
  })
  it('retains all specs for unknown routers, dynamic navigation and relative nested routes', () => {
    const p = project()
    p.sources[0].content = 'router.install(routesFromServer)'
    p.specs[0].content = 'await page.goto(routeFromHelper)'
    expect(selectFeedbackSpecs(p, ['/app/src/Notes.tsx'])).toHaveLength(2)
  })
  it('has no jobs without supplied or scaffolded specs', () => {
    expect(selectFeedbackSpecs({ ...project(), specs: [] }, ['/app/src/Notes.tsx'])).toEqual([])
  })
})

describe('nonblocking native feedback', () => {
  it('returns the write immediately and delivers a precise current native failure later', async () => {
    let release!: () => void
    const run = vi.fn(
      (s, files, revision) =>
        new Promise<PlaywrightFeedbackResult>((resolve) => {
          release = () => resolve(failure(s, files, revision))
        }),
    )
    const watcher = createPlaywrightFeedback({
      load: async () => ({ ...project(), specs: [spec()] }),
      run,
    })
    expect(watcher.changed(['/app/src/Notes.tsx'])).toBeUndefined()
    expect(run).not.toHaveBeenCalled()
    const settled = watcher.settled()
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1))
    expect(watcher.takeFailures()).toEqual([])
    release()
    await settled
    expect(watcher.takeFailures()[0].failures[0]).toMatchObject({
      spec: '/app/e2e/notes.spec.ts',
      line: 12,
      locator: "locator('p').filter({ hasText: 'note' })",
      sourceFiles: ['/app/src/Notes.tsx'],
    })
    await watcher.close()
  })
  it('emits no note for a matching app', async () => {
    const onFailures = vi.fn()
    const watcher = createPlaywrightFeedback({
      load: async () => project(),
      run: async (s, _f, revision) => ({
        spec: s.path,
        revision,
        durationMs: 1,
        status: 'passed',
        failures: [],
      }),
      onFailures,
    })
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    expect(onFailures).not.toHaveBeenCalled()
    expect(watcher.takeFailures()).toEqual([])
    await watcher.close()
  })
  it('does no native work for a project with no supplied suite', async () => {
    const run = vi.fn()
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [] }),
      run,
    })
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    expect(run).not.toHaveBeenCalled()
    await watcher.close()
  })
  it('drops a stale failure and reruns the latest revision without overlapping native runs', async () => {
    let release!: () => void
    const run = vi.fn(async (s, files, revision) => {
      if (revision === 1)
        await new Promise<void>((r) => {
          release = r
        })
      return revision === 1
        ? failure(s, files, revision)
        : { spec: s.path, revision, durationMs: 1, status: 'passed' as const, failures: [] }
    })
    const watcher = createPlaywrightFeedback({
      load: async () => ({ ...project(), specs: [spec()] }),
      run,
    })
    watcher.changed(['/app/src/Notes.tsx'])
    const settled = watcher.settled()
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1))
    watcher.changed(['/app/src/Notes.tsx'])
    expect(run).toHaveBeenCalledTimes(1)
    release()
    await settled
    expect(run).toHaveBeenCalledTimes(2)
    expect(watcher.takeFailures()).toEqual([])
    await watcher.close()
  })
  it('redelivers an unchanged failure after a new source revision supersedes its prior diagnostic', async () => {
    let good = false
    const onFailures = vi.fn()
    const watcher = createPlaywrightFeedback({
      load: async () => ({ ...project(), specs: [spec()] }),
      run: async (s, f, revision) =>
        good
          ? { spec: s.path, revision, durationMs: 1, status: 'passed', failures: [] }
          : failure(s, f, revision),
      onFailures,
    })
    for (let i = 0; i < 2; i++) {
      watcher.changed(['/app/src/Notes.tsx'])
      await watcher.settled()
    }
    expect(onFailures).toHaveBeenCalledTimes(2)
    good = true
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    good = false
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    expect(onFailures).toHaveBeenCalledTimes(3)
    await watcher.close()
  })
  it('keeps unavailable/setup errors separate from markup failures and stops at shutdown', async () => {
    const onFailures = vi.fn(),
      run = vi.fn(async (s, _f, revision) => ({
        spec: s.path,
        revision,
        durationMs: 1,
        status: 'unavailable' as const,
        failures: [],
        reason: 'not compiled',
      }))
    const watcher = createPlaywrightFeedback({ load: async () => project(), run, onFailures })
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    await watcher.close()
    watcher.changed(['/app/src/Notes.tsx'])
    await watcher.settled()
    expect(run).toHaveBeenCalledTimes(2)
    expect(onFailures).not.toHaveBeenCalled()
  })
})

it('reports a malformed native JSON report as unavailable, preserving the native reason', async () => {
  const backend = {
    projectRoot: '/app',
    readFile: async (path: string) => (path.endsWith('report.json') ? '{' : ''),
    writeFile: async () => {},
    deleteFile: async () => {},
    readDir: async () => [],
    run: async () => ({ stdout: '', stderr: '', exitCode: 1 }),
  }
  const result = await runPlaywrightFeedback(backend, spec(), ['/app/src/Notes.tsx'], 1, {
    command: () => 'playwright test notes.spec.ts',
  }).catch((error) => ({ status: 'threw', reason: String(error) }))
  expect(result.status).toBe('unavailable')
  expect(result.reason).toContain('not valid JSON')
})
