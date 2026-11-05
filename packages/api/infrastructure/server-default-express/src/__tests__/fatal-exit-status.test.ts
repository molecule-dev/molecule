import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const modules = dirname(dirname(createRequire(import.meta.url).resolve('express/package.json')))

async function runFactory(
  options: string,
  handled = false,
  unwritableLog = false,
): Promise<ReturnType<typeof spawnSync> & { errorLog: string }> {
  const root = await mkdtemp(join(tmpdir(), 'server-fatal-exit-'))
  try {
    await symlink(modules, join(root, 'node_modules'), 'dir')
    const log = join(root, '.api-errors.log')
    if (unwritableLog) await mkdir(log)
    const source = await readFile(fileURLToPath(new URL('../server.ts', import.meta.url)), 'utf8')
    await writeFile(
      join(root, 'server.mjs'),
      ts.transpileModule(source.replaceAll('/workspace/.api-errors.log', log), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
    await writeFile(
      join(root, 'entry.mjs'),
      `import { createServerFactory } from './server.mjs'
const create = createServerFactory({
  lifecycle: { disabled: true },
  runMigrations: async () => {},
  setupBonds: async () => {},
  getRouter: async () => { throw new Error('router unavailable') },
  ${options}
})
create()${handled ? '.catch(() => {})' : ''}
`,
    )
    const result = spawnSync(process.execPath, [join(root, 'entry.mjs')], {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, NODE_OPTIONS: '' },
    })
    return { ...result, errorLog: await readFile(log, 'utf8').catch(() => '') }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('the shared fleet server preserves fatal exits and IDE feedback', () => {
  it.each(['runMigrations', 'setupBonds', 'getRouter'])(
    'fails a rejected %s with the real missing-package stack',
    async (stage) => {
      const result = await runFactory(
        `${stage}: async () => { await import('missing-server-boot-provider') },`,
      )
      expect(result.error).toBeUndefined()
      expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
      expect(result.status).toBe(1)
      expect(result.errorLog).toContain('missing-server-boot-provider')
    },
  )

  it('fails an uncaught callback during startup', async () => {
    const result = await runFactory(
      `setupBonds: () => new Promise(() => {
        setTimeout(() => { throw new Error('boot callback failed') }, 0)
      }),`,
    )
    expect(result.error).toBeUndefined()
    expect(String(result.stderr)).toContain('boot callback failed')
    expect(result.status).toBe(1)
    expect(result.errorLog).toContain('boot callback failed')
  })

  it('keeps a handled startup rejection successful and out of the fatal log', async () => {
    const result = await runFactory('', true)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.errorLog).toBe('')
  })

  it('keeps the original fatal exit when the IDE log is unwritable', async () => {
    const result = await runFactory('', false, true)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(String(result.stderr)).toContain('router unavailable')
    expect(String(result.stderr)).not.toContain('EISDIR')
  })
})
