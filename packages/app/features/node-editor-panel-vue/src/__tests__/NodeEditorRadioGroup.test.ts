// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NodeEditorRadioGroup` — a port of
 * `@molecule/app-node-editor-panel-react/src/__tests__/NodeEditorRadioGroup.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup and native radio behaviour the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, createCommentVNode, defineComponent, Fragment, h, type VNode } from 'vue'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorRadioGroup } from '../NodeEditorRadioGroup.js'
import type { NodeEditorRadioGroupProps } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns an empty style object, every other property/method
 * access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      if (prop === 'sp') return () => ({})
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

const OPTIONS = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
]

/** Host elements mounted so far, torn down after each test. */
const mounted: Array<{ host: HTMLElement; app: ReturnType<typeof createApp> }> = []

/**
 * Mounts a {@link NodeEditorRadioGroup} with the given props.
 *
 * @param props - The component props.
 * @returns The host element the component rendered into.
 */
function render(props: NodeEditorRadioGroupProps<string>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: (): VNode => h(NodeEditorRadioGroup, props) }))
  app.mount(host)
  mounted.push({ host, app })
  return host
}

/** Queries one element, failing the test when it is absent. */
function query(host: HTMLElement, selector: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  for (const { host, app } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
})

describe('<NodeEditorRadioGroup>', () => {
  it('renders a radio group with one checked native radio per option', () => {
    const host = render({ value: 'structured', onChange: () => {}, options: OPTIONS })
    expect(host.querySelector('[role="radiogroup"]')).toBeTruthy()
    const radios = Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    expect(radios).toHaveLength(3)
    // One shared name makes them one group: the browser's arrow keys move between them.
    expect(new Set(radios.map((r) => r.name)).size).toBe(1)
    expect(query(host, 'input[value="structured"]')).toHaveProperty('checked', true)
    expect(query(host, 'input[value="conversational"]')).toHaveProperty('checked', false)
    expect(
      query(host, 'input[value="hybrid"]').closest('[data-mol-id="node-editor-radio-hybrid"]'),
    ).toBeTruthy()
  })

  it('clicking an option tile selects it', () => {
    const onChange = vi.fn<(value: string) => void>()
    const host = render({ value: 'structured', onChange, options: OPTIONS })
    query(host, '[data-mol-id="node-editor-radio-hybrid"]').click()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('hybrid')
  })

  it('choosing a radio (keyboard or assistive technology) selects that option', () => {
    const onChange = vi.fn<(value: string) => void>()
    const host = render({ value: 'structured', onChange, options: OPTIONS })
    query(host, 'input[value="conversational"]').click()
    expect(onChange).toHaveBeenCalledWith('conversational')
  })

  it('the ring is decoration, hidden from assistive technology', () => {
    const host = render({ value: 'structured', onChange: () => {}, options: OPTIONS })
    const tile = query(host, '[data-mol-id="node-editor-radio-structured"]')
    expect(tile.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it('renders every part of a node-valued option label and skips a false v-if branch', () => {
    const label = h(Fragment, null, [
      h('b', null, 'Hy'),
      createCommentVNode('v-if', true),
      h('b', null, 'brid'),
    ])
    const host = render({
      value: 'hybrid',
      onChange: () => {},
      options: [{ value: 'hybrid', label }],
    })
    const tile = query(host, '[data-mol-id="node-editor-radio-hybrid"]')
    expect(tile.querySelector('span')!.innerHTML).toBe('<b>Hy</b><b>brid</b>')
  })
})
