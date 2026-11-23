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
      setChildren: async () => undefined,
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
            setChildren: async () => undefined,
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

/**
 * Mounts a fake component with one count kept per instance and one kept at module level (as a
 * chat store is), each shown and raised by a click on the paragraph.
 *
 * @param shared - The module-level count, shared by every instance.
 * @param shared.count - Its value.
 * @param log - Receives each lifecycle call of the fake app.
 * @param remountable - Whether the adapter supports a remount.
 * @returns The mount function {@link runSteps} takes.
 */
const countingComponent =
  (shared: { count: number }, log: string[], remountable = true) =>
  async (container: HTMLElement): Promise<MountedCase> => {
    let node: HTMLParagraphElement | null = null
    const show = (): void => {
      log.push('mount')
      let own = 0
      const p = document.createElement('p')
      const paint = (): void => {
        p.textContent = `own ${own} shared ${shared.count}`
      }
      p.addEventListener('click', () => {
        own += 1
        shared.count += 1
        paint()
      })
      paint()
      container.appendChild(p)
      node = p
    }
    show()
    return {
      flush: settle,
      setProps: async () => undefined,
      setChildren: async () => undefined,
      location: () => '/page',
      navigate: () => undefined,
      unmount: async () => {
        log.push('unmount')
        node?.remove()
        node = null
      },
      ...(remountable ? { remount: async () => show() } : {}),
      dispose: async () => {
        log.push('dispose')
      },
    }
  }

describe('remount step', () => {
  it('mounts the component again: module-level state carries over, its own state starts again', async () => {
    const recorder = new CallRecorder({})
    const log: string[] = []
    const result = await runSteps(
      {
        name: 'remount',
        interactions: [
          { type: 'click', selector: 'p' },
          { type: 'remount' },
          { type: 'click', selector: 'p' },
        ],
      },
      countingComponent({ count: 0 }, log),
      recorder,
    )
    expect(result.snapshots[1]).toContain('own 1 shared 1')
    expect(result.snapshots[2]).toContain('own 0 shared 1')
    expect(result.snapshots[2]).not.toContain('own 1')
    expect(result.snapshots[3]).toContain('own 1 shared 2')
    // A mounted component is unmounted first; the case's end unmounts the second mount once.
    expect(log).toEqual(['mount', 'unmount', 'mount', 'unmount', 'dispose'])
  })

  it('after an unmount step, mounts it again and later steps act on it', async () => {
    const recorder = new CallRecorder({})
    const log: string[] = []
    const result = await runSteps(
      {
        name: 'unmount then remount',
        interactions: [{ type: 'unmount' }, { type: 'remount' }, { type: 'click', selector: 'p' }],
      },
      countingComponent({ count: 4 }, log),
      recorder,
    )
    expect(result.snapshots[1]).not.toContain('own')
    expect(result.snapshots[2]).toContain('own 0 shared 4')
    expect(result.snapshots[3]).toContain('own 1 shared 5')
    expect(log).toEqual(['mount', 'unmount', 'mount', 'unmount', 'dispose'])
  })

  it('fails a remount on an adapter that cannot mount again', async () => {
    const recorder = new CallRecorder({})
    await expect(
      runSteps(
        { name: 'no remount', interactions: [{ type: 'remount' }] },
        countingComponent({ count: 0 }, [], false),
        recorder,
      ),
    ).rejects.toThrow('this adapter cannot remount a component')
  })
})
