/**
 * Tests for command execution — the direct path, and the detach-and-poll path
 * that works around Fly's hard 60-second exec ceiling.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const {
  buildScript,
  DIRECT_EXEC_BUDGET_SECONDS,
  execCommand,
  FLY_EXEC_MAX_TIMEOUT_SECONDS,
  INDETERMINATE_EXIT_CODE,
  toExecResult,
} = await import('../exec.js')

import type { FlyExecResponse } from '../types.js'

/** One recorded exec call. */
interface Recorded {
  command: string[]
  timeoutSeconds: number
  script: string
}

/**
 * Builds a `RawExec` double driven by a handler over the shell script it is given.
 * @param handler - Returns the Fly exec response for a given script.
 * @returns The exec double and the list of recorded calls.
 */
function makeExec(handler: (script: string, call: number) => FlyExecResponse) {
  const calls: Recorded[] = []
  const exec = async (command: string[], timeoutSeconds: number): Promise<FlyExecResponse> => {
    const script = command[command.length - 1]
    calls.push({ command, timeoutSeconds, script })
    return handler(script, calls.length)
  }
  return { exec, calls }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toExecResult', () => {
  it('passes an exit code straight through', () => {
    expect(toExecResult({ stdout: 'ok', stderr: '', exit_code: 0 })).toEqual({
      stdout: 'ok',
      stderr: '',
      exitCode: 0,
    })
    expect(toExecResult({ exit_code: 127 }).exitCode).toBe(127)
  })

  it('renders a signalled process as 128 + signal, the way a shell does', () => {
    expect(toExecResult({ exit_signal: 9 }).exitCode).toBe(137)
    expect(toExecResult({ exit_signal: 15 }).exitCode).toBe(143)
  })

  it('reports an absent status as indeterminate, not as success', () => {
    expect(toExecResult({}).exitCode).toBe(INDETERMINATE_EXIT_CODE)
    expect(toExecResult({}).exitCode).not.toBe(0)
  })
})

describe('buildScript', () => {
  it('changes to the working directory and exports the environment first', () => {
    const script = buildScript('npm test', { cwd: '/app', env: { CI: '1' } }, '/workspace')
    expect(script).toBe(["cd '/app' || exit 127", "export CI='1'", 'npm test'].join('\n'))
  })

  it('falls back to the provider default working directory', () => {
    expect(buildScript('ls', undefined, '/workspace')).toContain("cd '/workspace' || exit 127")
  })

  it('quotes a hostile cwd rather than letting it break out', () => {
    const script = buildScript('ls', { cwd: "/tmp'; rm -rf /; '" }, '/workspace')
    expect(script.startsWith(`cd '/tmp'\\''; rm -rf /; '\\''' || exit 127`)).toBe(true)
  })
})

describe('execCommand — direct path', () => {
  it('runs a short command as a single exec inside Fly’s ceiling', async () => {
    const { exec, calls } = makeExec(() => ({ stdout: 'hi\n', stderr: '', exit_code: 0 }))

    const result = await execCommand(exec, 'echo hi', { timeout: 5000 }, '/workspace')

    expect(result).toEqual({ stdout: 'hi\n', stderr: '', exitCode: 0 })
    expect(calls).toHaveLength(1)
    expect(calls[0].command[0]).toBe('sh')
    expect(calls[0].command[1]).toBe('-c')
    expect(calls[0].script).toContain('echo hi')
    expect(calls[0].timeoutSeconds).toBe(5)
  })

  it('never asks Fly for a timeout above the 60-second ceiling', async () => {
    const { exec, calls } = makeExec(() => ({ exit_code: 0 }))

    await execCommand(exec, 'true', { timeout: DIRECT_EXEC_BUDGET_SECONDS * 1000 }, '/workspace')

    expect(calls[0].timeoutSeconds).toBeLessThanOrEqual(FLY_EXEC_MAX_TIMEOUT_SECONDS)
    expect(calls[0].timeoutSeconds).toBe(DIRECT_EXEC_BUDGET_SECONDS)
  })

  it('asks for at least one second for a sub-second budget', async () => {
    const { exec, calls } = makeExec(() => ({ exit_code: 0 }))
    await execCommand(exec, 'true', { timeout: 10 }, '/workspace')
    expect(calls[0].timeoutSeconds).toBe(1)
  })

  it('surfaces a non-zero exit code and stderr', async () => {
    const { exec } = makeExec(() => ({ stdout: '', stderr: 'boom', exit_code: 2 }))
    await expect(execCommand(exec, 'false', { timeout: 1000 }, '/workspace')).resolves.toEqual({
      stdout: '',
      stderr: 'boom',
      exitCode: 2,
    })
  })
})

describe('execCommand — detached path (past Fly’s 60s exec ceiling)', () => {
  /**
   * Drives a detached run to completion under fake timers.
   * @param handler - Script handler for the exec double.
   * @param timeout - Caller budget in ms.
   * @returns The exec result and recorded calls.
   */
  async function runDetached(
    handler: (script: string, call: number) => FlyExecResponse,
    timeout = 600_000,
  ) {
    vi.useFakeTimers()
    const { exec, calls } = makeExec(handler)
    const promise = execCommand(exec, 'npm install', { timeout }, '/workspace')
    await vi.advanceTimersByTimeAsync(timeout + 10_000)
    const result = await promise
    return { result, calls }
  }

  it('launches detached, polls the status file, collects output and cleans up', async () => {
    const { result, calls } = await runDetached((script) => {
      if (script.includes('nohup')) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '0\n', exit_code: 0 }
      if (script.includes('head -c')) {
        return { stdout: 'installed 42 packages\n__MOL_STDERR__\nwarn: deprecated', exit_code: 0 }
      }
      return { exit_code: 0 }
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('installed 42 packages')
    expect(result.stderr).toBe('warn: deprecated')

    const scripts = calls.map((call) => call.script)
    expect(scripts[0]).toContain('mkdir -p /tmp/.mol-exec')
    expect(scripts[0]).toContain('base64 -d')
    expect(scripts[0]).toContain('nohup sh -c')
    // The `&` must background ONLY the nohup line: in POSIX sh `a && b &`
    // backgrounds the whole list, racing the script write against the launch.
    expect(scripts[0]).not.toMatch(/&&[^\n]*&$/m)
    expect(scripts.some((script) => script.startsWith('cat /tmp/.mol-exec/'))).toBe(true)
    expect(scripts.some((script) => script.includes('head -c'))).toBe(true)
    expect(scripts.some((script) => script.startsWith('rm -f /tmp/.mol-exec/'))).toBe(true)

    // Every bookkeeping exec must stay inside Fly's ceiling.
    for (const call of calls) {
      expect(call.timeoutSeconds).toBeLessThanOrEqual(FLY_EXEC_MAX_TIMEOUT_SECONDS)
    }
  })

  it('never sends the user command as an argument — it is delivered base64-encoded', async () => {
    const { calls } = await runDetached((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '0', exit_code: 0 }
      return { stdout: '\n__MOL_STDERR__\n', exit_code: 0 }
    })
    expect(calls[0].script).not.toContain('npm install')
    const encoded = Buffer.from(
      buildScript('npm install', { timeout: 600_000 }, '/workspace'),
      'utf8',
    ).toString('base64')
    expect(calls[0].script).toContain(encoded)
  })

  it('parses the exit status written by the detached process', async () => {
    const { result } = await runDetached((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '137\n', exit_code: 0 }
      return { stdout: 'out\n__MOL_STDERR__\nerr', exit_code: 0 }
    })
    expect(result.exitCode).toBe(137)
  })

  it('keeps polling while the status file is empty', async () => {
    let polls = 0
    const { result } = await runDetached((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) {
        polls++
        return { stdout: polls < 3 ? '' : '0', exit_code: 0 }
      }
      return { stdout: 'done\n__MOL_STDERR__\n', exit_code: 0 }
    })
    expect(polls).toBe(3)
    expect(result.exitCode).toBe(0)
  })

  it('reports an indeterminate exit code when the command outlives the budget', async () => {
    const { result } = await runDetached((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '', exit_code: 0 }
      return { stdout: 'partial\n__MOL_STDERR__\n', exit_code: 0 }
    }, 10_000 * 6)

    expect(result.exitCode).toBe(INDETERMINATE_EXIT_CODE)
    expect(result.stdout).toBe('partial')
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('still running'),
      expect.anything(),
    )
  })

  it('does not remove the scratch files when the command is still running', async () => {
    const { calls } = await runDetached((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '', exit_code: 0 }
      return { stdout: '\n__MOL_STDERR__\n', exit_code: 0 }
    }, 60_000)
    expect(calls.some((call) => call.script.startsWith('rm -f'))).toBe(false)
  })

  it('throws with a clear message when the launcher itself fails', async () => {
    vi.useFakeTimers()
    const { exec } = makeExec(() => ({ stdout: '', stderr: 'mkdir: read-only', exit_code: 1 }))
    await expect(
      execCommand(exec, 'npm install', { timeout: 600_000 }, '/workspace'),
    ).rejects.toThrow(/Failed to launch detached command/)
  })

  it('refuses a command too large to pass as a single sh -c argument', async () => {
    vi.useFakeTimers()
    const { exec, calls } = makeExec(() => ({ exit_code: 0 }))
    await expect(
      execCommand(exec, 'x'.repeat(200_000), { timeout: 600_000 }, '/workspace'),
    ).rejects.toThrow(/too large to launch/)
    expect(calls).toHaveLength(0)
  })

  it('still succeeds when cleanup fails — the command already completed', async () => {
    vi.useFakeTimers()
    const { exec } = makeExec((script, call) => {
      if (call === 1) return { stdout: 'abc', exit_code: 0 }
      if (script.startsWith('cat ')) return { stdout: '0', exit_code: 0 }
      if (script.startsWith('rm -f')) throw new Error('exec transport down')
      return { stdout: 'ok\n__MOL_STDERR__\n', exit_code: 0 }
    })
    const promise = execCommand(exec, 'npm install', { timeout: 600_000 }, '/workspace')
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(promise).resolves.toMatchObject({ exitCode: 0, stdout: 'ok' })
    expect(mockLogger.debug).toHaveBeenCalled()
  })
})
