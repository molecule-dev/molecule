import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

// ---------------------------------------------------------------------------
// Enumeration must not MUTATE what it enumerates.
//
// E2B's `Sandbox.connect(id, { timeoutMs })` does not merely open a connection:
// it POSTs `/v2/sandboxes/{id}/connect` with `timeout` set, which REWRITES the
// sandbox's deadline (see the e2b SDK's `connectSandbox`). `get()` is the
// caller-is-about-to-use-it lookup and passes the timeout deliberately.
//
// `list()` is what a control-plane sweep polls, and it used to build every
// running sandbox's handle through `get()` — so each poll reset EVERY running
// sandbox's deadline to the provider default: a sandbox kept alive with
// `keepAlive(ms)` was pulled back and paused under whatever was still using it,
// and an idle one that was about to pause on its own was pushed out and kept
// billing. The module doc is explicit that a deadline is extended by a real
// activity signal, "never as a side effect of polling".
//
// These tests drive the connect ARGUMENTS, which is the only place that
// distinction is observable.
// ---------------------------------------------------------------------------

/** A minimal live sandbox; only the surface these tests touch is populated. */
function fakeSandbox(sandboxId: string): E2BSandboxLike {
  return {
    sandboxId,
    commands: {
      async run() {
        return { stdout: '', stderr: '', exitCode: 0 }
      },
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
  }
}

/** The provider default the deadline would be rewritten to. */
const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000

/** Build a provider that records every `connect` call's options. */
function providerWith(itemStates: Array<{ sandboxId: string; state: string }>): {
  provider: E2BSandboxProvider
  connectOpts: Array<Record<string, unknown> | undefined>
} {
  const connectOpts: Array<Record<string, unknown> | undefined> = []
  const client: E2BSandboxClientLike = {
    async create() {
      return fakeSandbox('sbx-new')
    },
    async connect(id, opts) {
      connectOpts.push(opts)
      return fakeSandbox(id)
    },
    async list() {
      return itemStates
    },
    isNotFound: (error) => error instanceof Error && error.name === 'SandboxNotFoundError',
  }
  return { provider: new E2BSandboxProvider({ apiKey: 'test' }, client), connectOpts }
}

describe('list() does not rewrite the deadline of the sandboxes it enumerates', () => {
  it('connects without a timeout, so E2B changes no deadline', async () => {
    const { provider, connectOpts } = providerWith([
      { sandboxId: 'sbx-a', state: 'running' },
      { sandboxId: 'sbx-b', state: 'running' },
    ])

    const handles = await provider.list('user-1')

    // The sweep still returns live handles — the fix must not turn enumeration
    // into a list of dead ids.
    expect(handles.map((h) => h.id).sort()).toEqual(['sbx-a', 'sbx-b'])
    expect(connectOpts).toHaveLength(2)
    for (const opts of connectOpts) {
      // `timeoutMs` present is what makes E2B rewrite the sandbox's deadline.
      expect(opts?.timeoutMs).toBeUndefined()
    }
  })

  it('still gives get() the "about to use it" timeout that resets a deadline', async () => {
    // The counterpart contract: a caller taking a handle to USE the sandbox
    // gets the configured deadline (this is what resumes a paused sandbox with a
    // usable timeout). Pinned here so the listing fix cannot be "achieved" by
    // dropping the timeout everywhere.
    const { provider, connectOpts } = providerWith([])

    await provider.get('sbx-a')

    expect(connectOpts).toHaveLength(1)
    expect(connectOpts[0]).toMatchObject({ timeoutMs: DEFAULT_TIMEOUT_MS })
  })
})
