/**
 * A case whose step never settles fails before its test's timeout, names the step it hung at,
 * and still unmounts and disposes its component, so nothing it left running reaches the cases
 * after it. Before the deadline, Vitest abandoned such a case at its timeout without running
 * the runner's teardown, and the component it left mounted logged into every later case. The
 * same goes for a teardown step that throws: the steps after it (the app's dispose, the clock,
 * the page globals) still run.
 *
 * Plain DOM "components" stand in for a framework: one whose flush after the first click never
 * settles until the test releases it, and one whose unmount throws.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it, vi } from 'vitest'

import { caseStepsDeadlineMs, withinCaseDeadline } from '../ui/case-deadline.js'
import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'

/** A component whose second flush (the one after the first step) hangs until released. */
const hangingComponent = (
  log: string[],
): { mount: (container: HTMLElement) => Promise<MountedCase>; release: () => void } => {
  let release = (): void => undefined
  let flushes = 0
  const mount = async (container: HTMLElement): Promise<MountedCase> => {
    const node = document.createElement('p')
    node.textContent = 'ready'
    node.addEventListener('click', () => log.push('click'))
    container.appendChild(node)
    return {
      flush: async () => {
        flushes++
        if (flushes === 2) await new Promise<void>((resolve) => (release = resolve))
      },
      setProps: async () => undefined,
      setChildren: async () => undefined,
      location: () => '/',
      navigate: () => undefined,
      unmount: async () => {
        log.push('unmount')
        node.remove()
      },
      dispose: async () => {
        log.push('dispose')
      },
    }
  }
  return { mount, release: () => release() }
}

const twoClicks: UICase = {
  name: 'a step that never settles',
  interactions: [
    { type: 'click', selector: 'p' },
    { type: 'click', selector: 'p' },
  ],
}

/** The deadline the hung cases below run under: well inside their 1.5 s timeout. */
const HUNG_DEADLINE_MS = 200

describe('the case deadline', () => {
  // These two give the steps a deadline of their own. Under the default one (this test's timeout
  // less a fifth) a hung case spends 80% of its test's limit by design, whatever that limit is.
  it('fails a hung case at the step it hung on and still tears it down', async () => {
    const log: string[] = []
    const component = hangingComponent(log)
    const started = Date.now()
    await expect(
      runSteps(twoClicks, component.mount, new CallRecorder({}), null, HUNG_DEADLINE_MS),
    ).rejects.toThrow('"a step that never settles" hung at step 1 (click)')
    expect(Date.now() - started).toBeLessThan(1_000)
    expect(log).toEqual(['click', 'unmount', 'dispose'])
    // The hung step settling later runs no further step: the case is over.
    component.release()
    await settle()
    expect(log).toEqual(['click', 'unmount', 'dispose'])
  }, 1_500)

  it('keeps real time under a case that fakes the timers', async () => {
    const log: string[] = []
    const component = hangingComponent(log)
    await expect(
      runSteps(
        { ...twoClicks, fakeTimers: true },
        component.mount,
        new CallRecorder({}),
        null,
        HUNG_DEADLINE_MS,
      ),
    ).rejects.toThrow('hung at step 1 (click)')
    expect(log).toEqual(['click', 'unmount', 'dispose'])
  }, 1_500)

  it('counterexample: a case that settles runs every step and tears down once', async () => {
    const log: string[] = []
    const component = hangingComponent(log)
    const run = runSteps(twoClicks, component.mount, new CallRecorder({}))
    // Released before the deadline, the hung flush is just a slow one.
    setTimeout(() => component.release(), 100)
    const result = await run
    expect(result.snapshots).toHaveLength(3)
    expect(log).toEqual(['click', 'click', 'unmount', 'dispose'])
  }, 1_500)

  it("derives the deadline from the test's own timeout, counted from the test's start", () => {
    // 10 s less its fifth (a 60 s timeout keeps 5 s), less what the test has already used.
    const left = caseStepsDeadlineMs()
    expect(left).toBeGreaterThan(7_500)
    expect(left).toBeLessThanOrEqual(8_000)
  }, 10_000)

  it('runs the steps with no deadline when none is given', async () => {
    let ran = false
    await withinCaseDeadline(
      'no deadline',
      async () => {
        ran = true
      },
      null,
    )
    expect(ran).toBe(true)
  })
})

describe('the case teardown', () => {
  /** A component whose unmount throws, as one whose cleanup hits a bug does. */
  const brokenUnmount =
    (log: string[], error?: Error) =>
    async (container: HTMLElement): Promise<MountedCase> => {
      container.appendChild(document.createElement('p'))
      return {
        flush: settle,
        setProps: async () => undefined,
        setChildren: async () => undefined,
        location: () => '/',
        navigate: () => undefined,
        unmount: async () => {
          log.push('unmount')
          throw new Error('unmount broke')
        },
        dispose: async () => {
          log.push('dispose')
          if (error) throw error
        },
      }
    }

  it('still disposes the app and restores the clock when the unmount throws', async () => {
    const log: string[] = []
    await expect(
      runSteps(
        { name: 'a broken unmount', fakeTimers: true, interactions: [] },
        brokenUnmount(log),
        new CallRecorder({}),
      ),
    ).rejects.toThrow('unmount broke')
    expect(log).toEqual(['unmount', 'dispose'])
    expect(vi.isFakeTimers()).toBe(false)
    expect(document.body.innerHTML).toBe('')
  })

  it("reports the case's own failure first when its teardown fails too", async () => {
    const recorder = new CallRecorder({})
    const failure = runSteps(
      { name: 'both fail', interactions: [{ type: 'click', selector: 'nowhere' }] },
      brokenUnmount([]),
      recorder,
    )
    await expect(failure).rejects.toBeInstanceOf(AggregateError)
    await expect(failure).rejects.toThrow("(and the case's teardown failed too)")
  })

  it('reports every teardown failure when only the teardown fails', async () => {
    await expect(
      runSteps(
        { name: 'teardown only', interactions: [] },
        brokenUnmount([], new Error('dispose broke')),
        new CallRecorder({}),
      ),
    ).rejects.toThrow("conformance: the case's teardown failed")
  })
})
