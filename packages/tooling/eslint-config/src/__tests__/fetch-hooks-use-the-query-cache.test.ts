import { readFile } from 'node:fs/promises'

import { ESLint, type Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { type LintProject, lintProject } from './project.js'

const RULE = 'molecule-local/fetch-hooks-use-the-query-cache'
const projects: LintProject[] = []
afterAll(() => Promise.all(projects.map((project) => project.remove())))

/** The lint config as a project with the given dependencies loads it. */
async function configFor(
  dependencies: Record<string, string>,
): Promise<{ root: string; config: Linter.Config[] }> {
  const project = await lintProject({ name: 'app', dependencies })
  projects.push(project)
  return { root: project.root, config: project.config }
}

async function findings(engine: ESLint, source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/lib/useData.ts' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) => file.messages.filter((row) => row.ruleId === RULE))
}
const retained = (file: string): Promise<string> =>
  readFile(new URL(`./fixtures/${file}`, import.meta.url), 'utf8')

const declared = await configFor({ '@molecule/app-query-react': '1.2.0', react: '19.0.0' })
const withQueryCache = new ESLint({
  cwd: declared.root,
  overrideConfig: declared.config,
  overrideConfigFile: true,
})

describe('a hand-written copy of the query hook', () => {
  it.each([
    ['p317-l2400-useAsync.ts.txt', 'useAsync', 15],
    ['p317-l2396-useFetch.ts.txt', 'useFetch', 15],
  ])('reports the retained hook %s', async (fixture, name, line) => {
    const rows = await findings(withQueryCache, await retained(fixture))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line, severity: 2 })
    expect(rows[0]?.message).toContain(`\`${name}\` awaits a loader`)
    expect(rows[0]?.message).toContain('If the loader reads shared server data')
  })

  it('reports an invoices hook that calls its loader directly', async () => {
    const rows = await findings(
      withQueryCache,
      `export const useLoaded = (load, deps) => {
  const [value, setValue] = useState(null)
  useEffect(() => {
    let live = true
    load().then((next) => live && setValue(next))
    return () => {
      live = false
    }
  }, deps)
  return value
}`,
    )
    expect(rows).toHaveLength(1)
  })

  it.each([
    [
      'a hook that measures the window',
      `export function useWindowWidth() {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const read = () => setWidth(window.innerWidth)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])
  return width
}`,
    ],
    [
      'a debounce hook, whose parameter is a value and is never called',
      `export function useDebounced(value, ms) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setShown(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return shown
}`,
    ],
    [
      'a hook that calls its callback in an effect and keeps no state',
      `export function useOnMount(run) {
  useEffect(() => {
    run()
  }, [])
}`,
    ],
    [
      'a hook built on useQuery',
      `export function useInvoices(viewer, page) {
  return useQuery({ key: ['/invoices', viewer, page], fetch: (signal) => listInvoices(page, signal) })
}`,
    ],
    [
      'a component, which is not a hook',
      `export function Loader({ load }) {
  const [value, setValue] = useState(null)
  useEffect(() => {
    load().then(setValue)
  }, [load])
  return value
}`,
    ],
  ])('stays quiet for %s', async (_what, source) => {
    expect(await findings(withQueryCache, source)).toEqual([])
  })

  it('is not enabled in a project that does not declare the query cache', async () => {
    const enabled = (config: Linter.Config[]): boolean =>
      config.some((entry) => entry.rules !== undefined && RULE in entry.rules)
    expect(enabled(declared.config)).toBe(true)
    expect(enabled((await configFor({ react: '19.0.0' })).config)).toBe(false)
  })
})
