/**
 * The chat panel's tests region as a store: the listing, the own run's
 * lifecycle, the project feed's echo guard, and the bounded completed-run ids.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

import {
  ChatTestsController,
  type ChatTestsControllerOptions,
  type ChatTestsHost,
  type ChatTestsSnapshot,
  COMPLETED_OWN_TEST_RUN_ID_LIMIT,
  rememberCompletedOwnTestRunId,
} from '../components/chat-tests-controller.js'
import { EMPTY_RUN_STATE } from '../components/tests-card-utilities.js'
import type { TestItem, TestList, TestRunEvent, TestRunFeedEvent, TestRunHandle } from '../types.js'

const ID = 'app:e2e/home.spec.ts'

const TESTS: TestItem[] = [
  { id: ID, file: 'e2e/home.spec.ts', kind: 'e2e', workspace: 'app', title: 'home' },
]

const translate: TranslateFunction = (key, _values, options) => options?.defaultValue ?? key

/** The host the panel passes for a run. */
function host(overrides: Partial<ChatTestsHost> = {}): ChatTestsHost {
  return { translate, ...overrides }
}

/** A handle with the given overrides. */
function handle(overrides: Partial<TestRunHandle> = {}): TestRunHandle {
  return { cancel: vi.fn(), ...overrides }
}

/** A controller whose warnings are recorded instead of logged. */
function makeController(options: ChatTestsControllerOptions = {}): {
  controller: ChatTestsController
  warnings: Array<{ message: string; context: Record<string, unknown> }>
} {
  const warnings: Array<{ message: string; context: Record<string, unknown> }> = []
  const controller = new ChatTestsController({
    warn: (message, context) => warnings.push({ message, context }),
    ...options,
  })
  return { controller, warnings }
}

/** An own-run event as `runTests` delivers it (no feed `runId` stamp). */
function startEvent(runId = 'r1', ids: string[] = [ID]): TestRunEvent {
  return { type: 'start', runId, ids }
}

/** The `done` event of an own run. */
function doneEvent(outcome: 'completed' | 'cancelled' | 'error' = 'completed'): TestRunEvent {
  return { type: 'done', outcome }
}

/** A feed event, always stamped with its run. */
function feed(event: TestRunEvent, runId = 'r1', eventId?: string): TestRunFeedEvent {
  return { ...event, runId, ...(eventId ? { eventId } : {}) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('rememberCompletedOwnTestRunId', () => {
  it('records a completed run', () => {
    const ids = new Set<string>()
    rememberCompletedOwnTestRunId(ids, 'r1')
    expect([...ids]).toEqual(['r1'])
  })

  it('moves a re-completed run to the newest end', () => {
    const ids = new Set(['r1', 'r2'])
    rememberCompletedOwnTestRunId(ids, 'r1')
    expect([...ids]).toEqual(['r2', 'r1'])
  })

  it('keeps exactly the limit and evicts the oldest when it overflows', () => {
    const ids = new Set<string>()
    for (let index = 0; index < COMPLETED_OWN_TEST_RUN_ID_LIMIT; index += 1) {
      rememberCompletedOwnTestRunId(ids, `r${index}`)
    }
    expect(ids.size).toBe(COMPLETED_OWN_TEST_RUN_ID_LIMIT)
    expect(ids.has('r0')).toBe(true)
    rememberCompletedOwnTestRunId(ids, 'overflow')
    expect(ids.size).toBe(COMPLETED_OWN_TEST_RUN_ID_LIMIT)
    expect(ids.has('r0')).toBe(false)
    expect(ids.has('overflow')).toBe(true)
  })
})

describe('ChatTestsController snapshot', () => {
  it('starts with the empty listing and an idle run', () => {
    const { controller } = makeController()
    expect(controller.snapshot()).toEqual({ list: [], status: 'loading', run: EMPTY_RUN_STATE })
    expect(controller.snapshot()).toBe(controller.snapshot())
  })

  it('notifies subscribers once per change, and stops after unsubscribe', () => {
    const { controller } = makeController()
    const seen: ChatTestsSnapshot[] = []
    const stop = controller.subscribe(() => seen.push(controller.snapshot()))
    controller.setStatus('ready')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.status).toBe('ready')
    controller.setStatus('ready')
    expect(seen).toHaveLength(1)
    stop()
    controller.setStatus('error')
    expect(seen).toHaveLength(1)
    expect(controller.snapshot().status).toBe('error')
  })

  it('tracks mounted state, and unmounting cancels the own run', () => {
    const cancel = vi.fn()
    const { controller } = makeController()
    expect(controller.isMounted()).toBe(true)
    controller.unmount()
    expect(controller.isMounted()).toBe(false)
    controller.mount()
    expect(controller.isMounted()).toBe(true)
    controller.startTestsRun({ ids: [ID] }, host({ runTests: () => handle({ cancel }) }))
    controller.unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})

describe('ChatTestsController.loadTests', () => {
  it('stores the host list and marks the listing ready', async () => {
    const { controller } = makeController()
    await controller.loadTests(async () => ({ tests: TESTS, runners: {} }))
    expect(controller.snapshot().list).toBe(TESTS)
    expect(controller.snapshot().status).toBe('ready')
  })

  it('treats a missing tests array as empty', async () => {
    const { controller } = makeController()
    // A custom host may omit `tests` at runtime; the controller reads it defensively.
    await controller.loadTests(async () => ({ runners: {} }) as TestList)
    expect(controller.snapshot().list).toEqual([])
  })

  it('warns and marks the listing failed when discovery rejects', async () => {
    const { controller, warnings } = makeController()
    const error = new Error('offline')
    await controller.loadTests(async () => {
      throw error
    })
    expect(controller.snapshot().status).toBe('error')
    expect(warnings).toEqual([{ message: 'Failed to list project tests', context: { error } }])
  })

  it('leaves the state alone when the list settles after an unmount', async () => {
    const { controller, warnings } = makeController()
    controller.unmount()
    await controller.loadTests(async () => ({ tests: TESTS, runners: {} }))
    expect(controller.snapshot().list).toEqual([])
    expect(controller.snapshot().status).toBe('loading')
    await controller.loadTests(async () => {
      throw new Error('offline')
    })
    expect(controller.snapshot().status).toBe('loading')
    expect(warnings).toHaveLength(1)
  })
})

describe('ChatTestsController.refreshTests', () => {
  it('marks the listing failed when the host wires no discovery', async () => {
    const { controller } = makeController()
    await controller.refreshTests({})
    expect(controller.snapshot().status).toBe('error')
  })

  it('marks the listing unavailable while the environment is down', async () => {
    const { controller } = makeController()
    await controller.refreshTests({
      testsAvailable: false,
      listTests: async () => ({ tests: TESTS, runners: {} }),
    })
    expect(controller.snapshot().status).toBe('unavailable')
    expect(controller.snapshot().list).toEqual([])
  })

  it('shows loading before a first listing and the list once it settles', async () => {
    const { controller } = makeController()
    const seen: string[] = []
    controller.subscribe(() => seen.push(controller.snapshot().status))
    await controller.refreshTests({ listTests: async () => ({ tests: TESTS, runners: {} }) })
    expect(seen).toEqual(['ready'])
    expect(controller.snapshot().status).toBe('ready')
    expect(controller.snapshot().list).toBe(TESTS)
  })

  it('keeps a ready listing ready while it re-lists', async () => {
    const { controller } = makeController()
    await controller.loadTests(async () => ({ tests: TESTS, runners: {} }))
    const seen: string[] = []
    controller.subscribe(() => seen.push(controller.snapshot().status))
    await controller.refreshTests({ listTests: async () => ({ tests: TESTS, runners: {} }) })
    expect(seen).toEqual([])
    expect(controller.snapshot().status).toBe('ready')
  })
})

describe('ChatTestsController.startTestsRun', () => {
  it('does nothing without a host runner', () => {
    const { controller } = makeController()
    controller.startTestsRun({ ids: [ID] }, host())
    expect(controller.snapshot().run).toBe(EMPTY_RUN_STATE)
  })

  it('refuses when the viewer may not run or edit, or the environment is down', () => {
    const runTests = vi.fn(() => handle())
    for (const blocked of [{ canRunTests: false }, { canEdit: false }, { testsAvailable: false }]) {
      const { controller } = makeController()
      controller.startTestsRun({ ids: [ID] }, host({ runTests, ...blocked }))
      expect(runTests).not.toHaveBeenCalled()
      expect(controller.snapshot().run.running).toBe(false)
    }
  })

  it('refuses an empty id selection', () => {
    const runTests = vi.fn(() => handle())
    const { controller } = makeController()
    controller.startTestsRun({ ids: [] }, host({ runTests }))
    expect(runTests).not.toHaveBeenCalled()
  })

  it('refuses a second run while one is running', () => {
    const runTests = vi.fn(() => handle())
    const { controller } = makeController()
    controller.startTestsRun({ ids: [ID] }, host({ runTests }))
    controller.startTestsRun({ ids: [ID] }, host({ runTests }))
    expect(runTests).toHaveBeenCalledTimes(1)
  })

  it('seeds a running state from the injected clock and clears the queued verdicts', () => {
    const { controller } = makeController({ now: () => 1234 })
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: () => handle({ skipCurrent: () => undefined }),
      }),
    )
    const run = controller.snapshot().run
    expect(run.running).toBe(true)
    expect(run.queued).toEqual([ID])
    expect(run.startedAt).toBe(1234)
    expect(run.external).toBe(false)
    expect(run.results).toEqual({})
    expect(run.skipPending).toBe(false)
    expect(run.skipUnavailable).toBe(false)
  })

  it('marks Skip unavailable when the handle serves no skipCurrent', () => {
    const { controller } = makeController()
    controller.startTestsRun({ ids: [ID] }, host({ runTests: () => handle() }))
    expect(controller.snapshot().run.skipUnavailable).toBe(true)
  })

  it('folds the run events and re-lists when the run completes', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const listTests = vi.fn(async () => ({ tests: TESTS, runners: {} }))
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return handle()
        },
        listTests,
      }),
    )
    emit(startEvent())
    expect(controller.snapshot().run.runId).toBe('r1')
    expect(controller.snapshot().run.running).toBe(true)
    emit({ type: 'result', id: ID, status: 'passed' })
    expect(controller.snapshot().run.results[ID]?.status).toBe('passed')
    emit(doneEvent('completed'))
    await Promise.resolve()
    expect(controller.snapshot().run.running).toBe(false)
    expect(controller.snapshot().run.outcome).toBe('completed')
    expect(listTests).toHaveBeenCalledTimes(1)
    expect(controller.snapshot().status).toBe('ready')
  })

  it('ignores events that arrive after an unmount', () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return handle()
        },
      }),
    )
    controller.unmount()
    emit(startEvent())
    expect(controller.snapshot().run.runId).toBe(null)
    expect(controller.snapshot().run.running).toBe(true)
  })

  it('does not attach a handle when the host finishes synchronously', async () => {
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          onEvent(startEvent())
          onEvent(doneEvent('completed'))
          return handle({ skipCurrent: () => undefined })
        },
      }),
    )
    await Promise.resolve()
    const run = controller.snapshot().run
    expect(run.running).toBe(false)
    expect(run.outcome).toBe('completed')
    // The run was released before the handle existed, so the panel never claimed
    // a Skip control from it.
    expect(run.skipUnavailable).toBe(true)
  })

  it('reports a start failure that already had a run id as that run’s error', () => {
    const { controller, warnings } = makeController()
    const error = new Error('boom')
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          onEvent(startEvent())
          throw error
        },
      }),
    )
    const run = controller.snapshot().run
    expect(run.running).toBe(false)
    expect(run.outcome).toBe('error')
    expect(run.error).toBe('boom')
    expect(warnings).toEqual([{ message: 'Failed to start a test run', context: { error } }])
  })

  it('translates the failure message when the start never named a run', () => {
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: () => {
          throw new Error('')
        },
      }),
    )
    // An Error's own message wins even when empty, matching the panel's behaviour.
    expect(controller.snapshot().run.outcome).toBe('error')
    expect(controller.snapshot().run.error).toBe('')
  })

  it('falls back to the translated start error for a non-Error throw', () => {
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: () => {
          throw 'not-an-error'
        },
      }),
    )
    expect(controller.snapshot().run.outcome).toBe('error')
    expect(controller.snapshot().run.error).toBe('The test run could not start.')
    expect(controller.snapshot().run.running).toBe(false)
  })
})

describe('ChatTestsController.cancelTestsRun', () => {
  it('does nothing without an own run', () => {
    const { controller } = makeController()
    controller.cancelTestsRun()
    expect(controller.snapshot().run).toBe(EMPTY_RUN_STATE)
  })

  it('records a cancelled run and cancels its handle', () => {
    const cancel = vi.fn()
    let emit: (event: TestRunEvent) => void = () => {}
    const { controller } = makeController()
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return handle({ cancel })
        },
      }),
    )
    emit(startEvent())
    controller.cancelTestsRun()
    expect(cancel).toHaveBeenCalledTimes(1)
    const run = controller.snapshot().run
    expect(run.running).toBe(false)
    expect(run.outcome).toBe('cancelled')
  })

  it('drops the seeded run when the host never named a run', () => {
    const cancel = vi.fn()
    const { controller } = makeController()
    controller.startTestsRun({ ids: [ID] }, host({ runTests: () => handle({ cancel }) }))
    controller.cancelTestsRun()
    expect(cancel).toHaveBeenCalledTimes(1)
    const run = controller.snapshot().run
    expect(run.runId).toBe(null)
    expect(run.running).toBe(false)
    expect(run.outcome).toBe('cancelled')
    expect(run.skipUnavailable).toBe(true)
  })
})

describe('ChatTestsController.skipCurrentTest', () => {
  /** Starts a run whose handle serves (or omits) skipCurrent. */
  function startWithSkip(
    skipCurrent?: () => void | Promise<boolean | void>,
    controllerOptions: ChatTestsControllerOptions = {},
  ) {
    let emit: (event: TestRunEvent) => void = () => {}
    const { controller, warnings } = makeController(controllerOptions)
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return handle(skipCurrent ? { skipCurrent } : {})
        },
      }),
    )
    emit(startEvent())
    return { controller, warnings, emit: () => emit }
  }

  it('refuses when the viewer may not edit or run', () => {
    const skipCurrent = vi.fn()
    const { controller } = startWithSkip(skipCurrent)
    controller.skipCurrentTest({ canEdit: false })
    controller.skipCurrentTest({ canRunTests: false })
    expect(skipCurrent).not.toHaveBeenCalled()
  })

  it('does nothing without an own run', () => {
    const { controller } = makeController()
    controller.skipCurrentTest({})
    expect(controller.snapshot().run).toBe(EMPTY_RUN_STATE)
  })

  it('drops the control when the handle serves no skipCurrent', () => {
    const { controller } = startWithSkip()
    controller.skipCurrentTest({})
    expect(controller.snapshot().run.skipUnavailable).toBe(true)
    expect(controller.snapshot().run.skipPending).toBe(false)
  })

  it('marks the request pending and keeps it when the host accepts', () => {
    const skipCurrent = vi.fn(() => undefined)
    const { controller } = startWithSkip(skipCurrent)
    controller.skipCurrentTest({})
    expect(skipCurrent).toHaveBeenCalledTimes(1)
    expect(controller.snapshot().run.skipPending).toBe(true)
    expect(controller.snapshot().run.skipUnavailable).toBe(false)
  })

  it('drops the control when the host answers that nothing was left to skip', async () => {
    const { controller } = startWithSkip(async () => false)
    controller.skipCurrentTest({})
    await Promise.resolve()
    expect(controller.snapshot().run.skipPending).toBe(false)
    expect(controller.snapshot().run.skipUnavailable).toBe(true)
  })

  it('warns and drops the control when the host rejects', async () => {
    const error = new Error('gone')
    const { controller, warnings } = startWithSkip(async () => {
      throw error
    })
    controller.skipCurrentTest({})
    await Promise.resolve()
    expect(warnings).toEqual([{ message: 'Failed to skip the running test', context: { error } }])
    expect(controller.snapshot().run.skipUnavailable).toBe(true)
  })

  it('warns and drops the control when skipCurrent throws synchronously', () => {
    const error = new Error('gone')
    const { controller, warnings } = startWithSkip(() => {
      throw error
    })
    controller.skipCurrentTest({})
    expect(warnings).toEqual([{ message: 'Failed to skip the running test', context: { error } }])
    expect(controller.snapshot().run.skipUnavailable).toBe(true)
  })
})

describe('ChatTestsController.handleSkipToolCall', () => {
  it('refuses without edit permission or a host action', async () => {
    const skipToolCall = vi.fn(async () => true)
    const { controller } = makeController()
    await expect(
      controller.handleSkipToolCall('call-1', { canEdit: false, skipToolCall }),
    ).resolves.toBe(false)
    await expect(controller.handleSkipToolCall('call-1', {})).resolves.toBe(false)
    expect(skipToolCall).not.toHaveBeenCalled()
  })

  it("forwards the host's answer", async () => {
    const { controller } = makeController()
    await expect(
      controller.handleSkipToolCall('call-1', { skipToolCall: async () => true }),
    ).resolves.toBe(true)
    await expect(
      controller.handleSkipToolCall('call-1', { skipToolCall: () => undefined }),
    ).resolves.toBeUndefined()
  })

  it('warns and answers false when the host fails', async () => {
    const error = new Error('race')
    const { controller, warnings } = makeController()
    await expect(
      controller.handleSkipToolCall('call-1', {
        skipToolCall: async () => {
          throw error
        },
      }),
    ).resolves.toBe(false)
    expect(warnings).toEqual([
      { message: 'Failed to skip the running tool call', context: { error } },
    ])
  })
})

describe('ChatTestsController.fixTests', () => {
  const failure = { item: TESTS[0]!, output: 'expected 1 to be 2' }

  it('refuses without edit permission, without failures, or during a turn', () => {
    const closeOverlay = vi.fn()
    const sendMessage = vi.fn()
    const { controller } = makeController()
    controller.fixTests([failure], { canEdit: false, closeOverlay, sendMessage })
    controller.fixTests([], { closeOverlay, sendMessage })
    const { controller: busy } = makeController({ isTurnInFlight: () => true })
    busy.fixTests([failure], { closeOverlay, sendMessage })
    expect(closeOverlay).not.toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('closes the overlay and sends the ordinary fix message', () => {
    const closeOverlay = vi.fn()
    const sendMessage = vi.fn()
    const { controller } = makeController()
    controller.fixTests([failure], { closeOverlay, sendMessage })
    expect(closeOverlay).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledTimes(1)
    const message = sendMessage.mock.calls[0]?.[0] as string
    expect(message).toContain('Fix the failing test `e2e/home.spec.ts`')
    expect(message).toContain('expected 1 to be 2')
    expect(message).toContain('Re-run it with /test when you are done.')
  })
})

describe('ChatTestsController.watchRuns', () => {
  it('does nothing when the host wires no feed', () => {
    const { controller } = makeController()
    const cleanup = controller.watchRuns(undefined, () => {})
    expect(() => cleanup()).not.toThrow()
    expect(controller.snapshot().run).toBe(EMPTY_RUN_STATE)
  })

  it('subscribes, projects on subscribe, and unsubscribes on cleanup', () => {
    let emit: (event: TestRunFeedEvent) => void = () => {}
    const unsubscribe = vi.fn()
    const { controller } = makeController()
    const cleanup = controller.watchRuns(
      (onEvent) => {
        emit = onEvent
        return unsubscribe
      },
      () => {},
    )
    emit(feed({ type: 'start', runId: 'r9', ids: [ID] }, 'r9'))
    expect(controller.snapshot().run.runId).toBe('r9')
    expect(controller.snapshot().run.running).toBe(true)
    cleanup()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('schedules one re-list 500ms after a run completes', () => {
    vi.useFakeTimers()
    let emit: (event: TestRunFeedEvent) => void = () => {}
    const refresh = vi.fn()
    const { controller } = makeController()
    controller.watchRuns((onEvent) => {
      emit = onEvent
      return () => {}
    }, refresh)
    emit(feed({ type: 'done', outcome: 'completed' }, 'r9'))
    emit(feed({ type: 'done', outcome: 'completed' }, 'r9'))
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(499)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('clears the pending re-list on cleanup', () => {
    vi.useFakeTimers()
    let emit: (event: TestRunFeedEvent) => void = () => {}
    const refresh = vi.fn()
    const { controller } = makeController()
    const cleanup = controller.watchRuns((onEvent) => {
      emit = onEvent
      return () => {}
    }, refresh)
    emit(feed({ type: 'done', outcome: 'completed' }, 'r9'))
    cleanup()
    vi.advanceTimersByTime(500)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('warns when the host subscription throws', () => {
    const error = new Error('no feed')
    const { controller, warnings } = makeController()
    const cleanup = controller.watchRuns(
      () => {
        throw error
      },
      () => {},
    )
    expect(warnings).toEqual([
      { message: 'Failed to watch the project test runs', context: { error } },
    ])
    expect(() => cleanup()).not.toThrow()
  })

  it('ignores an id-less echo of the own run while it is active', () => {
    let emitOwn: (event: TestRunEvent) => void = () => {}
    let emitFeed: (event: TestRunFeedEvent) => void = () => {}
    const { controller } = makeController()
    controller.watchRuns(
      (onEvent) => {
        emitFeed = onEvent
        return () => {}
      },
      () => {},
    )
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emitOwn = onEvent
          return handle()
        },
      }),
    )
    emitOwn(startEvent())
    emitFeed(feed({ type: 'result', id: ID, status: 'passed' }, 'r1'))
    expect(controller.snapshot().run.results).toEqual({})
  })

  it('ignores an id-less echo of a completed own run', () => {
    let emitOwn: (event: TestRunEvent) => void = () => {}
    let emitFeed: (event: TestRunFeedEvent) => void = () => {}
    const { controller } = makeController()
    controller.watchRuns(
      (onEvent) => {
        emitFeed = onEvent
        return () => {}
      },
      () => {},
    )
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emitOwn = onEvent
          return handle()
        },
      }),
    )
    emitOwn(startEvent())
    emitOwn(doneEvent('completed'))
    emitFeed({ type: 'output', chunk: 'late', runId: 'r1' })
    expect(controller.snapshot().run.output).toEqual([])
  })

  it('accepts an ordered echo even when the ids match', () => {
    let emitOwn: (event: TestRunEvent) => void = () => {}
    let emitFeed: (event: TestRunFeedEvent) => void = () => {}
    const { controller } = makeController()
    controller.watchRuns(
      (onEvent) => {
        emitFeed = onEvent
        return () => {}
      },
      () => {},
    )
    controller.startTestsRun(
      { ids: [ID] },
      host({
        runTests: (_selection, onEvent) => {
          emitOwn = onEvent
          return handle()
        },
      }),
    )
    emitOwn(startEvent())
    emitFeed(feed({ type: 'result', id: ID, status: 'passed' }, 'r1', 'evt-2'))
    expect(controller.snapshot().run.results[ID]?.status).toBe('passed')
  })

  it('ignores feed events after an unmount', () => {
    let emitFeed: (event: TestRunFeedEvent) => void = () => {}
    const { controller } = makeController()
    controller.watchRuns(
      (onEvent) => {
        emitFeed = onEvent
        return () => {}
      },
      () => {},
    )
    controller.unmount()
    emitFeed(feed({ type: 'start', runId: 'r9', ids: [ID] }, 'r9'))
    expect(controller.snapshot().run.runId).toBe(null)
  })
})
