import { beforeEach, describe, expect, it, vi } from 'vitest'

// project-archive DESTROYS the original once a capture verifies, so every test
// here is really about one question: can this provider ever report success
// having captured nothing? The cases that matter are the silent ones — a local
// (empty) export mistaken for the real database, a zero-byte export mistaken
// for an empty one, and a resolver that answered with something other than a
// list.

const dump = vi.hoisted(() => ({
  dumpToFile: vi.fn(async () => 128),
  restoreFromFile: vi.fn(async () => undefined),
}))
const fsp = vi.hoisted(() => ({ readFile: vi.fn(async () => Buffer.alloc(128)) }))

vi.mock('../dump.js', () => dump)
vi.mock('node:fs/promises', () => fsp)

const { createD1ExternalStateProvider, KIND } = await import('../provider.js')

const captureInput = (projectId = 'p1') => ({
  projectId,
  workDir: '/tmp/work',
})

beforeEach(() => {
  vi.resetAllMocks()
  dump.dumpToFile.mockResolvedValue(128)
  dump.restoreFromFile.mockResolvedValue(undefined)
  fsp.readFile.mockResolvedValue(Buffer.alloc(128))
})

describe('capture', () => {
  it('exports each declared database and records a part for it', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a', 'mol_b'] })

    const result = await provider.capture(captureInput() as never)

    expect(result.parts).toHaveLength(2)
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({ kind: KIND, id: 'mol_a' })
    expect(result.parts[0].kind).toBe('database')
  })

  it('passes --remote by default, so it never dumps the empty local database', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await provider.capture(captureInput() as never)

    const args = dump.dumpToFile.mock.calls[0][1] as string[]
    expect(args).toContain('--remote')
    expect(args.slice(0, 3)).toEqual(['d1', 'export', 'mol_a'])
  })

  it('omits --remote only when explicitly opted out', async () => {
    const provider = createD1ExternalStateProvider({
      databaseNames: () => ['mol_a'],
      remote: false,
    })

    await provider.capture(captureInput() as never)

    expect(dump.dumpToFile.mock.calls[0][1] as string[]).not.toContain('--remote')
  })

  it('treats a zero-byte export as a FAILURE, not an empty database', async () => {
    dump.dumpToFile.mockResolvedValue(0)
    fsp.readFile.mockResolvedValue(Buffer.alloc(0))
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await expect(provider.capture(captureInput() as never)).rejects.toThrow(/zero-byte|empty/i)
  })

  it('refuses a dump whose size changed under it', async () => {
    dump.dumpToFile.mockResolvedValue(128)
    fsp.readFile.mockResolvedValue(Buffer.alloc(64))
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await expect(provider.capture(captureInput() as never)).rejects.toThrow(/changed under us/i)
  })

  it('captures nothing — successfully — only when the config DECLARES none', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => [] })

    const result = await provider.capture(captureInput() as never)

    expect(result.parts).toEqual([])
    expect(result.records).toEqual([])
    expect(dump.dumpToFile).not.toHaveBeenCalled()
  })

  it.each([
    ['undefined', undefined],
    ['a bare string', 'mol_a'],
    ['a Set', new Set(['mol_a'])],
    ['an array with an empty name', ['']],
  ])(
    'rejects a resolver that returned %s rather than reading it as "owns nothing"',
    async (_label, value) => {
      const provider = createD1ExternalStateProvider({
        databaseNames: () => value as unknown as string[],
      })

      await expect(provider.capture(captureInput() as never)).rejects.toThrow(
        /must return an array/i,
      )
      expect(dump.dumpToFile).not.toHaveBeenCalled()
    },
  )
})

describe('restore', () => {
  const restoreInput = (records: { kind: string; id: string; part?: string }[]) => ({
    projectId: 'p1',
    records,
    partPath: (part: string) => `/archive/${part}`,
  })

  it('applies each export with --file in argv, not on stdin', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await provider.restore(
      restoreInput([{ kind: KIND, id: 'mol_a', part: 'database/d1/mol_a.sql' }]) as never,
    )

    const [, args, srcPath] = dump.restoreFromFile.mock.calls[0] as [string, string[], string]
    expect(args).toContain('--file')
    expect(args).toContain('/archive/database/d1/mol_a.sql')
    // wrangler never reads stdin; streaming to it would apply nothing while
    // still exiting 0.
    expect(srcPath).toBe('')
  })

  it('refuses to restore a database the config does not name', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await expect(
      provider.restore(
        restoreInput([{ kind: KIND, id: 'mol_ghost', part: 'database/d1/x.sql' }]) as never,
      ),
    ).rejects.toThrow(/does not name it/i)
  })

  it('refuses a record with no part to restore from', async () => {
    const provider = createD1ExternalStateProvider({ databaseNames: () => ['mol_a'] })

    await expect(
      provider.restore(restoreInput([{ kind: KIND, id: 'mol_a' }]) as never),
    ).rejects.toThrow(/no export to restore from/i)
  })
})
