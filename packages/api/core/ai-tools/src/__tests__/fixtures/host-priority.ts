/**
 * Keeps a test's background Playwright runs at the test process's own CPU and I/O priority.
 *
 * A background feedback run moves itself into the OS idle classes (`chrt --idle`, `ionice -c 3`)
 * so that it yields to the dev server and builds it runs beside. On a host whose CPUs are all
 * busy, idle-class work waits for spare CPU that may not come for minutes: on 2026-11-16 four
 * 20 s cases of the native feedback suite timed out at load 45 on 14 CPUs, and three of them
 * passed in 9–19 s once the idle classes were left out. Tests that check what a run REPORTS use
 * this helper so they do not depend on the host's spare CPU. The priority itself is asserted by
 * `playwright-feedback-priority.test.ts`, which does not use it. The OOM-score step is part of
 * the run's own shell, not a separate program, and still applies.
 *
 * @module
 */
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** The scheduling programs a background run calls, each standing in as a no-op. */
const SCHEDULING_PROGRAMS = ['chrt', 'ionice'] as const

/**
 * Puts no-op `chrt` and `ionice` programs first on `PATH` for the runs this process starts.
 *
 * @param directory - A directory the test owns and removes; the programs go in `<directory>/bin`.
 * @returns Restores the previous `PATH`.
 */
export async function keepHostPriority(directory: string): Promise<() => void> {
  const bin = join(directory, 'bin')
  await mkdir(bin, { recursive: true })
  for (const program of SCHEDULING_PROGRAMS) {
    const file = join(bin, program)
    await writeFile(file, '#!/bin/sh\nexit 0\n')
    await chmod(file, 0o755)
  }
  const previous = process.env.PATH
  process.env.PATH = previous ? `${bin}:${previous}` : bin
  return () => {
    if (previous === undefined) delete process.env.PATH
    else process.env.PATH = previous
  }
}
