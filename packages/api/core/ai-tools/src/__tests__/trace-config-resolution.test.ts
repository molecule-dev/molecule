import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DIAGNOSIS_TRACE_FLAG, diagnosisTraceCommand } from '../trace-artifacts.js'

const ON = "export default {use: {trace: 'on'}}"
const OFF = "export default {use: {trace: 'off'}}"
async function rewrite(command: string, files: Record<string, string>, cwd = '/srv') {
  const reads: string[] = []
  const result = await diagnosisTraceCommand({
    command,
    cwd,
    readFile: async (path) => {
      reads.push(path)
      if (path in files) return files[path]!
      throw new Error(`ENOENT ${path}`)
    },
  })
  return { ...result, reads }
}

describe('trace diagnosis reads the same config as the native runner', () => {
  it('does not fall back to an unrelated config in the starting directory', async () => {
    const out = await rewrite('cd /srv/shop && npx playwright test', {
      '/srv/playwright.config.ts': ON,
      '/srv/shop/playwright.config.js': OFF,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
    expect(out.reads).not.toContain('/srv/playwright.config.ts')
  })
  it('uses Playwright default-name precedence and reaches cts and cjs within six reads', async () => {
    const js = await rewrite('npx playwright test', {
      '/srv/playwright.config.js': OFF,
      '/srv/playwright.config.mts': ON,
    })
    expect(js.command).toContain(DIAGNOSIS_TRACE_FLAG)
    for (const suffix of ['cts', 'cjs']) {
      const out = await rewrite('npx playwright test', { [`/srv/playwright.config.${suffix}`]: ON })
      expect(out.change).toBeNull()
      expect(out.reads.length).toBeLessThanOrEqual(6)
    }
  })
  it('follows consecutive cd steps, clamps parent paths at root, and ignores a later cd', async () => {
    const out = await rewrite(
      'cd shop && cd ../../../../srv/store && npx playwright test; cd /elsewhere',
      {
        '/srv/store/playwright.config.ts': ON,
      },
    )
    expect(out.change).toBeNull()
    expect(out.reads[0]).toBe('/srv/store/playwright.config.ts')
  })
  it('does not let a subshell cd change the outer runner directory', async () => {
    const out = await rewrite('(cd /elsewhere && echo ok); npx playwright test', {
      '/srv/playwright.config.ts': ON,
    })
    expect(out.change).toBeNull()
    expect(out.reads[0]).toBe('/srv/playwright.config.ts')
  })
  it('takes the config from the runner arguments, including -c, rather than another step', async () => {
    const out = await rewrite('echo --config fake.ts; npx playwright test -c ./suite.ts', {
      '/srv/suite.ts': ON,
      '/srv/fake.ts': OFF,
    })
    expect(out.change).toBeNull()
    expect(out.reads[0]).toBe('/srv/suite.ts')
  })
})

describe('relative config imports do not manufacture trace evidence', () => {
  it('does not follow comments or strings that look like imports', async () => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts': `// import old from './old.ts'
        const example = "import x from './old.ts'";
        const from = "import old from './old.ts'";
        export default {use: {trace: 'off'}}`,
      '/srv/old.ts': ON,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
    expect(out.reads).not.toContain('/srv/old.ts')
  })
  it('honors the runner loader extension precedence', async () => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts': "import base from './base'; export default {...base}",
      '/srv/base.js': OFF,
      '/srv/base.ts': ON,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
    expect(out.reads).toContain('/srv/base.js')
    expect(out.reads).not.toContain('/srv/base.ts')
  })
  it.each([
    ["import base from './base.js'; export default {...base}", '/srv/base.ts'],
    ["const base = require /* note */ ('./base.cjs'); module.exports = {...base}", '/srv/base.cts'],
    [
      "const base = (await import /* note */ ('./base.mjs')).default; export default {...base}",
      '/srv/base.mts',
    ],
  ])('follows loader-compatible imports: %s', async (source, file) => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts': source,
      [file]: ON,
    })
    expect(out.change).toBeNull()
    expect(out.reads).toContain(file)
    expect(out.reads.length).toBeLessThanOrEqual(7)
  })
  it('does not use an imported recording mode after the wrapper explicitly turns it off', async () => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts':
        "import base from './base.ts'; export default {...base, use: {...base.use, trace: 'off'}}",
      '/srv/base.ts': ON,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
  })

  it('does not inherit tracing from an unused helper or a prose example', async () => {
    for (const source of [
      "import helper from './base.ts'; export default {}",
      `const example = "trace: 'on'"; export default {}`,
    ]) {
      const out = await rewrite('npx playwright test', {
        '/srv/playwright.config.ts': source,
        '/srv/base.ts': ON,
      })
      expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
    }
  })
  it('keeps explicit trace overrides at the second import level too', async () => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts': "import middle from './middle.ts'; export default {...middle}",
      '/srv/middle.ts':
        "import base from './base.ts'; export default {...base, use: {...base.use, trace: 'off'}}",
      '/srv/base.ts': ON,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
  })
  it('stops at two import levels and never reads a candidate twice, including misses', async () => {
    const out = await rewrite('npx playwright test', {
      '/srv/playwright.config.ts': "import a from './a.ts'; import b from './b.ts'",
      '/srv/a.ts': "import missing from './missing.js'; import b from './b.ts'",
      '/srv/b.ts': "import missing from './missing.js'; import c from './c.ts'",
      '/srv/c.ts': "import d from './d.ts'",
      '/srv/d.ts': ON,
    })
    expect(new Set(out.reads).size).toBe(out.reads.length)
    expect(out.reads.length).toBeLessThanOrEqual(7)
    expect(out.reads).not.toContain('/srv/d.ts')
  })
})

describe('the native Playwright loader and the backend directory capability agree', () => {
  it.each([
    ['index', { 'base/index.ts': ON }],
    [
      'main',
      {
        'base/package.json': '{"main":"shared.cjs"}',
        'base/shared.cjs': "module.exports = {use: {trace: 'on'}}",
      },
    ],
    ['extensions', { 'base.js': OFF, 'base.ts': ON }],
  ])('resolves %s imports without exhausting the six-read import budget', async (_kind, files) => {
    const directory = await mkdtemp(join(tmpdir(), 'trace-loader-'))
    try {
      const source = "import base from './base'; export default {...base}"
      await writeFile(join(directory, 'playwright.config.ts'), source)
      for (const [name, text] of Object.entries(files)) {
        if (text === undefined) continue
        const path = join(directory, name)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, text)
      }
      const require = createRequire(import.meta.url)
      const native = require(
        join(dirname(require.resolve('playwright/package.json')), 'lib/common/index.js'),
      )
      const loaded = await native.configLoader.loadConfigFromFile(
        join(directory, 'playwright.config.ts'),
      )
      const reads: string[] = []
      const result = await diagnosisTraceCommand({
        command: 'npx playwright test',
        cwd: directory,
        readFile: async (path) => {
          reads.push(path)
          return readFile(path, 'utf8')
        },
        readDir: async (path) =>
          (await readdir(path, { withFileTypes: true })).map((entry) => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
          })),
      })
      expect(result.change === null).toBe(loaded.config.projects[0].use.trace === 'on')
      expect(reads.length).toBeLessThanOrEqual(7)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe('trace decisions inspect the runner own flags', () => {
  it.each([
    'echo --retries=0; BASE_URL=https://store.example npx playwright test',
    "BASE_URL=https://store.example npx playwright test --grep 'cart --retries=0'",
    'BASE_URL=https://store.example npx playwright test --retries=0 --retries=1',
  ])('keeps a deployed measurement unchanged: %s', async (command) => {
    const out = await rewrite(command, { '/srv/playwright.config.ts': OFF })
    expect(out.command).toBe(command)
    expect(out.reads).toEqual([])
  })
  it('does not mistake a preceding program or title URL for a deployed target', async () => {
    for (const command of [
      'HOST=https://store.example hurl --test api.hurl; npx playwright test',
      "npx playwright test --grep 'https://store.example'",
    ]) {
      const out = await rewrite(command, { '/srv/playwright.config.ts': OFF })
      expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
    }
  })
  it('does not read another command trace flag as the local runner own choice', async () => {
    const out = await rewrite('echo --trace=on; npx playwright test', {
      '/srv/playwright.config.ts': OFF,
    })
    expect(out.command).toContain(DIAGNOSIS_TRACE_FLAG)
  })
})
