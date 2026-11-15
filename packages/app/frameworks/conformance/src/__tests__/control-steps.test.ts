/**
 * The UI step runner's `control` step and the modifier keys of a `keydown` step.
 *
 * `control` calls a control an area's fakes registered (a chat stream event
 * arriving, a run ending) through the case's full composition, so a feature case
 * can script what a service does from the other side. `keydown` carries every
 * modifier, so shortcut handlers (`Mod+K`, `Ctrl+Enter`) can be driven.
 *
 * A plain DOM "component" stands in for a framework here.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it } from 'vitest'

import { buildBindingServices } from '../bindings/services.js'
import {
  type AppServices,
  CallRecorder,
  type MountedCase,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

/**
 * Mounts a paragraph whose text the test's controls and key listener change.
 *
 * @param log - Receives each lifecycle call.
 * @returns The mount function {@link runSteps} takes, and the paragraph.
 */
const textComponent = (log: string[]) => {
  const node = document.createElement('p')
  node.textContent = 'idle'
  node.tabIndex = 0
  const onKey = (event: KeyboardEvent): void => {
    const held = (['metaKey', 'ctrlKey', 'altKey', 'shiftKey'] as const).filter((m) => event[m])
    node.textContent = `${event.key} ${held.join('+') || 'none'}`
  }
  const mount = async (container: HTMLElement): Promise<MountedCase> => {
    container.appendChild(node)
    document.addEventListener('keydown', onKey)
    return {
      flush: settle,
      setProps: async () => undefined,
      location: () => '/page',
      navigate: () => undefined,
      unmount: async () => {
        log.push('unmount')
        document.removeEventListener('keydown', onKey)
        node.remove()
      },
    }
  }
  return { mount, node }
}

/**
 * A case's full service set whose `control` writes into the paragraph.
 *
 * @param node - The paragraph the control writes.
 * @param log - Receives each control call.
 * @returns The services {@link runSteps} takes.
 */
const appWithControl = (node: HTMLElement, log: string[]): AppServices => {
  const harness = buildBindingServices({}, () => undefined)
  return {
    services: harness.services,
    controls: {
      answerHttp: harness.controls.answerHttp,
      setAuth: harness.controls.setAuth,
      control: async (name, args) => {
        log.push(`${name}(${JSON.stringify(args)})`)
        node.textContent = `${name} ${args.join(',')}`
      },
    },
    dispose: harness.controls.dispose,
  }
}

describe('control steps', () => {
  it('calls the named control with its args, and the snapshot after it shows the effect', async () => {
    const log: string[] = []
    const { mount, node } = textComponent(log)
    const testCase: UICase = {
      name: 'stream event',
      interactions: [
        { type: 'control', name: 'chat.emit', args: ['text', 'hi'] },
        { type: 'control', name: 'chat.finish' },
      ],
    }
    const result = await runSteps(testCase, mount, new CallRecorder({}), appWithControl(node, log))
    expect(log).toEqual(['chat.emit(["text","hi"])', 'chat.finish([])', 'unmount'])
    expect(result.snapshots[0]).toContain('idle')
    expect(result.snapshots[1]).toContain('chat.emit text,hi')
    expect(result.snapshots[2]).toContain('chat.finish')
  })

  it('still runs after unmount, as a stream that ends after the page was left', async () => {
    const log: string[] = []
    const { mount, node } = textComponent(log)
    const testCase: UICase = {
      name: 'late finish',
      interactions: [{ type: 'unmount' }, { type: 'control', name: 'chat.finish' }],
    }
    await runSteps(testCase, mount, new CallRecorder({}), appWithControl(node, log))
    expect(log).toEqual(['unmount', 'chat.finish([])'])
  })

  it('refuses a control step without the full composition', async () => {
    const { mount } = textComponent([])
    const testCase: UICase = {
      name: 'no app',
      interactions: [{ type: 'control', name: 'chat.finish' }],
    }
    await expect(runSteps(testCase, mount, new CallRecorder({}))).rejects.toThrow(
      "a control step needs the full composition (the feature's composition: 'app')",
    )
  })

  it("names a control no area registered (the composition's real control)", async () => {
    const { mount } = textComponent([])
    const harness = buildBindingServices({}, () => undefined)
    const app: AppServices = {
      services: harness.services,
      controls: {
        answerHttp: harness.controls.answerHttp,
        setAuth: harness.controls.setAuth,
        control: harness.controls.control,
      },
      dispose: harness.controls.dispose,
    }
    const testCase: UICase = {
      name: 'unknown control',
      interactions: [{ type: 'control', name: 'nothing.here' }],
    }
    await expect(runSteps(testCase, mount, new CallRecorder({}), app)).rejects.toThrow(
      'no area registered the control nothing.here',
    )
  })
})

describe('keydown modifiers', () => {
  it('carries meta, ctrl, alt and shift to a document listener', async () => {
    const { mount } = textComponent([])
    const testCase: UICase = {
      name: 'shortcuts',
      interactions: [
        { type: 'keydown', selector: 'p', key: 'k', metaKey: true },
        { type: 'keydown', selector: 'p', key: 'Enter', ctrlKey: true, shiftKey: true },
        { type: 'keydown', selector: 'p', key: 'x', altKey: true },
        { type: 'keydown', selector: 'p', key: 'Escape' },
      ],
    }
    const result = await runSteps(testCase, mount, new CallRecorder({}))
    expect(result.snapshots[1]).toContain('k metaKey')
    expect(result.snapshots[2]).toContain('Enter ctrlKey+shiftKey')
    expect(result.snapshots[3]).toContain('x altKey')
    expect(result.snapshots[4]).toContain('Escape none')
  })
})
