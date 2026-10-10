/**
 * The egress allow-list is a SECURITY control, so it must never be dropped
 * quietly.
 *
 * `applyNetwork(allowOut)` with a NON-EMPTY list is the bond's promise that
 * "everything not listed is blocked, raw IPs included" (index.ts `@example`).
 * An SDK build whose sandbox exposes no `updateNetwork` used to make that call a
 * silent no-op: the caller — a control plane, an agent runtime — saw a resolved
 * promise and went on to run untrusted, model-authored code in a sandbox that
 * still had unrestricted outbound traffic. A capability that cannot be enforced
 * must fail LOUDLY here, exactly as `create()` already treats a rejected policy
 * (it destroys the sandbox and rethrows) and as `verifyEgress()` refuses to
 * report `filtered` for a policy it never observed.
 *
 * An EMPTY list stays a no-op: nothing to allow means no policy was requested
 * (that is also how the bond's config spells "unconstrained").
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BCommandResultLike, E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

/** One recorded `updateNetwork` payload. */
interface NetworkCall {
  allowOut?: string[]
  denyOut?: string[]
}

/** The `applyNetwork` method the provider is expected to refuse without. */
interface NetworkCapableHandle {
  applyNetwork(allowOut: string[]): Promise<void>
}

/**
 * A minimal live sandbox. `hasUpdateNetwork: false` models an SDK build whose
 * sandbox cannot be given a network policy at all.
 *
 * @param sandboxId - The sandbox id.
 * @param opts - Network capability, the payload sink, and the curl answers.
 * @returns The fake sandbox.
 */
function fakeSandbox(
  sandboxId: string,
  opts: {
    hasUpdateNetwork?: boolean
    networkCalls?: NetworkCall[]
    codes?: Record<string, string>
  } = {},
): E2BSandboxLike {
  const sbx: E2BSandboxLike = {
    sandboxId,
    commands: {
      run: (async (cmd: string) => {
        const host = Object.keys(opts.codes ?? {}).find((h) => cmd.includes(`https://${h}/`))
        const result: E2BCommandResultLike = {
          stdout: host ? (opts.codes?.[host] ?? '') : '',
          stderr: '',
          exitCode: host ? 7 : 0,
        }
        // exec() starts in the background and awaits the handle.
        return {
          ...result,
          pid: 1,
          wait: async () => result,
          sendStdin: async () => {},
          kill: async () => true,
        }
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
    getHost: (port) => `${port}-${sandboxId}.e2b.app`,
    async setTimeout() {},
    async kill() {},
    async isRunning() {
      return true
    },
  }
  if (opts.hasUpdateNetwork !== false) {
    sbx.updateNetwork = async (payload) => {
      opts.networkCalls?.push(payload)
    }
  }
  return sbx
}

/**
 * A provider over a client that hands back one fixed sandbox.
 *
 * @param sbx - The sandbox every create/connect answers with.
 * @param killed - Collects the ids the provider destroyed.
 * @param allowOut - The configured egress allow-list.
 * @returns The provider.
 */
function providerWith(
  sbx: E2BSandboxLike,
  killed: string[] = [],
  allowOut?: string[],
): E2BSandboxProvider {
  const client: E2BSandboxClientLike = {
    async create() {
      return sbx
    },
    async connect() {
      return sbx
    },
    async list() {
      return []
    },
    async kill(id) {
      killed.push(id)
      return true
    },
  }
  return new E2BSandboxProvider(
    allowOut === undefined ? { apiKey: 'test' } : { apiKey: 'test', defaultAllowOut: allowOut },
    client,
  )
}

describe('applyNetwork — an unenforceable allow-list is refused, never dropped', () => {
  it('REJECTS a non-empty list the sandbox cannot enforce, instead of resolving', async () => {
    const provider = providerWith(fakeSandbox('sbx-a', { hasUpdateNetwork: false }))
    const handle = (await provider.get('sbx-a')) as unknown as NetworkCapableHandle

    await expect(handle.applyNetwork(['github.com'])).rejects.toThrow(/updateNetwork/)
  })

  it('applies the list deny-by-default when the sandbox supports it', async () => {
    const networkCalls: NetworkCall[] = []
    const provider = providerWith(fakeSandbox('sbx-a', { networkCalls }))
    const handle = (await provider.get('sbx-a')) as unknown as NetworkCapableHandle

    await handle.applyNetwork(['github.com', '*.npmjs.org'])

    // `denyOut` with ALL_TRAFFIC is what makes it deny-by-default (and blocks
    // raw destination IPs, which a DNS-only policy would not).
    expect(networkCalls).toEqual([
      { allowOut: ['github.com', '*.npmjs.org'], denyOut: ['0.0.0.0/0'] },
    ])
  })

  it('keeps an EMPTY list a no-op even when the sandbox cannot enforce one', async () => {
    const networkCalls: NetworkCall[] = []
    const provider = providerWith(fakeSandbox('sbx-a', { hasUpdateNetwork: false, networkCalls }))
    const handle = (await provider.get('sbx-a')) as unknown as NetworkCapableHandle

    // Nothing was asked to be allowed, so there is no control to enforce and no
    // failure to report.
    await expect(handle.applyNetwork([])).resolves.toBeUndefined()
    expect(networkCalls).toEqual([])
  })
})

describe('create() — a sandbox it cannot constrain is destroyed, not handed back', () => {
  it('refuses the create and kills the sandbox when the allow-list cannot be applied', async () => {
    const killed: string[] = []
    const networkCalls: NetworkCall[] = []
    const provider = providerWith(
      fakeSandbox('sbx-a', { hasUpdateNetwork: false, networkCalls }),
      killed,
      ['registry.npmjs.org'],
    )

    await expect(provider.create({ projectId: 'proj-1', env: {} })).rejects.toThrow(/updateNetwork/)

    // The policy was never applied, and the sandbox the caller never received
    // was destroyed rather than left running (and billing) unconstrained.
    expect(networkCalls).toEqual([])
    expect(killed).toEqual(['sbx-a'])
  })

  it('hands back a sandbox whose allow-list WAS applied', async () => {
    const killed: string[] = []
    const networkCalls: NetworkCall[] = []
    const provider = providerWith(fakeSandbox('sbx-a', { networkCalls }), killed, [
      'registry.npmjs.org',
    ])

    await expect(provider.create({ projectId: 'proj-1', env: {} })).resolves.toMatchObject({
      id: 'sbx-a',
    })

    expect(networkCalls).toEqual([{ allowOut: ['registry.npmjs.org'], denyOut: ['0.0.0.0/0'] }])
    expect(killed).toEqual([])
  })
})

describe('verifyEgress() — the observation survives an unenforceable policy', () => {
  const PROBE_CODES = {
    'registry.npmjs.org': '200',
    'example.com': '200',
    '1.1.1.1': '000',
  }

  it('still reports `open` when a denied host answered (the policy could not be applied)', async () => {
    const killed: string[] = []
    // No `updateNetwork`: the probe cannot install its own policy. The curls
    // nevertheless OBSERVE reachable, non-allow-listed egress — the actionable
    // answer — which must not be downgraded to "could not look".
    const provider = providerWith(
      fakeSandbox('sbx-probe', { hasUpdateNetwork: false, codes: PROBE_CODES }),
      killed,
    )

    const verdict = await provider.verifyEgress()

    expect(verdict.state).toBe('open')
    expect(killed).toEqual(['sbx-probe'])
  })

  it('reports inconclusive NAMING the policy failure when nothing else was observed', async () => {
    const provider = providerWith(
      fakeSandbox('sbx-probe', {
        hasUpdateNetwork: false,
        codes: { 'registry.npmjs.org': '000', 'example.com': '000', '1.1.1.1': '000' },
      }),
    )

    const verdict = await provider.verifyEgress()

    expect(verdict.state).toBe('inconclusive')
    expect(verdict.detail).toContain('could not be applied')
  })
})
