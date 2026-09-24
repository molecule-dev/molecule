/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The outside world — the Docker daemon —
 * is a small fake Engine API served over a real unix socket (reached through
 * `DOCKER_SOCKET_PATH`), so the provider's own HTTP, exec and mux-stream logic
 * runs for real.
 *
 * @module
 */
import { mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-code-sandbox'

import { createProvider } from '../index.js'

interface Call {
  method: string
  path: string
  body: Record<string, unknown> | undefined
}

/** One Docker multiplexed-stream frame (stream 1 = stdout). */
const stdoutFrame = (text: string): Buffer => {
  const payload = Buffer.from(text)
  const header = Buffer.alloc(8)
  header[0] = 1
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

/**
 * A minimal Docker Engine API: enough for create → start → exec (writeFile + node) → destroy.
 * `writeFile`'s `echo '<b64>' | base64 -d > '<path>'` is honored against an in-memory fs, and
 * `node <file>` prints the string passed to that file's `console.log('…')`.
 */
const startFakeDaemon = async (
  socketPath: string,
): Promise<{ calls: Call[]; close: () => Promise<void> }> => {
  const calls: Call[] = []
  const files = new Map<string, string>()
  const execs = new Map<string, string>()
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString()
      const body = text ? (JSON.parse(text) as Record<string, unknown>) : undefined
      const method = req.method ?? 'GET'
      const path = (req.url ?? '').replace(/^\/v1\.44/, '')
      calls.push({ method, path, body })
      const json = (status: number, data: unknown): void => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(data))
      }

      if (path === '/networks/create') return json(201, { Id: 'net-1' })
      if (path === '/containers/create') return json(201, { Id: 'c0ffee123' })
      if (path === '/containers/c0ffee123/start') return res.writeHead(204).end()
      if (path === '/containers/c0ffee123/exec') {
        const id = `exec-${execs.size + 1}`
        execs.set(id, ((body?.Cmd as string[] | undefined) ?? []).join(' '))
        return json(201, { Id: id })
      }
      const start = /^\/exec\/(exec-\d+)\/start$/.exec(path)
      if (start) {
        const cmd = execs.get(start[1] ?? '') ?? ''
        const write = /echo '([^']*)' \| base64 -d > '([^']+)'/.exec(cmd)
        if (write?.[1] !== undefined && write[2]) {
          files.set(write[2], Buffer.from(write[1], 'base64').toString())
        }
        const run = /node (\S+?)'?$/.exec(cmd)
        const source = run?.[1] ? (files.get(run[1]) ?? '') : ''
        const printed = /console\.log\('(.*)'\)/.exec(source)?.[1]
        res.writeHead(200, { 'content-type': 'application/vnd.docker.raw-stream' })
        return res.end(printed === undefined ? Buffer.alloc(0) : stdoutFrame(`${printed}\n`))
      }
      if (/^\/exec\/exec-\d+\/json$/.test(path)) return json(200, { ExitCode: 0, Running: false })
      if (path === '/containers/c0ffee123/json') return json(200, { Config: { Labels: {} } })
      if (path === '/containers/c0ffee123?force=true') return res.writeHead(204).end()
      return json(404, { message: `fake daemon: no route for ${method} ${path}` })
    })
  })
  await new Promise<void>((resolve) => server.listen(socketPath, resolve))
  return {
    calls,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

describe('README @example', () => {
  const originalEnv = { ...process.env }
  let dir: string
  let daemon: Awaited<ReturnType<typeof startFakeDaemon>>

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dkr-'))
    daemon = await startFakeDaemon(join(dir, 'docker.sock'))
    delete process.env.DOCKER_HOST
    process.env.DOCKER_SOCKET_PATH = join(dir, 'docker.sock')
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    await daemon.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('creates, starts, writes, execs, previews and destroys a sandbox container', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        baseImage: 'node:22-slim',
        defaultMemoryMB: 1024,
        previewUrlTemplate: 'https://{port}-preview.example.com',
      }),
    )

    const sandbox = await requireProvider().create({ projectId: 'proj_123' })
    try {
      await sandbox.start()
      await sandbox.writeFile('/workspace/hello.js', "console.log('hello from docker')")
      const result = await sandbox.exec('node /workspace/hello.js', { timeout: 30_000 })
      if (result.exitCode !== 0) throw new Error(`sandbox exec failed: ${result.stderr}`)
      console.log(result.stdout)
      console.log(sandbox.getPreviewUrl(5173))
    } finally {
      await requireProvider().destroy(sandbox.id)
    }

    expect(log).toHaveBeenNthCalledWith(1, 'hello from docker\n')
    expect(log).toHaveBeenNthCalledWith(2, 'https://5173-preview.example.com')

    const create = daemon.calls.find((c) => c.path === '/containers/create')
    expect(create?.body).toMatchObject({
      Image: 'node:22-slim',
      Labels: { 'molecule-sandbox.projectId': 'proj_123', 'molecule-sandbox.managed': 'true' },
      HostConfig: { Memory: 1024 * 1024 * 1024, CapDrop: ['ALL'] },
    })
    const execBodies = daemon.calls
      .filter((c) => c.path === '/containers/c0ffee123/exec')
      .map((c) => (c.body?.Cmd as string[]).join(' '))
    expect(execBodies[1]).toBe("sh -c timeout 30 sh -c 'node /workspace/hello.js'")
    expect(daemon.calls.map((c) => `${c.method} ${c.path}`)).toEqual(
      expect.arrayContaining([
        'POST /containers/c0ffee123/start',
        'DELETE /containers/c0ffee123?force=true',
      ]),
    )
  })
})
