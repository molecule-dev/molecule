import { describe, expect, it } from 'vitest'

import { classifyEgressProbe, E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

// The egress probe curls an allow-listed control host, a denied host and a raw
// IP. A probe sandbox with NO network blocks all three — which says nothing about
// the policy, and must never read as open (2026-10-04: production refused to boot
// on `host=000000, rawIP=000000, allowed=000`).

describe('classifyEgressProbe', () => {
  it('filtered: control host answered, both denied probes blocked', () => {
    expect(classifyEgressProbe({ allowed: '200', deniedHost: '000', deniedIp: '000' }).state).toBe(
      'filtered',
    )
  })

  it('open: a denied probe answered a real HTTP status', () => {
    expect(classifyEgressProbe({ allowed: '200', deniedHost: '200', deniedIp: '000' }).state).toBe(
      'open',
    )
    expect(classifyEgressProbe({ allowed: '200', deniedHost: '000', deniedIp: '301' }).state).toBe(
      'open',
    )
  })

  it('inconclusive: no network at all (control host unreachable)', () => {
    const v = classifyEgressProbe({ allowed: '000', deniedHost: '000000', deniedIp: '000000' })
    expect(v.state).toBe('inconclusive')
    expect(v.detail).toContain('probe sandbox had no network (allowed=000')
    expect(classifyEgressProbe({ allowed: '', deniedHost: '', deniedIp: '' }).state).toBe(
      'inconclusive',
    )
  })

  it('treats any all-zero code as blocked', () => {
    expect(
      classifyEgressProbe({ allowed: '200', deniedHost: '000000', deniedIp: '0000' }).state,
    ).toBe('filtered')
  })
})

describe('verifyEgress() end to end over a fake sandbox', () => {
  function providerAnswering(codes: Record<string, string>): {
    createOpts: Record<string, unknown>[]
    provider: E2BSandboxProvider
    commands: string[]
  } {
    const commands: string[] = []
    const createOpts: Record<string, unknown>[] = []
    const sbx: E2BSandboxLike = {
      sandboxId: 'sbx-probe',
      commands: {
        run: (async (cmd: string) => {
          commands.push(cmd)
          const host = Object.keys(codes).find((h) => cmd.includes(`https://${h}/`))
          const result = { stdout: host ? codes[host] : '', stderr: '', exitCode: host ? 7 : 0 }
          // exec() starts in the background and awaits the handle.
          return { ...result, pid: 1, wait: async () => result }
        }) as E2BSandboxLike['commands']['run'],
      },
      files: {
        read: (async () => '') as E2BSandboxLike['files']['read'],
        async write() {
          return {}
        },
        async list() {
          return []
        },
        async remove() {},
      },
      getHost: (port) => `${port}-sbx-probe.e2b.app`,
      async setTimeout() {},
      async kill() {},
      async updateNetwork() {},
    }
    const client: E2BSandboxClientLike = {
      create: async (_templateId, opts) => {
        createOpts.push(opts as Record<string, unknown>)
        return sbx
      },
      connect: async () => sbx,
      list: async () => [],
      kill: async () => true,
    }
    return { provider: new E2BSandboxProvider({ apiKey: 'test' }, client), commands, createOpts }
  }

  it('reports inconclusive when nothing answers, and curls without an `|| echo 000` fallback', async () => {
    const { provider, commands } = providerAnswering({
      'registry.npmjs.org': '000',
      'example.com': '000',
      '1.1.1.1': '000',
    })
    const v = await provider.verifyEgress()
    expect(v.state).toBe('inconclusive')
    expect(commands.some((c) => c.includes('|| echo 000'))).toBe(false)
  })

  it('reports filtered on a working deny-by-default policy', async () => {
    const { provider } = providerAnswering({
      'registry.npmjs.org': '200',
      'example.com': '000',
      '1.1.1.1': '000',
    })
    expect((await provider.verifyEgress()).state).toBe('filtered')
  })

  it('reports open when a denied host answers', async () => {
    const { provider } = providerAnswering({
      'registry.npmjs.org': '200',
      'example.com': '200',
      '1.1.1.1': '000',
    })
    expect((await provider.verifyEgress()).state).toBe('open')
  })

  it('creates the throwaway probe sandbox to be KILLED at its deadline, never paused (a pause is a snapshot on the host disk)', async () => {
    const { provider, createOpts } = providerAnswering({
      'registry.npmjs.org': '200',
      'example.com': '000',
      '1.1.1.1': '000',
    })
    await provider.verifyEgress()
    expect(createOpts).toHaveLength(1)
    expect(createOpts[0]?.lifecycle).toEqual({ onTimeout: 'kill' })
    // A project sandbox still pauses.
    await provider.create({ projectId: 'proj-1', env: {} })
    expect(createOpts[1]?.lifecycle).toEqual({ onTimeout: { action: 'pause', keepMemory: true } })
  })
})
