/**
 * Ends a process whose main thread stops yielding, after printing what holds it.
 *
 * A test timeout is a timer, so it cannot fire while the thread never returns to the event
 * loop: a chain of microtasks or a synchronous spin. On 2026-11-19 a Vue port's `watchEffect`
 * re-ran on a status its own listing set, in a microtask loop, and the port's conformance
 * suite printed nothing for 40 minutes until an outer timeout killed it. This watchdog is a
 * worker thread that sees a heartbeat the main thread bumps every second. When the heartbeat
 * stops for `seconds`, the worker pauses the main thread over the inspector, writes the
 * current label (the test being run) and its JavaScript stack to stderr, with each frame's
 * line of code, and kills the process.
 *
 * Plain Node, no Vitest: {@link watchConformanceEventLoop} in `stall-watchdog-vitest.ts`
 * starts it for a conformance file.
 *
 * @module
 */

// From node:timers, not the globals: a case's fake timers replace the globals, and a heartbeat
// scheduled through them would stand still and read as a stall.
import { clearInterval, setInterval } from 'node:timers'
import { Worker } from 'node:worker_threads'

/** A running watchdog. */
export interface StallWatchdog {
  /** Names what the main thread is running now (a test's name), printed with the stack. */
  setLabel(label: string): void
  /** Stops the heartbeat and the worker. */
  stop(): Promise<void>
}

/**
 * The watchdog worker, as source: it counts the seconds the heartbeat has not moved, then
 * pauses the main thread, prints the label and the top frames, and kills the process. A
 * worker's `process.exit` would end only the worker, so it sends the process SIGKILL. It loads
 * builtins with `process.getBuiltinModule`: an eval worker inherits the parent's
 * `--input-type`, so `require` is missing when that is `module`.
 */
const WORKER_SOURCE = `
const { workerData, parentPort } = process.getBuiltinModule('node:worker_threads')
const inspector = process.getBuiltinModule('node:inspector')
const { writeSync } = process.getBuiltinModule('node:fs')
const { beat, seconds } = workerData
let label = ''
parentPort.on('message', (next) => { label = next })
let last = Atomics.load(beat, 0)
let still = 0
const timer = setInterval(() => {
  const now = Atomics.load(beat, 0)
  if (now !== last) { last = now; still = 0; return }
  still += 1
  if (still < seconds) return
  clearInterval(timer)
  report()
}, 1000)
function report() {
  const session = new inspector.Session()
  session.connectToMainThread()
  const scripts = new Map()
  session.on('Debugger.scriptParsed', ({ params }) => scripts.set(params.scriptId, params.url))
  session.on('Debugger.paused', async ({ params }) => {
    const sources = new Map()
    const lineOf = (scriptId, line) => new Promise((resolve) => {
      if (sources.has(scriptId)) return resolve(sources.get(scriptId)[line] ?? '')
      session.post('Debugger.getScriptSource', { scriptId }, (error, result) => {
        const lines = error ? [] : result.scriptSource.split('\\n')
        sources.set(scriptId, lines)
        resolve(lines[line] ?? '')
      })
    })
    const out = ['', 'stall-watchdog: the main thread has not yielded to the event loop for ' + seconds + ' s' + (label ? ', in: ' + label : '') + '.', 'A test timeout cannot fire until it does. The code it is running (frames in transformed modules give the transformed line):']
    for (const frame of params.callFrames.slice(0, 20)) {
      const url = scripts.get(frame.location.scriptId) || frame.url || '(unknown)'
      const column = frame.location.columnNumber
      const code = (await lineOf(frame.location.scriptId, frame.location.lineNumber)).slice(Math.max(0, column - 60), column + 100).trim()
      out.push('  at ' + (frame.functionName || '(anonymous)') + ' (' + url + ':' + (frame.location.lineNumber + 1) + ':' + (frame.location.columnNumber + 1) + ')' + (code ? '\\n       ' + code : ''))
    }
    writeSync(2, out.join('\\n') + '\\n')
    process.kill(process.pid, 'SIGKILL')
  })
  session.post('Debugger.enable', () => session.post('Debugger.pause'))
}
`

/**
 * Starts a watchdog over the calling (main) thread.
 *
 * @param seconds - How long the heartbeat may stand still before the process is ended.
 * @returns The watchdog. Its heartbeat and worker never keep the process alive.
 */
export function startStallWatchdog(seconds: number): StallWatchdog {
  const beat = new Int32Array(new SharedArrayBuffer(4))
  const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { beat, seconds } })
  worker.unref()
  const heartbeat = setInterval(() => Atomics.add(beat, 0, 1), 1000)
  heartbeat.unref()
  return {
    setLabel: (label) => worker.postMessage(label),
    stop: async () => {
      clearInterval(heartbeat)
      await worker.terminate()
    },
  }
}
