import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { afterEach, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools, taskStopCommand, taskStopFile, taskStopScript } from '../tools.js'

// A walk's runner replaces a worker after a failure; the replacement is in no pid list taken
// before it existed (X1 xr-molecule-flash-l2608: the stopped walk's runner ran on and two walks
// of the new build were refused).
const roots: string[] = []
const taskIds: string[] = []
const leftovers: number[] = []

afterEach(async () => {
  for (const pid of leftovers.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch (_error) {
      // Already gone, which is what every passing test leaves.
    }
  }
  for (const id of taskIds.splice(0))
    for (const suffix of ['.sh', '.stop', '.pid', '.exit', '.log'])
      await rm(`/tmp/${id}${suffix}`, { force: true })
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (_error) {
    // ESRCH: no such process, the answer being asked for.
    return false
  }
}

async function until<T>(read: () => Promise<T | null>, ms = 5000): Promise<T> {
  const end = Date.now() + ms
  for (;;) {
    const value = await read()
    if (value !== null) return value
    if (Date.now() > end) throw new Error('timed out')
    await delay(25)
  }
}

const pidIn = (file: string) => async (): Promise<number | null> => {
  const text = await readFile(file, 'utf8').catch(() => '')
  return /^\d+\s*$/.test(text) ? Number(text) : null
}

/**
 * Starts a background task whose process tree grows: one child at once, another when `go` exists.
 *
 * @returns The task id, both children's pids (the second once it starts) and the tools.
 */
async function growingTask(): Promise<{
  taskId: string
  first: number
  second: () => Promise<number>
  start: () => Promise<void>
  backend: ReturnType<typeof createLocalBackend>
  tools: ReturnType<typeof buildTools>
}> {
  const root = await mkdtemp(join(tmpdir(), 'molecule-task-stop-'))
  roots.push(root)
  const backend = createLocalBackend(root)
  const tools = buildTools(backend, { symlinkGuards: true })
  const command =
    `sleep 30 & echo $! > ${root}/first; ` +
    `while [ ! -e ${root}/go ]; do sleep 0.05; done; ` +
    `sleep 31 & echo $! > ${root}/second; wait`
  const started = (await tools
    .find((tool) => tool.name === 'exec_command')!
    .execute({ command, run_in_background: true })) as { taskId: string }
  taskIds.push(started.taskId)
  const first = await until(pidIn(`${root}/first`))
  leftovers.push(first)
  return {
    taskId: started.taskId,
    first,
    second: async () => {
      const pid = await until(pidIn(`${root}/second`))
      leftovers.push(pid)
      return pid
    },
    start: () => writeFile(`${root}/go`, ''),
    backend,
    tools,
  }
}

it('the stop script stops the whole tree as it is when it runs, a child started later included', async () => {
  const task = await growingTask()
  // The note is written now, before the later child exists.
  const stop = await taskStopCommand(task.backend, task.taskId)
  expect(stop).toBe(`sh ${taskStopFile(task.taskId)}`)
  await task.start()
  const second = await task.second()
  const shell = Number(await readFile(`/tmp/${task.taskId}.pid`, 'utf8'))

  const ran = await task.backend.run(stop, { timeout: 10_000 })
  expect(ran.exitCode).toBe(0)
  for (const pid of [shell, task.first, second]) expect(alive(pid)).toBe(false)

  // The stopped run is collected at once, with the TERM status.
  const collected = (await task.tools
    .find((tool) => tool.name === 'wait_for_task')!
    .execute({ taskId: task.taskId, timeout: 3000 })) as { exitCode: number | null }
  expect(collected.exitCode).toBe(143)
}, 20_000)

it('known bad: a pid list taken when the note is written misses the child started after it', async () => {
  const task = await growingTask()
  // A task without its stop script (launched before it existed) gets the pid walk of the moment.
  await rm(taskStopFile(task.taskId))
  const stop = await taskStopCommand(task.backend, task.taskId)
  expect(stop).toMatch(/^kill \d+( \d+)*$/)
  await task.start()
  const second = await task.second()

  await task.backend.run(stop, { timeout: 10_000 })
  await delay(200)
  expect(alive(task.first)).toBe(false)
  // The replacement runs on, as the l2608 runner did.
  expect(alive(second)).toBe(true)
}, 20_000)

it('keeps an exit code the task recorded itself and gives 143 to one that recorded none', async () => {
  const id = `mol-bg-stoptest${process.pid}-${Date.now().toString(36)}`
  taskIds.push(id)
  await writeFile(taskStopFile(id), taskStopScript(id))
  const backend = createLocalBackend(tmpdir())

  // No pid file: nothing to stop, and nothing recorded an exit code.
  expect((await backend.run(`sh ${taskStopFile(id)}`, { timeout: 10_000 })).exitCode).toBe(0)
  expect((await readFile(`/tmp/${id}.exit`, 'utf8')).trim()).toBe('143')

  await writeFile(`/tmp/${id}.exit`, '0\n')
  await backend.run(`sh ${taskStopFile(id)}`, { timeout: 10_000 })
  expect((await readFile(`/tmp/${id}.exit`, 'utf8')).trim()).toBe('0')
}, 20_000)
