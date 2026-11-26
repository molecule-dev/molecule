/**
 * Prepares Playwright's managed browsers before a local test worker can launch one.
 *
 * @module
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir, hostname, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { stripVTControlCharacters } from 'node:util'

const INSTALL_TIMEOUT_MS = 240_000
const RESULT_WAIT_MS = INSTALL_TIMEOUT_MS + 10_000

/** Read Playwright's environment setting, including the forms npm passes to scripts. */
function setting(name: string): string | undefined {
  return (
    process.env[name] ??
    process.env[`npm_config_${name.toLowerCase()}`] ??
    process.env[`npm_package_config_${name.toLowerCase()}`]
  )
}

/** A cache path, or Playwright's sentinel for browsers next to its own package. */
function cacheDirectory(from: string): string {
  const configured = setting('PLAYWRIGHT_BROWSERS_PATH')
  if (configured === '0') return configured
  let base: string
  switch (process.platform) {
    case 'darwin':
      base = join(homedir(), 'Library', 'Caches')
      break
    case 'win32':
      base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
      break
    default:
      base = process.env.XDG_CACHE_HOME || join(homedir(), '.cache')
  }
  return resolve(from, configured || join(base, 'ms-playwright'))
}

/** Run the project's CLI, preserving both output streams and the last diagnostic line. */
function runInstall(command: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
  process.stdout.write(`Molecule browser setup: playwright ${command.slice(2).join(' ')}\n`)
  return new Promise((resolveResult, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: INSTALL_TIMEOUT_MS,
    })
    let diagnostic = ''
    const copy = (input: NodeJS.ReadableStream, output: NodeJS.WritableStream): (() => void) => {
      let pending = ''
      const remember = (line: string): void => {
        const text = stripVTControlCharacters(line).trim()
        if (text && !text.startsWith('at ')) diagnostic = text
      }
      input.setEncoding('utf8')
      input.on('data', (chunk: string) => {
        output.write(chunk)
        const lines = (pending + chunk).split(/[\r\n]/)
        pending = lines.pop() ?? ''
        for (const line of lines) remember(line)
      })
      return () => remember(pending)
    }
    const finishStdout = copy(child.stdout, process.stdout)
    const finishStderr = copy(child.stderr, process.stderr)
    child.on('error', reject)
    child.on('close', (code, signal) => {
      finishStdout()
      finishStderr()
      if (code === 0) resolveResult('')
      else
        resolveResult(
          `${signal ? `signal ${signal}` : `exit code ${code}`}. ${diagnostic || 'No installer diagnostic'}`,
        )
    })
  })
}

/** A runner ID shared by its workers, with Linux process start time to distinguish reused PIDs. */
async function runnerIdentity(): Promise<string> {
  const pid = process.ppid
  if (process.platform !== 'linux') return String(pid)
  // The command name can contain spaces and parentheses. Field 22 is the start time.
  const info = await readFile(`/proc/${pid}/stat`, 'utf8').catch((_error) => {
    // Some containers hide the parent from procfs. Siblings still have the same parent PID.
    return ''
  })
  const start = info
    .slice(info.lastIndexOf(')') + 1)
    .trim()
    .split(/\s+/)[19]
  return start ? `${pid}-${start}` : String(pid)
}

/** Elect one installer and atomically share its result, including failures, with later workers. */
async function shareResult(key: string, run: () => Promise<string>): Promise<string> {
  const user = createHash('sha256').update(homedir()).digest('hex').slice(0, 12)
  const root = join(tmpdir(), `molecule-playwright-${user}`)
  const dir = join(root, key)
  const result = join(dir, 'result')
  await mkdir(root, { recursive: true, mode: 0o700 })
  try {
    await mkdir(dir, { mode: 0o700 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const deadline = performance.now() + RESULT_WAIT_MS
    for (;;) {
      try {
        return await readFile(result, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        if (performance.now() >= deadline)
          throw new Error('Timed out waiting for the installer worker', { cause: error })
        await setTimeout(100)
      }
    }
  }

  const outcome = await run()
  const temp = join(dir, 'pending')
  await writeFile(temp, outcome, { mode: 0o600 })
  await rename(temp, result)
  // Bound leftover state from previous invocations. A concurrent run's marker has a different key.
  try {
    for (const entry of await readdir(root)) {
      if (!/^[a-f0-9]{64}$/.test(entry) || entry === key) continue
      const previous = join(root, entry)
      const time = await stat(previous)
      if (Date.now() - time.mtimeMs > 7 * 24 * 60 * 60_000)
        await rm(previous, { recursive: true, force: true })
    }
  } catch (_error) {
    // A concurrent install can remove a stale marker first.
  }
  return outcome
}

/**
 * Install the requested managed browser with the suite's own Playwright CLI. Workers and retries
 * under one runner share the outcome for the same cache, target and Playwright version.
 *
 * @param args - The arguments after `playwright install`.
 * @param cwd - The directory containing the suite's Playwright config, or the current directory.
 * @throws {Error} When setup fails, with the command, directory, cache and installer diagnostic.
 */
export async function installPlaywrightBrowser(
  args: readonly string[],
  cwd = process.cwd(),
): Promise<void> {
  const dir = resolve(cwd)
  let suiteRequire = createRequire(join(dir, 'package.json'))
  const command = [process.execPath, '@playwright/test/cli', 'install', ...args]
  let cache = setting('PLAYWRIGHT_BROWSERS_PATH') || 'default Playwright cache'
  const failure = (diagnostic: string): string =>
    `MOL_E2E_BROWSER_SETUP_FAILED: ${diagnostic}. Command ${JSON.stringify(command)} in cwd ${dir}, cache ${cache}`
  let outcome: string
  try {
    // Playwright resolves a relative cache from INIT_CWD or the runner's cwd, even when the
    // suite config is elsewhere. Preserve that base when running the installer in the suite.
    const runnerCwd = process.cwd()
    const from = resolve(setting('INIT_CWD') || runnerCwd)
    cache = cacheDirectory(from)
    try {
      command[1] = suiteRequire.resolve('@playwright/test/cli')
    } catch (error) {
      if (dir === runnerCwd || (error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND')
        throw error
      // A config can live outside the project that invoked Playwright, such as a temporary suite.
      suiteRequire = createRequire(join(runnerCwd, 'package.json'))
      command[1] = suiteRequire.resolve('@playwright/test/cli')
    }
    if (cache === '0') {
      // In strict layouts the suite can resolve @playwright/test but not its private dependencies.
      const fromTest = createRequire(command[1])
      const fromPlaywright = createRequire(fromTest.resolve('playwright/package.json'))
      cache = join(
        dirname(fromPlaywright.resolve('playwright-core/package.json')),
        '.local-browsers',
      )
    }
    const env = { ...process.env, ...(dir !== runnerCwd ? { INIT_CWD: from } : {}) }
    const run = async (): Promise<string> => {
      try {
        const diagnostic = await runInstall(command, dir, env)
        return diagnostic ? failure(diagnostic) : ''
      } catch (error) {
        return failure(String(error))
      }
    }
    if (process.env.TEST_WORKER_INDEX === undefined) outcome = await run()
    else {
      const { version } = suiteRequire('@playwright/test/package.json') as { version: string }
      const identity = await runnerIdentity()
      const key = createHash('sha256')
        .update(JSON.stringify([hostname(), identity, cache, args, version]))
        .digest('hex')
      outcome = await shareResult(key, run)
    }
  } catch (error) {
    outcome = failure(String(error))
  }
  if (outcome) throw new Error(outcome)
}
