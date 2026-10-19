import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'server.ts')

/** Children started by a test, killed on teardown. */
const children: ChildProcess[] = []

afterEach(() => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && !child.killed) child.kill('SIGKILL')
  }
})

/** Read the ephemeral port the fixture prints on stdout. */
async function readPort(child: ChildProcess): Promise<number> {
  let buffer = ''
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`fixture did not print PORT: ${buffer}`)),
      10_000,
    )
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const match = buffer.match(/PORT (\d+)/)
      if (match) {
        clearTimeout(timer)
        resolve(Number(match[1]))
      }
    })
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

/** Wait until the fixture reports an in-flight request. */
async function waitForInFlight(base: string): Promise<void> {
  const started = Date.now()
  for (;;) {
    const response = await fetch(`${base}/debug/inflight`)
    const body = (await response.json()) as { inFlight: number }
    if (body.inFlight >= 1) return
    if (Date.now() - started > 5_000) throw new Error('fixture never saw the slow request')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

/** Wait until the fixture's lifecycle has entered the draining phase. */
async function waitForDraining(base: string): Promise<void> {
  const started = Date.now()
  for (;;) {
    const response = await fetch(`${base}/debug/state`)
    const body = (await response.json()) as { state: string }
    if (body.state === 'draining') return
    if (Date.now() - started > 5_000) throw new Error('fixture never started draining')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('SIGTERM graceful shutdown (real child process)', () => {
  it('flips readiness to 503, finishes the in-flight request, and exits 0', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', fixture], {
      cwd: join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    children.push(child)
    const port = await readPort(child)
    const base = `http://127.0.0.1:${port}`

    expect((await fetch(`${base}/health/ready`)).status).toBe(200)

    const slow = fetch(`${base}/slow`)
    await waitForInFlight(base)

    const exited = once(child, 'exit')
    child.kill('SIGTERM')

    // Signal delivery is asynchronous; wait until the handler has flipped the
    // phase, then observe readiness inside the load-balancer flip window (the
    // listener is still open there).
    await waitForDraining(base)

    // During the load-balancer flip window the listener is still open, so
    // readiness is directly observable: draining, 503.
    const ready = await fetch(`${base}/health/ready`)
    expect(ready.status).toBe(503)
    expect(await ready.json()).toMatchObject({ status: 'draining' })

    // The request accepted before the signal still completes.
    expect((await slow).status).toBe(200)

    const [code] = (await exited) as [number | null]
    expect(code).toBe(0)
  })
})
