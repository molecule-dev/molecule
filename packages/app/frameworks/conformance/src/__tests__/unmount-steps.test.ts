/**
 * The UI step runner's `unmount` and `fetch` steps: a case can leave the page
 * while a request the component started is still held, then answer it, and the
 * recorded calls show whether the late answer still reached a callback.
 *
 * A plain DOM "component" stands in for a framework here: it starts a `fetch`
 * on mount and calls `onDone` with the answer. One version checks whether it is
 * still mounted (React's behavior); the other does not, which is the bug class
 * these steps exist to catch.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it } from 'vitest'

import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'

/**
 * Mounts a fake component that fetches on mount and reports the answer.
 *
 * @param recorder - Where `onDone` is recorded.
 * @param guarded - Whether the report checks that the component is still mounted.
 * @param log - Receives each lifecycle call of the fake app.
 * @returns The mount function {@link runSteps} takes.
 */
const fetchingComponent =
  (recorder: CallRecorder, guarded: boolean, log: string[]) =>
  async (container: HTMLElement): Promise<MountedCase> => {
    const onDone = recorder.spy('onDone')
    let mounted = true
    const node = document.createElement('p')
    node.textContent = 'loading'
    container.appendChild(node)
    void fetch('/api/thing')
      .then((response) => response.json())
      .then((body: unknown) => {
        if (guarded && !mounted) return
        onDone(body)
      })
    return {
      // Every adapter's flush drains the promise chains a step started.
      flush: settle,
      setProps: async () => undefined,
      location: () => '/page',
      navigate: () => undefined,
      unmount: async () => {
        log.push('unmount')
        mounted = false
        node.remove()
      },
      dispose: async () => {
        log.push('dispose')
      },
    }
  }

const lateAnswer: UICase = {
  name: 'answer after leaving',
  context: { window: { fetch: { status: 200, body: { ok: true }, defer: true } } },
  interactions: [{ type: 'unmount' }, { type: 'fetch' }],
}

describe('unmount and fetch steps', () => {
  it('records nothing for a component that stops reporting once unmounted', async () => {
    const recorder = new CallRecorder({})
    const log: string[] = []
    const result = await runSteps(lateAnswer, fetchingComponent(recorder, true, log), recorder)
    expect(result.calls.map((call) => call.name)).toEqual(['fetch'])
    // The case's own end does not unmount a second time, and the app is disposed once.
    expect(log).toEqual(['unmount', 'dispose'])
    // After the unmount the page is empty, and keeps the route the component last saw.
    expect(result.snapshots[1]).not.toContain('loading')
    expect(result.snapshots[1]).toContain('@route /page')
  })

  it('counterexample: a late report after unmount is recorded, so the case fails it', async () => {
    const recorder = new CallRecorder({})
    const result = await runSteps(lateAnswer, fetchingComponent(recorder, false, []), recorder)
    expect(result.calls.map((call) => call.name)).toEqual(['fetch', 'onDone'])
  })

  it('a held request answered while mounted reaches the callback', async () => {
    const recorder = new CallRecorder({})
    const log: string[] = []
    const result = await runSteps(
      { ...lateAnswer, interactions: [{ type: 'fetch' }] },
      fetchingComponent(recorder, true, log),
      recorder,
    )
    expect(result.calls.map((call) => call.name)).toEqual(['fetch', 'onDone'])
    expect(log).toEqual(['unmount', 'dispose'])
  })

  it('refuses a step that needs the component after it unmounted', async () => {
    const recorder = new CallRecorder({})
    await expect(
      runSteps(
        { ...lateAnswer, interactions: [{ type: 'unmount' }, { type: 'click', selector: 'p' }] },
        fetchingComponent(recorder, true, []),
        recorder,
      ),
    ).rejects.toThrow('a click step after unmount has no component to act on')
  })

  it('refuses a fetch step when no request is held', async () => {
    const recorder = new CallRecorder({})
    await expect(
      runSteps(
        { name: 'nothing held', interactions: [{ type: 'fetch' }] },
        async (container) => {
          container.appendChild(document.createElement('p'))
          return {
            flush: async () => undefined,
            setProps: async () => undefined,
            location: () => '/',
            navigate: () => undefined,
            unmount: async () => undefined,
          }
        },
        recorder,
      ),
    ).rejects.toThrow('a fetch step found no request waiting')
  })
})
