// @vitest-environment jsdom
/**
 * Accessible-naming tests for the Solid `NodeEditorSlider` and
 * `NodeEditorToggle` — ports of
 * `@molecule/app-node-editor-panel-react/src/__tests__/NodeEditorLabeling.test.tsx`:
 * the range input is named by the section's `<label for>`, and the switch is
 * named by its title paragraph (`aria-labelledby`) or an explicit `ariaLabel`,
 * and described by its subtitle (`aria-describedby`).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorSlider } from '../NodeEditorSlider.jsx'
import { NodeEditorToggle } from '../NodeEditorToggle.jsx'

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

/** Disposers of the renders mounted so far, torn down after each test. */
const disposers: Array<() => void> = []

/**
 * Renders a component with the given props.
 *
 * @param view - A function returning the component's JSX.
 * @returns The host element the component rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** Queries one element, failing the test when it is absent. */
function query(host: HTMLElement, selector: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

/**
 * The text of the element an id names.
 *
 * @param host - The rendered tree.
 * @param id - The id the ARIA attribute carries.
 * @returns The referenced element's text.
 */
function textOfId(host: HTMLElement, id: string): string | null {
  return query(host, `[id="${id}"]`).textContent
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('<NodeEditorSlider>', () => {
  it('the label names the range input', () => {
    const host = mount(() => (
      <NodeEditorSlider label="Temperature" value={0.7} onChange={() => {}} />
    ))
    const label = query(host, 'label')
    const input = query(host, 'input[type="range"]')
    expect(label.getAttribute('for')).toBe(input.id)
    expect(label.getAttribute('for')).not.toBe('')
    expect(label.textContent).toBe('Temperature')
  })

  it('a string value display is announced as the value text', () => {
    const host = mount(() => (
      <NodeEditorSlider label="Temperature" value={0.7} onChange={() => {}} valueDisplay="70%" />
    ))
    expect(query(host, 'input[type="range"]').getAttribute('aria-valuetext')).toBe('70%')
  })

  it('a node value display sets no value text', () => {
    const host = mount(() => (
      <NodeEditorSlider
        label="Temperature"
        value={0.7}
        onChange={() => {}}
        valueDisplay={<em>70%</em>}
      />
    ))
    expect(query(host, 'input[type="range"]').hasAttribute('aria-valuetext')).toBe(false)
  })
})

describe('<NodeEditorToggle>', () => {
  it('the switch is named by the title', () => {
    const host = mount(() => (
      <NodeEditorToggle title="Knowledge Base" checked={false} onChange={() => {}} />
    ))
    const button = query(host, 'button[role="switch"]')
    const labelledBy = button.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(textOfId(host, labelledBy!)).toBe('Knowledge Base')
  })

  it('an aria label overrides the title as the name', () => {
    const host = mount(() => (
      <NodeEditorToggle
        title="Knowledge Base"
        ariaLabel="Toggle knowledge base"
        checked={false}
        onChange={() => {}}
      />
    ))
    const button = query(host, 'button[role="switch"]')
    expect(button.getAttribute('aria-label')).toBe('Toggle knowledge base')
    expect(button.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('the subtitle describes the switch', () => {
    const host = mount(() => (
      <NodeEditorToggle
        title="Knowledge Base"
        subtitle="Uses your documents"
        checked={false}
        onChange={() => {}}
      />
    ))
    const describedBy = query(host, 'button[role="switch"]').getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(textOfId(host, describedBy!)).toBe('Uses your documents')
  })

  it('no subtitle sets no description', () => {
    const host = mount(() => (
      <NodeEditorToggle title="Knowledge Base" checked={false} onChange={() => {}} />
    ))
    expect(query(host, 'button[role="switch"]').hasAttribute('aria-describedby')).toBe(false)
  })
})
