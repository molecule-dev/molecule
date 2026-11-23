/**
 * The UI step runner's `invoke` step: a case calls a function the component handed to a
 * callback (a `register` prop that receives the component's `send`), as the host holding that
 * function would. The newest call's function is the one called, its result is awaited, and a
 * case that names a callback never called, or a path holding no function, is refused.
 *
 * A plain DOM "component" stands in for a framework here.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it } from 'vitest'

import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'

/**
 * Mounts a paragraph and hands the host a `{ send }` handle through `onReady`, once on mount
 * and again (with a new `send`) on every props change, as a component re-registering its
 * handle would.
 *
 * @param recorder - The case's recorder (its `onReady` spy is the host).
 * @returns The mount function {@link runSteps} takes.
 */
const handleComponent = (recorder: CallRecorder) => {
  const onReady = recorder.spy('onReady')
  let generation = 0
  return async (container: HTMLElement): Promise<MountedCase> => {
    const node = document.createElement('p')
    node.textContent = 'idle'
    container.appendChild(node)
    const register = (): void => {
      const mine = ++generation
      onReady({
        send: async (text: string) => {
          await Promise.resolve()
          node.textContent = `sent ${text} by ${mine}`
        },
        label: 'not a function',
      })
    }
    register()
    return {
      flush: settle,
      setProps: async () => register(),
      setChildren: async () => undefined,
      location: () => '/page',
      navigate: () => undefined,
      unmount: async () => node.remove(),
    }
  }
}

describe('invoke steps', () => {
  it('calls the function at the path with the args and awaits it before the snapshot', async () => {
    const recorder = new CallRecorder({})
    const testCase: UICase = {
      name: 'send through the handle',
      interactions: [{ type: 'invoke', callback: 'onReady', path: [0, 'send'], args: ['hi'] }],
    }
    const result = await runSteps(testCase, handleComponent(recorder), recorder)
    expect(result.snapshots[1]).toContain('sent hi by 1')
  })

  it('calls the function from the newest call of the callback', async () => {
    const recorder = new CallRecorder({})
    const testCase: UICase = {
      name: 'newest handle',
      interactions: [
        { type: 'props', props: { anything: true } },
        { type: 'invoke', callback: 'onReady', path: [0, 'send'], args: ['again'] },
      ],
    }
    const result = await runSteps(testCase, handleComponent(recorder), recorder)
    expect(result.snapshots[2]).toContain('sent again by 2')
  })

  it('refuses a callback that was never called', async () => {
    const recorder = new CallRecorder({})
    const testCase: UICase = {
      name: 'no call',
      interactions: [{ type: 'invoke', callback: 'onOther', path: [0] }],
    }
    await expect(runSteps(testCase, handleComponent(recorder), recorder)).rejects.toThrow(
      'onOther was never called, so it handed over nothing to invoke',
    )
  })

  it('refuses a path that holds no function', async () => {
    const recorder = new CallRecorder({})
    const testCase: UICase = {
      name: 'not a function',
      interactions: [{ type: 'invoke', callback: 'onReady', path: [0, 'label'] }],
    }
    await expect(runSteps(testCase, handleComponent(recorder), recorder)).rejects.toThrow(
      'the latest onReady call has no function at [0, label]',
    )
  })
})
