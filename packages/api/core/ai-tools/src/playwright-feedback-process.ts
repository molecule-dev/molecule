/**
 * Native ownership and OS scheduling for disposable, speculative browser work.
 * @module
 */
import type * as ChildProcess from 'node:child_process'
import type * as FileSystem from 'node:fs'
import type * as OperatingSystem from 'node:os'
import type * as Path from 'node:path'

interface FeedbackProcessOptions {
  command: string
  cwd: string
  root: string
  directory: string
  foreground?: boolean
}

/** Serialized into either execution backend; only standard Node/OS operations run there. */
function feedbackProcess(loadModule: NodeRequire, config: FeedbackProcessOptions): void {
  const fs: typeof FileSystem = loadModule('node:fs')
  const cp: typeof ChildProcess = loadModule('node:child_process')
  const os: typeof OperatingSystem = loadModule('node:os')
  const path: typeof Path = loadModule('node:path')
  const stopFile = path.join(config.directory, 'stop')
  const yielded = path.join(config.directory, 'yielded')
  if (!config.foreground)
    try {
      os.setPriority(0, 19)
    } catch (_error) {
      /* best effort on platforms without POSIX priorities */
    }

  let child: ReturnType<typeof cp.spawn> | undefined = undefined
  let done = false
  const owned = new Map<number, string>()
  const rememberChildren = (): void => {
    if (!child?.pid || process.platform !== 'linux') return
    const processes = new Map<number, { parent: number; ticks: string }>()
    for (const pid of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pid)) continue
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8')
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
        processes.set(Number(pid), { parent: Number(fields[1]), ticks: fields[19] })
      } catch (_error) {
        /* already exited */
      }
    }
    for (const [pid, entry] of processes) {
      const seen = new Set<number>()
      let ancestor = pid
      while (ancestor > 1 && !seen.has(ancestor)) {
        const ticks = owned.get(ancestor)
        if (
          ancestor === child.pid ||
          (ticks !== undefined && ticks === processes.get(ancestor)?.ticks)
        ) {
          owned.set(pid, entry.ticks)
          break
        }
        seen.add(ancestor)
        ancestor = processes.get(ancestor)?.parent ?? 0
      }
    }
  }
  const stop = (foreground = false): void => {
    if (done) return
    done = true
    if (foreground) fs.writeFileSync(yielded, 'foreground')
    rememberChildren()
    // Chromium creates a separate process group. Remember descendants before
    // killing the launcher and verify start ticks so a reused PID is never hit.
    for (const [pid, ticks] of [...owned].reverse()) {
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8')
        if (stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] === ticks)
          process.kill(pid, 'SIGKILL')
      } catch (_error) {
        /* already exited */
      }
    }
    // This process created the detached group. Never signal by command/name.
    if (child?.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch (_error) {
        /* already exited */
      }
    }
  }
  const ancestors = new Set<number>()
  let parent = process.pid
  while (parent > 1 && !ancestors.has(parent)) {
    ancestors.add(parent)
    try {
      const stat = fs.readFileSync(`/proc/${parent}/stat`, 'utf8')
      parent = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1])
    } catch (_error) {
      break
    }
  }
  // CLI agents can launch native tests without using our backend. /proc supplies
  // process identity and cwd, so they need no hook, lock or instruction to yield.
  // The host adapter cancels before its own tools; this catches independent CLI work.
  const foreground = (): boolean => {
    if (config.foreground) return false
    if (process.platform !== 'linux') return false
    const project = fs.statSync(config.root)
    for (const pid of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pid) || ancestors.has(Number(pid))) continue
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8')
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
        if (
          fields[0] === 'Z' ||
          Number(fields[2]) === child?.pid ||
          owned.get(Number(pid)) === fields[19]
        )
          continue
        const cwd = fs.readlinkSync(`/proc/${pid}/cwd`)
        if (cwd !== config.root && !cwd.startsWith(config.root + path.sep)) continue
        // Separate mount namespaces can both call their project /workspace.
        const other = fs.statSync(`/proc/${pid}/root${config.root}`)
        if (other.dev !== project.dev || other.ino !== project.ino) continue
        // Another background feedback run is not foreground work. A killed run keeps its idle CPU class, so on a
        // saturated machine its Playwright processes can wait to be scheduled long after their supervisor exited,
        // with their command line still readable; the next run then yielded to them and reported `cancelled`.
        let environ = ''
        try {
          environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8')
        } catch (_error) {
          /* an unreadable environment leaves the decision to the command line below */
        }
        if (environ.split('\0').some((entry) => entry.startsWith('MOL_TEST_FEEDBACK_EVENTS=')))
          continue
        const argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean)
        const executable = path.basename(argv[0] || '')
        // npm replaces argv with its process title before it starts the script.
        if (
          /^(?:npm|npx|pnpm|yarn|bun)(?: run)? (?:test(?::[\w-]+)?|build|deploy|check|typecheck)(?: |$)/.test(
            executable,
          )
        )
          return true
        const native = argv
          .slice(0, 3)
          .some((a) => /(?:^|\/)(?:@playwright\/test|playwright(?:-core)?|hurl)(?:\/|$)/.test(a))
        if (native || /^(?:hurl|playwright|fly|flyctl|vercel|netlify)$/.test(executable))
          return true
        if (argv.slice(1, 4).some((a) => a === 'deploy' || a === 'build')) return true
        if (
          /^(?:npm|npx|pnpm|yarn|bun|corepack)(?:\.c?js)?$/.test(executable) ||
          argv.some((a) => /\/(?:npm|npx)-cli\.js$/.test(a))
        ) {
          if (argv.some((a) => /^(?:test(?::[\w-]+)?|e2e|build|deploy|check|typecheck)$/.test(a)))
            return true
        }
      } catch (_error) {
        /* processes can exit between reads */
      }
    }
    return false
  }
  if (fs.existsSync(stopFile) || foreground()) {
    fs.writeFileSync(yielded, 'foreground')
    process.exitCode = 125
    return
  }
  // OS idle CPU and I/O scheduling are inherited by the runner and Chromium.
  // Fall back to nice(19) where chrt/ionice are unavailable.
  const lowPriority =
    'if command -v ionice >/dev/null 2>&1; then ionice -c 3 -p $$ 2>/dev/null; fi; if command -v chrt >/dev/null 2>&1; then chrt --idle --pid 0 $$ 2>/dev/null; fi; exec sh -c "$1"'
  child = cp.spawn(
    'sh',
    config.foreground ? ['-c', config.command] : ['-c', lowPriority, 'feedback', config.command],
    {
      cwd: config.cwd,
      detached: true,
      stdio: 'inherit',
    },
  )
  const watch = fs.watch(config.directory, () => {
    if (fs.existsSync(stopFile)) stop()
  })
  const poll = setInterval(() => {
    rememberChildren()
    if (foreground()) stop(true)
  }, 100)
  const terminate = (): void => stop()
  process.on('SIGINT', terminate)
  process.on('SIGTERM', terminate)
  process.on('exit', terminate)
  child.on('error', () => {
    stop()
    finish(1)
  })
  const finish = (code: number): void => {
    stop()
    watch.close()
    clearInterval(poll)
    process.off('SIGINT', terminate)
    process.off('SIGTERM', terminate)
    process.off('exit', terminate)
    process.exitCode = code
  }
  child.on('close', (code) => finish(done ? 125 : (code ?? 1)))
  // An abort can arrive between the first check and installing fs.watch.
  if (fs.existsSync(stopFile)) stop()
}

/**
 * Compose a private native supervisor without putting the test command on its argv.
 * @param config - The known command, working directory and owned scratch directory.
 * @returns A self-contained native Node program.
 */
export function feedbackProcessSource(config: FeedbackProcessOptions): string {
  return `(${feedbackProcess.toString()})(require,${JSON.stringify(config)});\n`
}
