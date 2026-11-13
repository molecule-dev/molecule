/**
 * A command means the same thing in the foreground and in the background.
 *
 * The sandbox backend runs a foreground command with `bash -c`, but a background command's script
 * ran as `sh <script>`, which is dash in a Debian image: there `&>` backgrounds the command, `[[`
 * is not a command, and `((` opens two subshells instead of an arithmetic test. Moving a command
 * to the background (the platform does it when a run cannot fit the tool's budget) could change
 * what its own text did. Both modes now run the command in bash, on this backend too.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { afterEach, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools } from '../tools.js'

const roots: string[] = []
const taskIds: string[] = []

afterEach(async () => {
  for (const id of taskIds.splice(0))
    for (const suffix of ['.sh', '.stop', '.pid', '.exit', '.log'])
      await rm(`/tmp/${id}${suffix}`, { force: true })
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

/** Bash-only text: a `[[` test, an arithmetic command and a `&>` redirect. */
const BASH_ONLY = '[[ -n "$HOME" ]] && (( 2 > 1 )) && echo same-shell &> out.txt; cat out.txt'

it('runs bash-only text the same in the foreground and the background', async () => {
  const root = await mkdtemp(join(tmpdir(), 'one-shell-'))
  roots.push(root)
  const exec = buildTools(createLocalBackend(root)).find((tool) => tool.name === 'exec_command')!

  const foreground = (await exec.execute({ command: BASH_ONLY })) as {
    stdout?: string
    exitCode?: number
  }
  expect(foreground.exitCode).toBe(0)
  expect(foreground.stdout).toContain('same-shell')

  await rm(join(root, 'out.txt'), { force: true })
  const background = (await exec.execute({ command: BASH_ONLY, run_in_background: true })) as {
    taskId?: string
  }
  expect(typeof background.taskId).toBe('string')
  taskIds.push(background.taskId!)
  const exitFile = `/tmp/${background.taskId}.exit`
  const end = Date.now() + 10_000
  let code = ''
  while (Date.now() < end) {
    code = (await readFile(exitFile, 'utf8').catch((_error) => '')).trim()
    if (code !== '') break
    await delay(25)
  }
  expect(code).toBe('0')
  expect(await readFile(`/tmp/${background.taskId}.log`, 'utf8')).toContain('same-shell')
})
