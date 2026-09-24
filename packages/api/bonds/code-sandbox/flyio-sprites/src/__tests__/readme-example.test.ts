/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `@fly/sprites` SDK (the
 * network) is replaced by an in-test fake; the provider's own logic runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-code-sandbox'

import { createProvider } from '../index.js'

interface ExecResultLike {
  stdout: string
  stderr: string
  exitCode: number
}

const sdk = vi.hoisted(() => {
  const files = new Map<string, string>()
  const constructed: Array<{ token: string; options: unknown }> = []
  const created: Array<{ name: string; options: unknown }> = []
  const deleted: string[] = []
  const policies: unknown[] = []
  const commands: string[] = []
  const sprite = {
    name: 'mol-proj-123',
    url: 'https://mol-proj-123-abc.sprites.app',
    status: 'running',
    execFile: async (_file: string, args: string[]): Promise<ExecResultLike> => {
      const command = args[1] ?? ''
      commands.push(command)
      const run = /^node (\S+)$/.exec(command)
      const printed = run?.[1] ? /console\.log\('(.*)'\)/.exec(files.get(run[1]) ?? '')?.[1] : ''
      return { stdout: printed ? `${printed}\n` : '', stderr: '', exitCode: 0 }
    },
    filesystem: () => ({
      readFile: async (path: string) => files.get(path) ?? '',
      writeFile: async (path: string, data: string) => {
        files.set(path, data)
      },
      readdir: async () => [],
      rm: async (path: string) => {
        files.delete(path)
      },
    }),
    updateNetworkPolicy: async (policy: unknown) => {
      policies.push(policy)
    },
    updateResourcesPolicy: async () => undefined,
    getService: async () => {
      throw new Error('service not found')
    },
    createService: async () => (async function* () {})(),
    stopService: async () => ({}),
    deleteService: async () => undefined,
  }
  return { files, constructed, created, deleted, policies, commands, sprite }
})

vi.mock('@fly/sprites', () => ({
  SpritesClient: class {
    constructor(token: string, options: unknown) {
      sdk.constructed.push({ token, options })
    }
    sprite(): typeof sdk.sprite {
      return sdk.sprite
    }
    async createSprite(name: string, options: unknown): Promise<typeof sdk.sprite> {
      sdk.created.push({ name, options })
      return sdk.sprite
    }
    async getSprite(): Promise<typeof sdk.sprite> {
      return sdk.sprite
    }
    async listSprites(): Promise<{ sprites: []; hasMore: false }> {
      return { sprites: [], hasMore: false }
    }
    async deleteSprite(name: string): Promise<void> {
      sdk.deleted.push(name)
    }
  },
}))

describe('README @example', () => {
  const originalToken = process.env.SPRITE_TOKEN

  afterEach(() => {
    if (originalToken === undefined) delete process.env.SPRITE_TOKEN
    else process.env.SPRITE_TOKEN = originalToken
    vi.restoreAllMocks()
  })

  it('creates a policy-restricted sprite, runs a file, exposes its URL and destroys it', async () => {
    process.env.SPRITE_TOKEN = 'sprite-test-token'
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        token: process.env.SPRITE_TOKEN,
        namePrefix: 'mol-',
        defaultNetworkRules: [
          { domain: 'registry.npmjs.org', action: 'allow' },
          { domain: 'github.com', action: 'allow' },
        ],
      }),
    )

    const sandbox = await requireProvider().create({
      projectId: 'proj_123',
      env: { NODE_ENV: 'development' },
    })
    await sandbox.writeFile('/workspace/hello.js', "console.log('hello from a sprite')")
    const result = await sandbox.exec('node /workspace/hello.js', { timeout: 30_000 })
    if (result.exitCode !== 0) throw new Error(`sandbox exec failed: ${result.stderr}`)
    console.log(result.stdout)
    console.log(sandbox.getPreviewUrl())

    await requireProvider().destroy(sandbox.id)

    expect(log).toHaveBeenNthCalledWith(1, 'hello from a sprite\n')
    expect(log).toHaveBeenNthCalledWith(2, 'https://mol-proj-123-abc.sprites.app')
    expect(sdk.constructed[0]?.token).toBe('sprite-test-token')
    expect(sdk.created[0]).toMatchObject({
      name: 'mol-proj-123',
      options: { environment: { NODE_ENV: 'development' }, urlSettings: { auth: 'public' } },
    })
    expect(sdk.policies[0]).toMatchObject({
      rules: expect.arrayContaining([
        { domain: 'registry.npmjs.org', action: 'allow' },
        { domain: 'github.com', action: 'allow' },
      ]),
    })
    expect(sdk.commands.some((c) => c.includes('/etc/mol/env'))).toBe(true)
    expect(sdk.deleted).toEqual(['mol-proj-123'])
  })
})
