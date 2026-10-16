/**
 * `find_files` when the pattern spells out the directory it wants, and when the
 * backend's deadline fires instead of an answer.
 *
 * Live review xr-molecule-flash-m94: the executor called
 *
 *   find_files { path: "/workspace/node_modules",
 *                pattern: "@molecule/api-resource-user/dist/*.d.ts" }
 *
 * and waited 10 s for it. A pattern with a `/` is matched against the whole path
 * with an implicit "any parent" anchor, so `find` walked the sandbox's entire
 * dependency tree — while the one directory the pattern names, and which a
 * `list_files` answered in 0 s, was `node_modules/@molecule/api-resource-user/dist`.
 * The deadline then surfaced as the E2B SDK's own text ("It can be modified by
 * passing 'timeoutMs' when making the request. Use '0' to disable the timeout.")
 * — an option `find_files` does not have and the model cannot act on.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { findPathArgs, literalDirPrefix } from '../utilities.js'

/** The E2B SDK's deadline text, verbatim from the m94 call's output. */
const SDK_DEADLINE_ERROR =
  'Find failed: [deadline_exceeded] the operation timed out: This error is likely due to exceeding ' +
  "'timeoutMs' — the total time a long running request (like command execution or directory watch) " +
  "can be active. It can be modified by passing 'timeoutMs' when making the request. Use '0' to " +
  'disable the timeout.'

type RunResult = { stdout: string; stderr: string; exitCode: number }

/**
 * A backend that records every command it is handed, answers `test -d` from a
 * list of existing directories, and answers the find itself with `answer`.
 *
 * @param existingDirs - The directories `test -d` succeeds for.
 * @param answer - What the find/grep command does: a result, or a throw.
 * @returns The backend and the commands it ran, in order.
 */
const spyBackend = (
  existingDirs: string[],
  answer: () => RunResult,
): { backend: ExecutionBackend; commands: string[] } => {
  const commands: string[] = []
  const backend = {
    projectRoot: '/workspace',
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDir: vi.fn(async () => []),
    run: vi.fn(async (command: string) => {
      commands.push(command)
      if (command.startsWith('test -d ')) {
        const dir = command.slice('test -d '.length).replace(/^'|'$/g, '')
        return { stdout: '', stderr: '', exitCode: existingDirs.includes(dir) ? 0 : 1 }
      }
      return answer()
    }),
  }
  return { backend: backend as unknown as ExecutionBackend, commands }
}

const findTool = (backend: ExecutionBackend) =>
  buildTools(backend).find((t) => t.name === 'find_files') ??
  (() => {
    throw new Error('find_files not built')
  })()

describe('find_files — the pattern’s own directory is the search root (flash-m94)', () => {
  it('searches the literal directory, not all of `path`', async () => {
    const dir = '/workspace/node_modules/@molecule/api-resource-user/dist'
    const { backend, commands } = spyBackend([dir], () => ({
      stdout: `${dir}/index.d.ts\n${dir}/handlers/create.d.ts\n`,
      stderr: '',
      exitCode: 0,
    }))
    const out = (await findTool(backend).execute({
      path: '/workspace/node_modules',
      pattern: '@molecule/api-resource-user/dist/*.d.ts',
    })) as { files?: string[]; note?: string; error?: string }

    const find = commands.find((c) => c.startsWith('find ')) ?? ''
    expect(find.startsWith(`find '${dir}' `)).toBe(true)
    // The remainder keeps the `-path` form, whose `*` crosses `/` — a `.d.ts` in
    // a subdirectory of `dist/` is still a match.
    expect(find).toContain("-path '*/*.d.ts'")
    expect(find).not.toContain("find '/workspace/node_modules'")
    expect(out.files).toEqual([`${dir}/index.d.ts`, `${dir}/handlers/create.d.ts`])
    expect(out.error).toBeUndefined()
  })

  it('falls back to all of `path`, and says so, when that directory does not exist', async () => {
    const { backend, commands } = spyBackend([], () => ({ stdout: '', stderr: '', exitCode: 0 }))
    const out = (await findTool(backend).execute({
      path: '/workspace/node_modules',
      pattern: '@molecule/api-resource-user/dist/*.d.ts',
    })) as { files?: string[]; note?: string }

    expect(commands.some((c) => c.startsWith("find '/workspace/node_modules' "))).toBe(true)
    expect(out.note).toContain(
      '"/workspace/node_modules/@molecule/api-resource-user/dist" does not exist; searched all of /workspace/node_modules.',
    )
  })

  it('answers a timeout in the tool’s own words, never the SDK’s `timeoutMs`', async () => {
    const dir = '/workspace/node_modules/@molecule/api-resource-user/dist'
    const { backend } = spyBackend([dir], () => {
      throw new Error(
        "[deadline_exceeded] the operation timed out: This error is likely due to exceeding 'timeoutMs'",
      )
    })
    const out = (await findTool(backend).execute({
      path: '/workspace/node_modules',
      pattern: '@molecule/api-resource-user/dist/*.d.ts',
    })) as { error?: string }

    expect(out.error).toContain('find_files timed out after 10s')
    expect(out.error).toContain(dir)
    expect(out.error).toContain('@molecule/api-resource-user/dist/*.d.ts')
    expect(out.error).toContain('list_files')
    expect(out.error).not.toContain('timeoutMs')
    expect(out.error).not.toContain('deadline_exceeded')
  })

  it('says which of the two trees it walked when the search root was not narrowed', async () => {
    const { backend } = spyBackend([], () => {
      throw new Error(SDK_DEADLINE_ERROR)
    })
    const out = (await findTool(backend).execute({
      path: '/workspace/node_modules',
      pattern: '**/*.d.ts',
    })) as { error?: string }
    expect(out.error).toContain('find_files timed out after 10s searching /workspace/node_modules')
    expect(out.error).not.toContain('timeoutMs')
  })
})

describe('literalDirPrefix', () => {
  it('names the path a glob pattern spells out, and leaves a bare name alone', () => {
    expect(literalDirPrefix('@molecule/api-resource-user/dist/*.d.ts')).toBe(
      '@molecule/api-resource-user/dist',
    )
    expect(literalDirPrefix('node_modules/@molecule/api-resource-comment/dist/*.d.ts')).toBe(
      'node_modules/@molecule/api-resource-comment/dist',
    )
    expect(literalDirPrefix('./my-app/src/bonds/*.ts')).toBe('my-app/src/bonds')
    // A bare first segment means "at any depth" (xr-molecule-flash-m77): rooting it
    // at `<root>/helpers` would answer with a silent SUBSET.
    expect(literalDirPrefix('helpers/*')).toBeNull()
    expect(literalDirPrefix('e2e/*.spec.ts')).toBeNull()
    // No glob, or a glob with no directory before it: nothing to root at.
    expect(literalDirPrefix('api/src/handlers/conduit.ts')).toBeNull()
    expect(literalDirPrefix('*.d.ts')).toBeNull()
    expect(literalDirPrefix('**/SELECTORS.md')).toBeNull()
  })
})

describe('findPathArgs', () => {
  it('keeps the any-depth `-path` form for a remainder with no slash', () => {
    expect(findPathArgs('*.d.ts')).toBe("-path '*/*.d.ts'")
    expect(findPathArgs('**/App.tsx')).toBe("\\( -path '*/App.tsx' -o -path '*/**/App.tsx' \\)")
  })
})

// ── against a real directory: the narrowed search finds the same files ───────

let root: string
const write = (rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'find-literal-dir-'))
  // The m94 shape: a scoped package inside node_modules, declarations at the top
  // of `dist/` and one level down.
  write('node_modules/@molecule/api-resource-user/dist/index.d.ts', 'export\n')
  write('node_modules/@molecule/api-resource-user/dist/handlers/create.d.ts', 'export\n')
  write('node_modules/@molecule/api-resource-user/dist/index.js', 'module.exports\n')
  write('node_modules/@molecule/api-resource-comment/dist/index.d.ts', 'export\n')
  // The m77 shape: a `helpers/` at the root AND one nested, where only the root
  // copy is what a naive narrowing would return.
  write('helpers/top.ts', 'top\n')
  write('my-app/src/helpers/deep.ts', 'deep\n')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const findFiles = (
  input: Record<string, string>,
): Promise<{ files?: string[]; note?: string; error?: string }> => {
  const tool = buildTools(createLocalBackend(root)).find((t) => t.name === 'find_files')
  if (!tool) throw new Error('find_files not built')
  return tool.execute(input) as Promise<{ files?: string[]; note?: string; error?: string }>
}

const base = (paths: string[] | undefined): string[] =>
  (paths ?? []).map((p) => p.slice(root.length)).sort()

describe('find_files against a real tree', () => {
  it('finds every declaration under the named directory, nested ones included', async () => {
    const out = await findFiles({
      path: 'node_modules',
      pattern: '@molecule/api-resource-user/dist/*.d.ts',
    })
    expect(base(out.files)).toEqual([
      '/node_modules/@molecule/api-resource-user/dist/handlers/create.d.ts',
      '/node_modules/@molecule/api-resource-user/dist/index.d.ts',
    ])
    expect(out.note).toBeUndefined()
  })

  it('still finds a bare-name directory at any depth (`helpers/*`)', async () => {
    const out = await findFiles({ path: '.', pattern: 'helpers/*' })
    expect(base(out.files)).toEqual(['/helpers/top.ts', '/my-app/src/helpers/deep.ts'])
  })
})
