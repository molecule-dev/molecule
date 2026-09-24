/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network — the Fly Machines
 * API reached through the global `fetch` — is replaced by a small in-test fake;
 * the provider's own provisioning, exec and lifecycle logic runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-code-sandbox'

import { createProvider } from '../index.js'

const BASE = 'https://api.machines.dev/v1'
const APP = 'mol-sandbox-a3f1c0de-0000-4000-8000-000000000001'

interface Call {
  method: string
  path: string
  body: Record<string, unknown> | undefined
  authorization: string | undefined
}

/**
 * A minimal Fly Machines API: the app does not exist yet, Machine creation
 * returns a started Machine, and `exec` honors `writeFile`'s base64 write and
 * prints the `console.log('…')` string of a file run with `node`.
 * @returns The fetch implementation and the recorded calls.
 */
const createFakeMachinesApi = (): { fetch: typeof fetch; calls: Call[] } => {
  const calls: Call[] = []
  const files = new Map<string, string>()
  let state = 'started'
  const json = (status: number, data: unknown): Response =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const path = String(input).replace(BASE, '')
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    const headers = new Headers(init?.headers)
    calls.push({ method, path, body, authorization: headers.get('authorization') ?? undefined })

    if (method === 'GET' && path === `/apps/${APP}`) return json(404, { error: 'not found' })
    if (method === 'POST' && path === '/apps') return json(201, {})
    if (method === 'POST' && path === `/apps/${APP}/machines`) {
      return json(200, { id: 'm1', state: 'started' })
    }
    if (method === 'POST' && path === `/apps/${APP}/machines/m1/exec`) {
      const command = (body?.command as string[] | undefined) ?? []
      const script = command[command.length - 1] ?? ''
      const write = /printf %s '([^']*)' \| base64 -d > '([^']+)'/.exec(script)
      if (write?.[1] !== undefined && write[2]) {
        files.set(write[2], Buffer.from(write[1], 'base64').toString())
      }
      const run = /node (\/\S+?\.js)/.exec(script)
      const printed = run?.[1] ? /console\.log\('(.*)'\)/.exec(files.get(run[1]) ?? '')?.[1] : ''
      return json(200, { stdout: printed ? `${printed}\n` : '', stderr: '', exit_code: 0 })
    }
    if (path.startsWith(`/apps/${APP}/machines/m1/suspend`)) {
      state = 'suspended'
      return json(200, { ok: true })
    }
    if (path.startsWith(`/apps/${APP}/machines/m1/start`)) {
      state = 'started'
      return json(200, { ok: true })
    }
    if (method === 'GET' && path.startsWith(`/apps/${APP}/machines/m1`)) {
      return json(200, { id: 'm1', state })
    }
    if (method === 'DELETE') return json(200, { ok: true })
    return json(200, {})
  }
  return { fetch: fetchImpl as typeof fetch, calls }
}

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('provisions an app + Machine, runs a file, suspends, resumes and destroys it', async () => {
    process.env.FLY_API_TOKEN = 'fly-test-token'
    process.env.FLY_ORG_SLUG = 'acme'
    const api = createFakeMachinesApi()
    vi.stubGlobal('fetch', api.fetch)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        apiToken: process.env.FLY_API_TOKEN,
        orgSlug: process.env.FLY_ORG_SLUG,
        region: 'iad',
        baseImage: 'registry.fly.io/my-sandbox-image:latest',
      }),
    )

    const sandbox = await requireProvider().create({
      projectId: 'a3f1c0de-0000-4000-8000-000000000001',
      resources: { cpu: 1, memoryMB: 1024, diskMB: 10240 },
    })
    console.log(sandbox.id)

    await sandbox.writeFile('/workspace/hello.js', "console.log('hello from fly')")
    const result = await sandbox.exec('node /workspace/hello.js', { timeout: 30_000 })
    if (result.exitCode !== 0) throw new Error(`sandbox exec failed: ${result.stderr}`)
    console.log(result.stdout, sandbox.getPreviewUrl())

    await sandbox.sleep()
    await sandbox.wake()
    await requireProvider().destroy(sandbox.id)

    expect(log).toHaveBeenNthCalledWith(1, `${APP}:m1`)
    expect(log).toHaveBeenNthCalledWith(2, 'hello from fly\n', `https://${APP}.fly.dev`)

    expect(api.calls.find((c) => c.method === 'POST' && c.path === '/apps')?.body).toEqual({
      name: APP,
      org_slug: 'acme',
      network: APP,
    })
    const machine = api.calls.find((c) => c.method === 'POST' && c.path === `/apps/${APP}/machines`)
    expect(machine?.authorization).toBe('Bearer fly-test-token')
    expect(machine?.body).toMatchObject({
      region: 'iad',
      config: { image: 'registry.fly.io/my-sandbox-image:latest' },
    })
    const routes = api.calls.map((c) => `${c.method} ${c.path.split('?')[0]}`)
    expect(routes).toContain(`POST /apps/${APP}/machines/m1/suspend`)
    expect(routes).toContain(`POST /apps/${APP}/machines/m1/start`)
    expect(routes).toContain(`DELETE /apps/${APP}/machines/m1`)
    expect(routes.at(-1)).toBe(`DELETE /apps/${APP}`)
  })
})
