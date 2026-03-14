/**
 * Tests for the Docker sandbox provider's security-critical functionality.
 *
 * Covers shell injection prevention, Docker multiplexed stream parsing,
 * container security configuration, timeouts, response size limits,
 * and volume creation idempotency.
 *
 * @module
 */

import http from 'http'
import { EventEmitter, PassThrough } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SandboxConfig } from '@molecule/api-code-sandbox'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => mockLogger,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

// ─── HTTP mock helpers ────────────────────────────────────────────────────────

/**
 * Builds a mock IncomingMessage (http response) that emits data and end events.
 */
function buildMockResponse(statusCode: number, body: string | Buffer): EventEmitter {
  const res = new PassThrough() as PassThrough & { statusCode: number }
  res.statusCode = statusCode
  // Write the body asynchronously so listeners can be attached
  process.nextTick(() => {
    res.end(typeof body === 'string' ? Buffer.from(body) : body)
  })
  return res
}

/**
 * Builds a mock ClientRequest that captures options and triggers the response callback.
 */
function buildMockRequest(
  _response: EventEmitter,
  _capturedOpts?: { ref: http.RequestOptions | null },
): EventEmitter & {
  write: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  setTimeout: ReturnType<typeof vi.fn>
} {
  const req = new EventEmitter() as EventEmitter & {
    write: ReturnType<typeof vi.fn>
    end: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    setTimeout: ReturnType<typeof vi.fn>
  }
  req.write = vi.fn()
  req.end = vi.fn()
  req.destroy = vi.fn()
  req.setTimeout = vi.fn()
  return req
}

type RequestCallback = (res: EventEmitter) => void

/** Tracks all http.request calls for assertion. */
let httpRequestCalls: Array<{
  opts: http.RequestOptions
  body: string | undefined
  req: ReturnType<typeof buildMockRequest>
  respond: (statusCode: number, body: string | Buffer) => void
}> = []

/** Queue of responses to serve in order. */
let responseQueue: Array<{ statusCode: number; body: string | Buffer }> = []

/**
 * Enqueue a mock response. Requests will be answered in FIFO order.
 */
function enqueueResponse(statusCode: number, body: string | Buffer): void {
  responseQueue.push({ statusCode, body })
}

/**
 * Enqueue a JSON response.
 */
function enqueueJson(statusCode: number, data: unknown): void {
  enqueueResponse(statusCode, JSON.stringify(data))
}

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  httpRequestCalls = []
  responseQueue = []

  vi.spyOn(http, 'request').mockImplementation(
    (
      opts: string | URL | http.RequestOptions,
      cbOrOpts?: RequestCallback | http.RequestOptions,
      maybeCb?: RequestCallback,
    ) => {
      // http.request(opts, callback) or http.request(url, opts, callback)
      const callback = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb
      const requestOpts = (
        typeof opts === 'object' && !(opts instanceof URL) ? opts : {}
      ) as http.RequestOptions

      const queued = responseQueue.shift()
      const res = queued
        ? buildMockResponse(queued.statusCode, queued.body)
        : buildMockResponse(200, '{}')

      const req = buildMockRequest(res)

      // Capture the body written to the request
      let capturedBody: string | undefined
      req.write.mockImplementation((data: string) => {
        capturedBody = data
      })

      // When end() is called, trigger the callback with the response
      req.end.mockImplementation(() => {
        process.nextTick(() => {
          callback?.(res)
        })
      })

      httpRequestCalls.push({
        opts: requestOpts,
        body: undefined, // Will be filled via getter
        req,
        respond: (_sc, _b) => {
          // Manual respond not used with queue, but available
        },
      })

      // Use a getter so body is captured at assertion time
      Object.defineProperty(httpRequestCalls[httpRequestCalls.length - 1], 'body', {
        get: () => capturedBody,
      })

      return req as unknown as http.ClientRequest
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DockerSandboxProvider', () => {
  // ─── shellQuote (shell injection prevention) ──────────────────────────

  describe('shellQuote — shell injection prevention', () => {
    /**
     * shellQuote is a module-level function not directly exported.
     * It is used inside sandbox.readFile, sandbox.writeFile, sandbox.deleteFile,
     * and sandbox.exec (for timeout wrapping). We test it indirectly by examining
     * the commands sent to Docker exec API calls.
     */

    async function getExecCommand(filePath: string): Promise<string> {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      // Create container
      enqueueJson(201, { Id: 'container-sq' })
      const sandbox = await provider.create({ projectId: 'test-sq' })

      // Exec create (for readFile which uses shellQuote)
      enqueueJson(200, { Id: 'exec-sq' })
      // Exec start — return empty mux stream
      enqueueResponse(200, Buffer.alloc(0))
      // Exec inspect
      enqueueJson(200, { ExitCode: 0 })

      await sandbox.readFile(filePath)

      // The exec create call is the second request (index 1)
      const execCall = httpRequestCalls[1]
      const body = JSON.parse(execCall.body!)
      // The command is: sh -c 'cat <shellQuoted(path)>'
      return body.Cmd.join(' ')
    }

    it("should escape single quotes correctly: it's -> 'it'\\''s'", async () => {
      const cmd = await getExecCommand("it's")
      // shellQuote("it's") should produce 'it'\''s'
      // The cat command becomes: cat 'it'\''s'
      expect(cmd).toContain("cat 'it'\\''s'")
    })

    it('should handle empty strings', async () => {
      const cmd = await getExecCommand('')
      // shellQuote('') should produce ''
      expect(cmd).toContain("cat ''")
    })

    it('should wrap strings with $() in single quotes (harmless in single quotes)', async () => {
      const cmd = await getExecCommand('$(rm -rf /)')
      // Inside single quotes, $() is literal — no expansion
      expect(cmd).toContain("cat '$(rm -rf /)'")
    })

    it('should wrap strings with backticks in single quotes (harmless)', async () => {
      const cmd = await getExecCommand('`whoami`')
      expect(cmd).toContain("cat '`whoami`'")
    })

    it('should wrap strings with double quotes in single quotes (harmless)', async () => {
      const cmd = await getExecCommand('"hello world"')
      expect(cmd).toContain('cat \'"hello world"\'')
    })

    it('should handle strings with multiple single quotes', async () => {
      const cmd = await getExecCommand("a'b'c")
      expect(cmd).toContain("cat 'a'\\''b'\\''c'")
    })

    it('should handle paths with spaces and special characters', async () => {
      const cmd = await getExecCommand('/workspace/my file.txt')
      expect(cmd).toContain("cat '/workspace/my file.txt'")
    })

    it('should use shellQuote in writeFile (base64 path)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-wf' })
      const sandbox = await provider.create({ projectId: 'test-wf' })

      enqueueJson(200, { Id: 'exec-wf' })
      enqueueResponse(200, Buffer.alloc(0))
      enqueueJson(200, { ExitCode: 0 })

      await sandbox.writeFile("file'name.txt", 'content')

      const execCall = httpRequestCalls[1]
      const body = JSON.parse(execCall.body!)
      const cmd = body.Cmd.join(' ')
      // Both the base64 content and path should be single-quoted
      expect(cmd).toContain("'file'\\''name.txt'")
    })

    it('should use shellQuote in deleteFile', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-df' })
      const sandbox = await provider.create({ projectId: 'test-df' })

      enqueueJson(200, { Id: 'exec-df' })
      enqueueResponse(200, Buffer.alloc(0))
      enqueueJson(200, { ExitCode: 0 })

      await sandbox.deleteFile("path'with'quotes")

      const execCall = httpRequestCalls[1]
      const body = JSON.parse(execCall.body!)
      const cmd = body.Cmd.join(' ')
      expect(cmd).toContain("rm -f 'path'\\''with'\\''quotes'")
    })

    it('should use shellQuote in exec with timeout wrapping', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-to' })
      const sandbox = await provider.create({ projectId: 'test-to' })

      enqueueJson(200, { Id: 'exec-to' })
      enqueueResponse(200, Buffer.alloc(0))
      enqueueJson(200, { ExitCode: 0 })

      await sandbox.exec("echo 'hello'", { timeout: 5000 })

      const execCall = httpRequestCalls[1]
      const body = JSON.parse(execCall.body!)
      const cmd = body.Cmd.join(' ')
      // With timeout, the command should be wrapped:
      // timeout 5 sh -c 'echo '\''hello'\'''
      expect(cmd).toContain('timeout 5 sh -c')
      expect(cmd).toContain("'echo '\\''hello'\\'''")
    })
  })

  // ─── DockerMuxParser ──────────────────────────────────────────────────

  describe('DockerMuxParser — multiplexed stream parsing', () => {
    /**
     * DockerMuxParser is used in two places:
     * 1. sandbox.exec() — parses the raw response from dockerApiRaw (inline parsing)
     * 2. sandbox.spawn() — uses the class instance to parse streaming socket data
     *
     * We test the exec path since it is accessible through the public API.
     * The mux parsing logic in exec is inline (not the class), but exercises
     * the same frame format.
     */

    function buildMuxFrame(streamType: number, data: string): Buffer {
      const payload = Buffer.from(data, 'utf-8')
      const header = Buffer.alloc(8)
      header[0] = streamType
      header.writeUInt32BE(payload.length, 4)
      return Buffer.concat([header, payload])
    }

    it('should parse stdout frames (streamType=1)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-mux1' })
      const sandbox = await provider.create({ projectId: 'test-mux1' })

      // exec create
      enqueueJson(200, { Id: 'exec-mux1' })
      // exec start — return a stdout frame
      const frame = buildMuxFrame(1, 'hello stdout')
      enqueueResponse(200, frame)
      // exec inspect
      enqueueJson(200, { ExitCode: 0 })

      const result = await sandbox.exec('echo hello')

      expect(result.stdout).toBe('hello stdout')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should parse stderr frames (streamType=2)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-mux2' })
      const sandbox = await provider.create({ projectId: 'test-mux2' })

      enqueueJson(200, { Id: 'exec-mux2' })
      const frame = buildMuxFrame(2, 'error output')
      enqueueResponse(200, frame)
      enqueueJson(200, { ExitCode: 1 })

      const result = await sandbox.exec('bad command')

      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('error output')
      expect(result.exitCode).toBe(1)
    })

    it('should parse multiple interleaved frames', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-mux3' })
      const sandbox = await provider.create({ projectId: 'test-mux3' })

      enqueueJson(200, { Id: 'exec-mux3' })
      const frames = Buffer.concat([
        buildMuxFrame(1, 'line1\n'),
        buildMuxFrame(2, 'warn1\n'),
        buildMuxFrame(1, 'line2\n'),
        buildMuxFrame(2, 'warn2\n'),
      ])
      enqueueResponse(200, frames)
      enqueueJson(200, { ExitCode: 0 })

      const result = await sandbox.exec('cmd')

      expect(result.stdout).toBe('line1\nline2\n')
      expect(result.stderr).toBe('warn1\nwarn2\n')
    })

    it('should handle empty mux stream', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-mux4' })
      const sandbox = await provider.create({ projectId: 'test-mux4' })

      enqueueJson(200, { Id: 'exec-mux4' })
      enqueueResponse(200, Buffer.alloc(0))
      enqueueJson(200, { ExitCode: 0 })

      const result = await sandbox.exec('true')

      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should handle partial frame at the end of buffer gracefully', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-mux5' })
      const sandbox = await provider.create({ projectId: 'test-mux5' })

      enqueueJson(200, { Id: 'exec-mux5' })
      // Build a valid frame followed by a truncated one (only header, payload missing)
      const validFrame = buildMuxFrame(1, 'complete')
      const partialHeader = Buffer.alloc(8)
      partialHeader[0] = 1
      partialHeader.writeUInt32BE(100, 4) // Claims 100 bytes but nothing follows
      const buf = Buffer.concat([validFrame, partialHeader])
      enqueueResponse(200, buf)
      enqueueJson(200, { ExitCode: 0 })

      const result = await sandbox.exec('partial')

      // The valid frame should be parsed; the partial one silently skipped
      // (the inline parser's while loop breaks when buffer.length < 8 + frameSize)
      expect(result.stdout).toBe('complete')
    })
  })

  // ─── MAX_MUX_FRAME_SIZE (50MB) — DockerMuxParser class ────────────────

  describe('MAX_MUX_FRAME_SIZE — spawn parser rejects oversized frames', () => {
    it('should reject frames larger than 50MB in spawn (via DockerMuxParser)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-max' })
      const sandbox = await provider.create({ projectId: 'test-max' })

      // For spawn, we need to mock dockerExecUpgrade which returns a socket.
      // The spawn method uses the DockerMuxParser class which checks MAX_MUX_FRAME_SIZE.
      // We intercept the http.request to simulate the upgrade flow.

      // exec create for spawn
      enqueueJson(200, { Id: 'exec-max' })

      // Override http.request for the upgrade call to provide a mock socket
      const originalMock = vi.mocked(http.request)
      const mockSocket = new PassThrough() as PassThrough & {
        destroyed: boolean
        setTimeout: ReturnType<typeof vi.fn>
        destroy: ReturnType<typeof vi.fn>
      }
      mockSocket.destroyed = false
      mockSocket.setTimeout = vi.fn()
      mockSocket.destroy = vi.fn(() => {
        mockSocket.destroyed = true
      })

      let callCount = 0
      originalMock.mockImplementation(
        (
          opts: string | URL | http.RequestOptions,
          cbOrOpts?: RequestCallback | http.RequestOptions,
          maybeCb?: RequestCallback,
        ) => {
          callCount++
          const callback = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb
          if (callCount === 1) {
            // First call: exec create
            const res = buildMockResponse(200, JSON.stringify({ Id: 'exec-max' }))
            const req = buildMockRequest(res)
            req.end.mockImplementation(() => {
              process.nextTick(() => callback?.(res))
            })
            return req as unknown as http.ClientRequest
          }

          // Second call: exec start (upgrade)
          const req = buildMockRequest(new EventEmitter())
          req.end.mockImplementation(() => {
            // Simulate upgrade
            process.nextTick(() => {
              req.emit('upgrade', {}, mockSocket, Buffer.alloc(0))
            })
          })
          return req as unknown as http.ClientRequest
        },
      )

      await sandbox.spawn!('long-command')

      // Feed a frame header claiming > 50MB
      const oversizedHeader = Buffer.alloc(8)
      oversizedHeader[0] = 1
      oversizedHeader.writeUInt32BE(51 * 1024 * 1024, 4) // 51MB > 50MB limit
      mockSocket.push(oversizedHeader)

      // Give time for the data handler to process
      await new Promise((r) => setTimeout(r, 50))

      // The socket should be destroyed after oversized frame detection
      expect(mockSocket.destroy).toHaveBeenCalled()
    })
  })

  // ─── Container security configuration ─────────────────────────────────

  describe('container security configuration', () => {
    async function getCreateBody(): Promise<Record<string, unknown>> {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-sec' })

      const config: SandboxConfig = {
        projectId: 'test-security',
        resources: { cpu: 2, memoryMB: 512, diskMB: 1024 },
      }

      await provider.create(config)

      const createCall = httpRequestCalls[0]
      return JSON.parse(createCall.body!)
    }

    it('should set CapDrop: ["ALL"]', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.CapDrop).toEqual(['ALL'])
    })

    it('should set CapAdd: ["CHOWN", "SETGID", "SETUID", "NET_ADMIN"]', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.CapAdd).toEqual(['CHOWN', 'SETGID', 'SETUID', 'NET_ADMIN'])
    })

    it('should set SecurityOpt: ["no-new-privileges"]', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.SecurityOpt).toEqual(['no-new-privileges'])
    })

    it('should set PidsLimit: 512', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.PidsLimit).toBe(512)
    })

    it('should set MemorySwap equal to Memory (no swap)', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      const expectedBytes = 512 * 1024 * 1024
      expect(hostConfig.Memory).toBe(expectedBytes)
      expect(hostConfig.MemorySwap).toBe(expectedBytes)
      expect(hostConfig.MemorySwap).toBe(hostConfig.Memory)
    })

    it('should set Init: true for zombie process reaping', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.Init).toBe(true)
    })

    it('should set NanoCPUs based on cpu config', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.NanoCPUs).toBe(2 * 1e9)
    })

    it('should use default cpu and memory when resources not specified', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        socketPath: '/test.sock',
        defaultCpu: 1,
        defaultMemoryMB: 1024,
      })

      enqueueJson(201, { Id: 'container-def' })
      await provider.create({ projectId: 'test-defaults' })

      const body = JSON.parse(httpRequestCalls[0].body!)
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.NanoCPUs).toBe(1e9)
      expect(hostConfig.Memory).toBe(1024 * 1024 * 1024)
      expect(hostConfig.MemorySwap).toBe(1024 * 1024 * 1024)
    })

    it('should set explicit PortBindings instead of PublishAllPorts', async () => {
      const body = await getCreateBody()
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.PublishAllPorts).toBeUndefined()
      expect(hostConfig.PortBindings).toBeDefined()
    })

    it('should mount volume when volumeName is provided', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-vol' })
      await provider.create({ projectId: 'test-vol', volumeName: 'my-volume' })

      const body = JSON.parse(httpRequestCalls[0].body!)
      const hostConfig = body.HostConfig as Record<string, unknown>
      expect(hostConfig.Binds).toEqual(['my-volume:/workspace'])
    })
  })

  // ─── Socket timeout on spawn ──────────────────────────────────────────

  describe('socket timeout on spawn', () => {
    it('should set 600_000ms timeout on spawn socket', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-st' })
      const sandbox = await provider.create({ projectId: 'test-st' })

      // Mock the upgrade flow
      const mockSocket = new PassThrough() as PassThrough & {
        destroyed: boolean
        setTimeout: ReturnType<typeof vi.fn>
        destroy: ReturnType<typeof vi.fn>
      }
      mockSocket.destroyed = false
      mockSocket.setTimeout = vi.fn()
      mockSocket.destroy = vi.fn()

      let callCount = 0
      vi.mocked(http.request).mockImplementation(
        (
          opts: string | URL | http.RequestOptions,
          cbOrOpts?: RequestCallback | http.RequestOptions,
          maybeCb?: RequestCallback,
        ) => {
          callCount++
          const callback = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb

          if (callCount === 1) {
            // exec create
            const res = buildMockResponse(200, JSON.stringify({ Id: 'exec-st' }))
            const req = buildMockRequest(res)
            req.end.mockImplementation(() => {
              process.nextTick(() => callback?.(res))
            })
            return req as unknown as http.ClientRequest
          }

          // exec start (upgrade)
          const req = buildMockRequest(new EventEmitter())
          req.end.mockImplementation(() => {
            process.nextTick(() => {
              req.emit('upgrade', {}, mockSocket, Buffer.alloc(0))
            })
          })
          return req as unknown as http.ClientRequest
        },
      )

      await sandbox.spawn!('run-server')

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(600_000)
    })

    it('should destroy socket on timeout', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-st2' })
      const sandbox = await provider.create({ projectId: 'test-st2' })

      const mockSocket = new PassThrough() as PassThrough & {
        destroyed: boolean
        setTimeout: ReturnType<typeof vi.fn>
        destroy: ReturnType<typeof vi.fn>
      }
      mockSocket.destroyed = false
      mockSocket.setTimeout = vi.fn()
      mockSocket.destroy = vi.fn()

      let callCount = 0
      vi.mocked(http.request).mockImplementation(
        (
          opts: string | URL | http.RequestOptions,
          cbOrOpts?: RequestCallback | http.RequestOptions,
          maybeCb?: RequestCallback,
        ) => {
          callCount++
          const callback = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb

          if (callCount === 1) {
            const res = buildMockResponse(200, JSON.stringify({ Id: 'exec-st2' }))
            const req = buildMockRequest(res)
            req.end.mockImplementation(() => {
              process.nextTick(() => callback?.(res))
            })
            return req as unknown as http.ClientRequest
          }

          const req = buildMockRequest(new EventEmitter())
          req.end.mockImplementation(() => {
            process.nextTick(() => {
              req.emit('upgrade', {}, mockSocket, Buffer.alloc(0))
            })
          })
          return req as unknown as http.ClientRequest
        },
      )

      await sandbox.spawn!('run-server')

      // Verify setTimeout was called with correct timeout, then simulate timeout
      expect(mockSocket.setTimeout).toHaveBeenCalledWith(600_000)
      // Get the timeout handler registered via socket.on('timeout', ...)
      // The provider registers: socket.on('timeout', () => { socket.destroy() })
      mockSocket.emit('timeout')

      expect(mockSocket.destroy).toHaveBeenCalled()
    })
  })

  // ─── Docker API timeouts ──────────────────────────────────────────────

  describe('Docker API timeouts', () => {
    it('should set 30s timeout on regular API calls (dockerApi)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-timeout' })
      await provider.create({ projectId: 'test-timeout' })

      // The create call uses dockerApi (regular API)
      const createReq = httpRequestCalls[0].req
      expect(createReq.setTimeout).toHaveBeenCalledWith(30_000, expect.any(Function))
    })

    it('should set 600s timeout on exec API calls (dockerApiRaw)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-exec-to' })
      const sandbox = await provider.create({ projectId: 'test-exec-to' })

      // exec create
      enqueueJson(200, { Id: 'exec-to' })
      // exec start (raw)
      enqueueResponse(200, Buffer.alloc(0))
      // exec inspect
      enqueueJson(200, { ExitCode: 0 })

      await sandbox.exec('ls')

      // httpRequestCalls[0] = create container (dockerApi, 30s)
      // httpRequestCalls[1] = exec create (dockerApi, 30s)
      // httpRequestCalls[2] = exec start (dockerApiRaw, 600s)
      // httpRequestCalls[3] = exec inspect (dockerApi, 30s)

      const execStartReq = httpRequestCalls[2].req
      expect(execStartReq.setTimeout).toHaveBeenCalledWith(600_000, expect.any(Function))

      // Verify regular calls get 30s
      const execCreateReq = httpRequestCalls[1].req
      expect(execCreateReq.setTimeout).toHaveBeenCalledWith(30_000, expect.any(Function))
    })

    it('should destroy request with error message on dockerApi timeout', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      // Don't enqueue a response — let the timeout fire
      void provider.create({ projectId: 'test-timeout-fire' })

      // Get the request and fire the timeout callback
      await new Promise((r) => setTimeout(r, 10))
      const req = httpRequestCalls[0].req
      const timeoutCall = req.setTimeout.mock.calls[0]
      expect(timeoutCall[0]).toBe(30_000)

      // Call the timeout handler
      const timeoutHandler = timeoutCall[1] as () => void
      timeoutHandler()

      expect(req.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Docker API timeout'),
        }),
      )
    })
  })

  // ─── Response size limits ─────────────────────────────────────────────

  describe('MAX_RAW_RESPONSE — 50MB cap on exec output', () => {
    it('should destroy request when exec output exceeds 50MB', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      // Override the entire http.request mock for full control of all calls
      let callCount = 0
      vi.mocked(http.request).mockImplementation(
        (
          opts: string | URL | http.RequestOptions,
          cbOrOpts?: RequestCallback | http.RequestOptions,
          maybeCb?: RequestCallback,
        ) => {
          callCount++
          const callback = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb
          const requestOpts = (
            typeof opts === 'object' && !(opts instanceof URL) ? opts : {}
          ) as http.RequestOptions
          const path = requestOpts.path ?? ''

          const req = buildMockRequest(new EventEmitter())

          if (callCount === 1) {
            // Container create
            const res = buildMockResponse(200, JSON.stringify({ Id: 'container-cap' }))
            req.end.mockImplementation(() => {
              process.nextTick(() => callback?.(res))
            })
            return req as unknown as http.ClientRequest
          }

          if (callCount === 2) {
            // Exec create
            const res = buildMockResponse(200, JSON.stringify({ Id: 'exec-cap' }))
            req.end.mockImplementation(() => {
              process.nextTick(() => callback?.(res))
            })
            return req as unknown as http.ClientRequest
          }

          if (path.includes('/start')) {
            // Exec start (dockerApiRaw) — simulate oversized response
            // When destroy(error) is called, emit 'error' synchronously
            req.destroy.mockImplementation((err?: Error) => {
              if (err) {
                // Use setImmediate to let the current data handlers finish,
                // then fire error on the request to reject the promise
                setImmediate(() => req.emit('error', err))
              }
            })
            req.end.mockImplementation(() => {
              process.nextTick(() => {
                const res = new EventEmitter() as EventEmitter & { statusCode: number }
                res.statusCode = 200

                callback?.(res)

                // Emit chunks that exceed 50MB total
                const chunkSize = 10 * 1024 * 1024 // 10MB per chunk
                for (let i = 0; i < 6; i++) {
                  // 6 * 10MB = 60MB > 50MB limit
                  res.emit('data', Buffer.alloc(chunkSize))
                }
              })
            })

            return req as unknown as http.ClientRequest
          }

          // Fallback — exec inspect (should not be reached if error is thrown)
          const res = buildMockResponse(200, JSON.stringify({ ExitCode: 0 }))
          req.end.mockImplementation(() => {
            process.nextTick(() => callback?.(res))
          })
          return req as unknown as http.ClientRequest
        },
      )

      // Create the sandbox first
      const sandbox = await provider.create({ projectId: 'test-cap' })

      // The exec should reject because the response exceeds 50MB
      await expect(sandbox.exec('cat /dev/urandom | head -c 60M')).rejects.toThrow(
        /exceeded.*50.*MB.*limit/i,
      )
    })
  })

  // ─── Volume creation idempotency ──────────────────────────────────────

  describe('volume creation idempotency', () => {
    it('should succeed when creating a new volume', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Name: 'my-vol', Driver: 'local' })

      await expect(provider.createVolume!('my-vol')).resolves.toBeUndefined()

      const body = JSON.parse(httpRequestCalls[0].body!)
      expect(body.Name).toBe('my-vol')
    })

    it('should treat 409 Conflict as success (volume already exists)', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      // 409 Conflict — volume already exists
      enqueueResponse(409, 'Conflict: volume already exists')

      // Should not throw
      await expect(provider.createVolume!('existing-vol')).resolves.toBeUndefined()
    })

    it('should re-throw non-409 errors', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      // 500 Internal Server Error
      enqueueResponse(500, 'Internal Server Error')

      await expect(provider.createVolume!('bad-vol')).rejects.toThrow(/500/)
    })
  })

  // ─── Provider factory and metadata ────────────────────────────────────

  describe('provider factory and defaults', () => {
    it('should create provider with default configuration', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()

      expect(provider.name).toBe('docker')
    })

    it('should accept custom configuration', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        socketPath: '/custom/docker.sock',
        baseImage: 'node:20-alpine',
        labelPrefix: 'custom-prefix',
        previewUrlTemplate: 'http://sandbox.example.com:{port}',
        defaultCpu: 4,
        defaultMemoryMB: 2048,
      })

      expect(provider.name).toBe('docker')
    })

    it('should use custom base image in container creation', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        socketPath: '/test.sock',
        baseImage: 'node:20-alpine',
      })

      enqueueJson(201, { Id: 'container-img' })
      await provider.create({ projectId: 'test-img' })

      const body = JSON.parse(httpRequestCalls[0].body!)
      expect(body.Image).toBe('node:20-alpine')
    })

    it('should override base image when config.image is specified', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        socketPath: '/test.sock',
        baseImage: 'node:20-alpine',
      })

      enqueueJson(201, { Id: 'container-override' })
      await provider.create({ projectId: 'test-override', image: 'custom:latest' })

      const body = JSON.parse(httpRequestCalls[0].body!)
      expect(body.Image).toBe('custom:latest')
    })

    it('should set environment variables on container', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-env' })
      await provider.create({
        projectId: 'test-env',
        env: { NODE_ENV: 'production', API_KEY: 'secret123' },
      })

      const body = JSON.parse(httpRequestCalls[0].body!)
      expect(body.Env).toEqual(['NODE_ENV=production', 'API_KEY=secret123'])
    })

    it('should expose ports 4000 and 5173', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-ports' })
      await provider.create({ projectId: 'test-ports' })

      const body = JSON.parse(httpRequestCalls[0].body!)
      expect(body.ExposedPorts).toEqual({
        '4000/tcp': {},
        '5173/tcp': {},
      })
    })
  })

  // ─── Sandbox lifecycle ────────────────────────────────────────────────

  describe('sandbox lifecycle', () => {
    it('should start a container', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-life' })
      const sandbox = await provider.create({ projectId: 'test-life' })

      expect(sandbox.status).toBe('stopped')

      enqueueJson(204, '')
      await sandbox.start()

      expect(sandbox.status).toBe('running')
      expect(httpRequestCalls[1].opts.path).toContain('/containers/container-life/start')
      expect(httpRequestCalls[1].opts.method).toBe('POST')
    })

    it('should stop a container', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-stop' })
      const sandbox = await provider.create({ projectId: 'test-stop' })

      enqueueJson(204, '')
      await sandbox.stop()

      expect(sandbox.status).toBe('stopped')
    })

    it('should return correct preview URL', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        socketPath: '/test.sock',
        previewUrlTemplate: 'http://preview.local:{port}',
      })

      enqueueJson(201, { Id: 'container-url' })
      const sandbox = await provider.create({ projectId: 'test-url' })

      expect(sandbox.previewUrl).toBe('http://preview.local:5173')
      expect(sandbox.getPreviewUrl(3000)).toBe('http://preview.local:3000')
      expect(sandbox.getPreviewUrl()).toBe('http://preview.local:5173')
    })
  })

  // ─── Docker API path versioning ───────────────────────────────────────

  describe('Docker API path versioning', () => {
    it('should prefix all API paths with /v1.44', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/test.sock' })

      enqueueJson(201, { Id: 'container-ver' })
      await provider.create({ projectId: 'test-ver' })

      expect(httpRequestCalls[0].opts.path).toBe('/v1.44/containers/create')
    })

    it('should use the configured socketPath', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({ socketPath: '/custom/path.sock' })

      enqueueJson(201, { Id: 'container-sock' })
      await provider.create({ projectId: 'test-sock' })

      expect(httpRequestCalls[0].opts.socketPath).toBe('/custom/path.sock')
    })
  })
})
