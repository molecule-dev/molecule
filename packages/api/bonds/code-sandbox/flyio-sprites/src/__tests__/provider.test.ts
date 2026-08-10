import { describe, expect, it } from 'vitest'

import { SPRITES_ACCESS_SHIM_PATH } from '../access-shim.js'
import { spriteNameFor } from '../names.js'
import {
  createProvider,
  mapSpriteStatus,
  renderPlatformEnv,
  SpritesSandboxProvider,
} from '../provider.js'
import { fakeClient, fakeSprite } from './helpers.js'

/**
 * Extracts and decodes the base64 payload a command pipes into `target`
 * (`printf %s '<b64>' | base64 -d > <target>`).
 *
 * @param command - The recorded shell command.
 * @param target - The redirect target path.
 * @returns The decoded payload ('' when the command has no such write).
 */
function decodePrintfTarget(command: string, target: string): string {
  const match = new RegExp(
    `printf %s '([^']+)' \\| base64 -d > ${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
  ).exec(command)
  return match ? Buffer.from(match[1], 'base64').toString('utf-8') : ''
}

describe('spriteNameFor', () => {
  it('prefixes and passes through a clean project id', () => {
    expect(spriteNameFor('mol-', 'abc-123')).toBe('mol-abc-123')
  })

  it('lowercases and collapses invalid characters', () => {
    expect(spriteNameFor('mol-', 'My_Project!!id')).toBe('mol-my-project-id')
  })

  it('strips leading/trailing dashes from the sanitized id', () => {
    expect(spriteNameFor('mol-', '--x--')).toBe('mol-x')
  })

  it('bounds the total length', () => {
    expect(spriteNameFor('mol-', 'a'.repeat(200)).length).toBeLessThanOrEqual(63)
  })

  it('throws when nothing survives sanitization', () => {
    expect(() => spriteNameFor('mol-', '!!!')).toThrow(/sprite name/i)
  })
})

describe('mapSpriteStatus', () => {
  it('maps running to running', () => {
    expect(mapSpriteStatus('running')).toBe('running')
  })
  it('maps warm to sleeping', () => {
    expect(mapSpriteStatus('warm')).toBe('sleeping')
  })
  it('maps cold to stopped', () => {
    expect(mapSpriteStatus('cold')).toBe('stopped')
  })
  it('maps unknown/transitional states to creating', () => {
    expect(mapSpriteStatus('provisioning')).toBe('creating')
    expect(mapSpriteStatus(undefined)).toBe('creating')
  })
  it('is case-insensitive', () => {
    expect(mapSpriteStatus('RUNNING')).toBe('running')
  })
})

describe('renderPlatformEnv', () => {
  it('renders export lines with single quotes', () => {
    expect(renderPlatformEnv({ A: 'b' })).toBe("export A='b'\n")
  })
  it('escapes embedded single quotes', () => {
    expect(renderPlatformEnv({ A: "it's" })).toContain(`'"'"'`)
  })
  it('strips CR/LF so a value cannot smuggle shell lines', () => {
    expect(renderPlatformEnv({ A: 'x\nrm -rf /\r' })).toBe("export A='xrm -rf /'\n")
  })
})

describe('create', () => {
  it('creates a sprite named from the prefix + project id, with env and public url auth', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    const sandbox = await provider.create({ projectId: 'P1', env: { FOO: 'bar' } })

    expect(sandbox.id).toBe('mol-p1')
    expect(client.created).toHaveLength(1)
    const options = client.created[0].options as {
      environment?: Record<string, string>
      urlSettings?: { auth?: string }
      waitForCapacity?: boolean
    }
    expect(options.environment).toEqual({ FOO: 'bar' })
    expect(options.urlSettings?.auth).toBe('public')
    expect(options.waitForCapacity).toBe(true)
  })

  it('honors urlAuth: sprite', async () => {
    const client = fakeClient()
    const provider = createProvider({ urlAuth: 'sprite' }, client)
    await provider.create({ projectId: 'p' })
    expect(
      (client.created[0].options as { urlSettings?: { auth?: string } }).urlSettings?.auth,
    ).toBe('sprite')
  })

  it('maps resources onto the sprite config (MB → GB disk, ceil)', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    await provider.create({
      projectId: 'p',
      resources: { cpu: 2, memoryMB: 2048, diskMB: 1500 },
    })
    const config = (
      client.created[0].options as {
        config?: { cpus?: number; ramMB?: number; storageGB?: number }
      }
    ).config
    expect(config).toEqual({ cpus: 2, ramMB: 2048, storageGB: 2 })
  })

  it('writes /etc/mol/env with the caller env AND VITE_ALLOWED_HOSTS', async () => {
    const client = fakeClient()
    const provider = createProvider({ extraViteAllowedHosts: ['.mlcl.dev'] }, client)
    const sandbox = await provider.create({ projectId: 'p1', env: { K: 'v' } })
    const sprite = client.spritesByName[sandbox.id]
    expect(sprite.execCalls).toHaveLength(1)
    const command = sprite.execCalls[0].command
    expect(command).toContain('/etc/mol/env')
    const decoded = decodePrintfTarget(command, '/etc/mol/env')
    expect(decoded).toContain("export K='v'")
    expect(decoded).toContain("export VITE_ALLOWED_HOSTS='.sprites.app,.mlcl.dev'")
  })

  it('writes the access-shim preload and requires it via NODE_OPTIONS', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    const sandbox = await provider.create({ projectId: 'p1' })
    const sprite = client.spritesByName[sandbox.id]
    const command = sprite.execCalls[0].command
    expect(command).toContain(SPRITES_ACCESS_SHIM_PATH)
    // The shim payload itself: decodable, and it patches the access family.
    const shim = decodePrintfTarget(command, SPRITES_ACCESS_SHIM_PATH)
    expect(shim).toContain('fs.accessSync =')
    expect(shim).toContain('fs.existsSync =')
    expect(shim).toContain("err.code === 'EACCES'")
    // And the env file preloads it into every node process.
    const env = decodePrintfTarget(command, '/etc/mol/env')
    expect(env).toContain(`export NODE_OPTIONS='--require ${SPRITES_ACCESS_SHIM_PATH}'`)
  })

  it('preserves caller NODE_OPTIONS ahead of the shim require', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    const sandbox = await provider.create({
      projectId: 'p1',
      env: { NODE_OPTIONS: '--max-old-space-size=4096' },
    })
    const sprite = client.spritesByName[sandbox.id]
    const env = decodePrintfTarget(sprite.execCalls[0].command, '/etc/mol/env')
    expect(env).toContain(
      `export NODE_OPTIONS='--max-old-space-size=4096 --require ${SPRITES_ACCESS_SHIM_PATH}'`,
    )
  })

  it('throws when the platform env write fails', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    // Pre-seed so create() adopts this sprite whose exec fails.
    client.spritesByName['mol-p1'] = fakeSprite({
      name: 'mol-p1',
      exec: { stdout: '', stderr: 'disk full', exitCode: 1 },
    })
    await expect(provider.create({ projectId: 'p1' })).rejects.toThrow(/\/etc\/mol/)
  })

  it('applies defaultNetworkRules at creation', async () => {
    const client = fakeClient()
    const rules = [{ domain: 'registry.npmjs.org', action: 'allow' as const }]
    const provider = createProvider({ defaultNetworkRules: rules }, client)
    const sandbox = await provider.create({ projectId: 'p1' })
    const sprite = client.spritesByName[sandbox.id]
    expect(sprite.networkPolicies).toEqual([{ rules }])
  })

  it('applies no network policy when no rules are configured', async () => {
    const client = fakeClient()
    const provider = createProvider({}, client)
    const sandbox = await provider.create({ projectId: 'p1' })
    expect(client.spritesByName[sandbox.id].networkPolicies).toHaveLength(0)
  })

  it('adopts an existing sprite on a name collision', async () => {
    const client = fakeClient({
      sprites: { 'mol-p1': fakeSprite({ name: 'mol-p1', status: 'warm' }) },
    })
    const provider = createProvider({}, client)
    const sandbox = await provider.create({ projectId: 'p1' })
    expect(sandbox.id).toBe('mol-p1')
    expect(sandbox.status).toBe('sleeping')
  })

  it('THROWS on templateId rather than silently booting the base image', async () => {
    const provider = createProvider({}, fakeClient())
    await expect(provider.create({ projectId: 'p1', templateId: 'tpl-x' })).rejects.toThrow(/tpl-x/)
  })

  it('rethrows non-collision create failures', async () => {
    const client = fakeClient({ createError: new Error('capacity exhausted') })
    const provider = createProvider({}, client)
    await expect(provider.create({ projectId: 'p1' })).rejects.toThrow(/capacity/)
  })
})

describe('get', () => {
  it('returns a facade for an existing sprite', async () => {
    const client = fakeClient({
      sprites: {
        'mol-x': fakeSprite({ name: 'mol-x', url: 'https://x.sprites.app', status: 'running' }),
      },
    })
    const provider = createProvider({}, client)
    const sandbox = await provider.get('mol-x')
    expect(sandbox?.id).toBe('mol-x')
    expect(sandbox?.status).toBe('running')
    expect(sandbox?.previewUrl).toBe('https://x.sprites.app')
  })

  it('returns null on 404', async () => {
    const provider = createProvider({}, fakeClient())
    expect(await provider.get('mol-none')).toBeNull()
  })
})

describe('list', () => {
  it('lists only prefix-scoped sprites', async () => {
    const client = fakeClient({
      sprites: {
        'mol-a': fakeSprite({ name: 'mol-a' }),
        'other-b': fakeSprite({ name: 'other-b' }),
      },
    })
    const provider = createProvider({}, client)
    const sandboxes = await provider.list('user-1')
    expect(sandboxes.map((s) => s.id)).toEqual(['mol-a'])
  })
})

describe('destroy', () => {
  it('deletes the sprite', async () => {
    const client = fakeClient({ sprites: { 'mol-a': fakeSprite({ name: 'mol-a' }) } })
    const provider = createProvider({}, client)
    await provider.destroy('mol-a')
    expect(client.deleted).toContain('mol-a')
  })

  it('tolerates deleting a sprite that is already gone', async () => {
    const provider = createProvider({}, fakeClient())
    await expect(provider.destroy('mol-gone')).resolves.toBeUndefined()
  })
})

describe('the sandbox facade', () => {
  const facade = async (sprite = fakeSprite()) => {
    const client = fakeClient({ sprites: { [sprite.name]: sprite } })
    const provider = createProvider({}, client)
    const sandbox = await provider.get(sprite.name)
    if (!sandbox) throw new Error('expected sandbox')
    return { sandbox, sprite }
  }

  it('start/stop/sleep/wake are no-ops that resolve', async () => {
    const { sandbox } = await facade()
    await expect(sandbox.start()).resolves.toBeUndefined()
    await expect(sandbox.stop()).resolves.toBeUndefined()
    await expect(sandbox.sleep()).resolves.toBeUndefined()
    await expect(sandbox.wake()).resolves.toBeUndefined()
  })

  it('exec maps the SDK result and passes cwd/env/timeout through', async () => {
    const { sandbox, sprite } = await facade(
      fakeSprite({ exec: { stdout: 'out', stderr: 'err', exitCode: 3 } }),
    )
    const result = await sandbox.exec('ls', { cwd: '/workspace', timeout: 5000 })
    expect(result).toEqual({ stdout: 'out', stderr: 'err', exitCode: 3 })
    expect(sprite.execCalls[0].options).toMatchObject({ cwd: '/workspace', timeout: 5000 })
  })

  it('exec recovers the result carried by an ExecError-shaped rejection', async () => {
    const sprite = fakeSprite()
    sprite.execFile = async () => {
      const error = new Error('Command failed') as Error & {
        result: { stdout: string; stderr: string; exitCode: number }
      }
      error.result = { stdout: '', stderr: 'boom', exitCode: 7 }
      throw error
    }
    const { sandbox } = await facade(sprite)
    const result = await sandbox.exec('false')
    expect(result.exitCode).toBe(7)
    expect(result.stderr).toBe('boom')
  })

  it('importFiles uploads one buffer and extracts with ownership/permission bits masked', async () => {
    const sprite = fakeSprite()
    const { sandbox } = await facade(sprite)
    async function* archive(): AsyncIterable<Uint8Array> {
      yield new Uint8Array([1, 2])
      yield new Uint8Array([3])
    }
    await sandbox.importFiles!('/workspace/my-app', archive())
    const written = Object.entries(sprite.writes).find(([p]) => p.startsWith('/tmp/mol-import-'))
    expect(written).toBeDefined()
    expect(Buffer.from(written![1] as Uint8Array)).toEqual(Buffer.from([1, 2, 3]))
    const extract = sprite.execCalls.find((c) => c.command.includes('tar -xf'))
    expect(extract?.command).toContain(`-C '/workspace/my-app'`)
    expect(extract?.command).toContain('--no-same-owner --no-same-permissions')
  })

  it('readFile/writeFile round-trip through the Filesystem API', async () => {
    const { sandbox } = await facade(fakeSprite({ files: { '/a.txt': 'hello' } }))
    expect(await sandbox.readFile('/a.txt')).toBe('hello')
    await sandbox.writeFile('/b.txt', 'world')
    expect(await sandbox.readFile('/b.txt')).toBe('world')
  })

  it('readDir maps Dirent flags to the core entry type', async () => {
    const { sandbox } = await facade(
      fakeSprite({
        dirs: {
          '/workspace': [
            { name: 'app', isDirectory: () => true },
            { name: 'package.json', isDirectory: () => false },
          ],
        },
      }),
    )
    expect(await sandbox.readDir('/workspace')).toEqual([
      { name: 'app', type: 'directory' },
      { name: 'package.json', type: 'file' },
    ])
  })

  it('readDir THROWS on a missing path — [] must mean "exists and is empty"', async () => {
    const { sandbox } = await facade(fakeSprite({ dirs: {} }))
    await expect(sandbox.readDir('/nope')).rejects.toThrow(/ENOENT/)
  })

  it('getPreviewUrl returns the sprite URL regardless of port', async () => {
    const { sandbox } = await facade(fakeSprite({ url: 'https://u.sprites.app' }))
    expect(sandbox.getPreviewUrl(5173)).toBe('https://u.sprites.app')
    expect(sandbox.getPreviewUrl()).toBe('https://u.sprites.app')
  })

  it('onFileChange returns a no-op unsubscribe', async () => {
    const { sandbox } = await facade()
    const unsubscribe = sandbox.onFileChange(() => {})
    expect(() => unsubscribe()).not.toThrow()
  })

  it('setResources records a memory policy', async () => {
    const { sandbox, sprite } = await facade()
    await sandbox.setResources?.({ memoryMB: 4096 })
    expect(sprite.resourcesPolicies).toEqual([{ memory: { limitMB: 4096 } }])
  })

  it('setResources THROWS for cpu/disk instead of silently ignoring them', async () => {
    const { sandbox } = await facade()
    await expect(sandbox.setResources?.({ cpu: 4 })).rejects.toThrow(/memory/i)
    await expect(sandbox.setResources?.({ diskMB: 10_000 })).rejects.toThrow(/memory/i)
  })
})

describe('verifyEgress', () => {
  const rules = [{ domain: 'registry.npmjs.org', action: 'allow' as const }]
  /** Wires the NEXT created sprite (the probe) to answer probes per-target. */
  const probeClient = (reachable: Record<string, boolean>) => {
    const client = fakeClient()
    const original = client.createSprite.bind(client)
    client.createSprite = async (name, options) => {
      await original(name, options)
      const sprite = fakeSprite({
        name,
        exec: (command: string) => {
          const host = /https:\/\/([^ ]+)/.exec(command)?.[1] ?? ''
          return { stdout: reachable[host] ? 'OK' : 'BLOCKED', stderr: '', exitCode: 0 }
        },
      })
      client.spritesByName[name] = sprite
      return sprite
    }
    return client
  }

  it('reports filtered when the allowed target connects and the canary is denied', async () => {
    const client = probeClient({ 'registry.npmjs.org': true, 'example.com': false })
    const provider = new SpritesSandboxProvider({ defaultNetworkRules: rules }, client)
    const verdict = await provider.verifyEgress()
    expect(verdict.state).toBe('filtered')
  })

  it('reports open when the canary is reachable despite the policy', async () => {
    const client = probeClient({ 'registry.npmjs.org': true, 'example.com': true })
    const provider = new SpritesSandboxProvider({ defaultNetworkRules: rules }, client)
    const verdict = await provider.verifyEgress()
    expect(verdict.state).toBe('open')
  })

  it('reports open (never filtered) when no rules are configured and the canary connects', async () => {
    const client = probeClient({ 'example.com': true })
    const provider = new SpritesSandboxProvider({}, client)
    const verdict = await provider.verifyEgress()
    expect(verdict.state).toBe('open')
    expect(verdict.remediation).toContain('defaultNetworkRules')
  })

  it('reports inconclusive when both targets fail — filtering vs no egress at all', async () => {
    const client = probeClient({ 'registry.npmjs.org': false, 'example.com': false })
    const provider = new SpritesSandboxProvider({ defaultNetworkRules: rules }, client)
    const verdict = await provider.verifyEgress()
    expect(verdict.state).toBe('inconclusive')
  })

  it('reports inconclusive (never filtered) when the probe cannot run', async () => {
    const client = fakeClient({ createError: new Error('no capacity') })
    const provider = new SpritesSandboxProvider({ defaultNetworkRules: rules }, client)
    const verdict = await provider.verifyEgress()
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.detail).toContain('could not run')
  })

  it('reaps the probe sprite even on a filtered verdict', async () => {
    const client = probeClient({ 'registry.npmjs.org': true, 'example.com': false })
    const provider = new SpritesSandboxProvider({ defaultNetworkRules: rules }, client)
    await provider.verifyEgress()
    expect(client.deleted.some((name) => name.includes('egress-probe'))).toBe(true)
  })
})

describe('constructor', () => {
  it('throws without a token when no client is injected', () => {
    const token = process.env.SPRITE_TOKEN
    delete process.env.SPRITE_TOKEN
    try {
      expect(() => createProvider({})).toThrow(/SPRITE_TOKEN/)
    } finally {
      if (token !== undefined) process.env.SPRITE_TOKEN = token
    }
  })
})
