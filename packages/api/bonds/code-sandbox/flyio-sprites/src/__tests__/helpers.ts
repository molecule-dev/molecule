/**
 * Test doubles for the Sprites SDK slices the provider consumes.
 *
 * @module
 */

import { vi } from 'vitest'

import type {
  SpriteDirentLike,
  SpriteExecResultLike,
  SpriteLike,
  SpritesClientLike,
} from '../provider.js'

/** Knobs for a fake sprite. */
export interface FakeSpriteOptions {
  name?: string
  url?: string
  status?: string
  /** Result returned by every exec (or a function of the command). */
  exec?: SpriteExecResultLike | ((command: string) => SpriteExecResultLike)
  /** Files served by readFile; writeFile records here too. */
  files?: Record<string, string>
  /** Directory listings served by readdir; missing path throws ENOENT. */
  dirs?: Record<string, SpriteDirentLike[]>
  /** Service definitions returned by getService (by name). */
  services?: Record<string, { cmd: string; args: string[]; dir?: string }>
  /** When set, createService overwrites `services[name]` with the request. */
  applyServiceCreates?: boolean
}

/** A fake sprite with vi.fn-wrapped members so tests can assert calls. */
export interface FakeSprite extends SpriteLike {
  execCalls: { command: string; options?: unknown }[]
  networkPolicies: { rules: unknown[] }[]
  resourcesPolicies: unknown[]
  serviceCreates: { name: string; config: unknown }[]
  serviceStops: string[]
  serviceDeletes: string[]
  writes: Record<string, string>
}

/**
 * Builds a fake sprite satisfying {@link SpriteLike}.
 *
 * @param options - Behavior knobs.
 * @returns The fake.
 */
export function fakeSprite(options: FakeSpriteOptions = {}): FakeSprite {
  const files: Record<string, string> = { ...(options.files ?? {}) }
  const services: Record<string, { cmd: string; args: string[]; dir?: string }> = {
    ...(options.services ?? {}),
  }
  const fake: FakeSprite = {
    name: options.name ?? 'mol-test',
    url: options.url ?? 'https://mol-test-abc.sprites.app',
    status: options.status ?? 'running',
    execCalls: [],
    networkPolicies: [],
    resourcesPolicies: [],
    serviceCreates: [],
    serviceStops: [],
    serviceDeletes: [],
    writes: {},
    // The bond only ever calls execFile('sh', ['-c', command]) — the SDK's
    // string exec has NO shell (naive whitespace split). The fake records the
    // reconstructed shell command so assertions stay readable.
    execFile: vi.fn(async (file: string, args: string[], opts?: unknown) => {
      const command = file === 'sh' && args[0] === '-c' ? args[1] : [file, ...args].join(' ')
      fake.execCalls.push({ command, options: opts })
      const result = options.exec
      if (typeof result === 'function') return result(command)
      return result ?? { stdout: '', stderr: '', exitCode: 0 }
    }),
    filesystem: () => ({
      readFile: async (path: string) => {
        if (!(path in files)) throw new Error(`ENOENT: no such file: ${path}`)
        return files[path]
      },
      writeFile: async (path: string, data: string) => {
        files[path] = data
        fake.writes[path] = data
      },
      readdir: async (path: string) => {
        const entries = options.dirs?.[path]
        if (!entries) throw new Error(`ENOENT: no such directory: ${path}`)
        return entries
      },
      rm: async (path: string) => {
        delete files[path]
      },
    }),
    updateNetworkPolicy: vi.fn(async (policy: { rules: unknown[] }) => {
      fake.networkPolicies.push(policy)
    }) as SpriteLike['updateNetworkPolicy'],
    updateResourcesPolicy: vi.fn(async (policy: unknown) => {
      fake.resourcesPolicies.push(policy)
    }) as SpriteLike['updateResourcesPolicy'],
    getService: async (name: string) => {
      if (!(name in services)) throw new Error(`service not found: ${name}`)
      return services[name]
    },
    createService: async (name: string, config: unknown) => {
      fake.serviceCreates.push({ name, config })
      if (options.applyServiceCreates !== false) {
        const c = config as { cmd: string; args: string[]; dir?: string }
        services[name] = { cmd: c.cmd, args: c.args, dir: c.dir }
      }
      return (async function* () {
        yield { type: 'complete' }
      })()
    },
    stopService: async (name: string) => {
      fake.serviceStops.push(name)
      return {}
    },
    deleteService: async (name: string) => {
      fake.serviceDeletes.push(name)
      delete services[name]
    },
  }
  return fake
}

/** Knobs for the fake client. */
export interface FakeClientOptions {
  /** Sprites that already exist, by name. */
  sprites?: Record<string, FakeSprite>
  /** When set, createSprite rejects with this error. */
  createError?: Error
  /** Status stamped onto listSprites entries. */
  listStatus?: string
}

/** A fake client satisfying {@link SpritesClientLike}, with call recording. */
export interface FakeClient extends SpritesClientLike {
  created: { name: string; options?: unknown }[]
  deleted: string[]
  spritesByName: Record<string, FakeSprite>
}

/**
 * Builds a fake client satisfying {@link SpritesClientLike}.
 *
 * @param options - Behavior knobs.
 * @returns The fake.
 */
export function fakeClient(options: FakeClientOptions = {}): FakeClient {
  const sprites: Record<string, FakeSprite> = { ...(options.sprites ?? {}) }
  const client: FakeClient = {
    created: [],
    deleted: [],
    spritesByName: sprites,
    sprite: (name: string) => {
      sprites[name] = sprites[name] ?? fakeSprite({ name })
      return sprites[name]
    },
    createSprite: async (name: string, createOptions?: unknown) => {
      client.created.push({ name, options: createOptions })
      if (options.createError) throw options.createError
      if (sprites[name]) throw new Error(`A sprite named '${name}' already exists.`)
      sprites[name] = fakeSprite({ name })
      return sprites[name]
    },
    getSprite: async (name: string) => {
      const sprite = sprites[name]
      if (!sprite) {
        const error = new Error('sprite not found') as Error & { statusCode: number }
        error.statusCode = 404
        throw error
      }
      return sprite
    },
    listSprites: async (listOptions?: { prefix?: string; continuationToken?: string }) => {
      const names = Object.keys(sprites).filter((n) =>
        listOptions?.prefix ? n.startsWith(listOptions.prefix) : true,
      )
      return {
        sprites: names.map((name) => ({ name, status: options.listStatus ?? 'running' })),
        hasMore: false,
      }
    },
    deleteSprite: async (name: string) => {
      client.deleted.push(name)
      if (!sprites[name]) {
        const error = new Error('sprite not found') as Error & { statusCode: number }
        error.statusCode = 404
        throw error
      }
      delete sprites[name]
    },
  }
  return client
}
