// @vitest-environment jsdom
/**
 * Accessible-naming tests for `NodeEditorSlider` and `NodeEditorToggle`: the
 * range input is named by the section's `<label for>`, and the switch is named
 * by its title paragraph (`aria-labelledby`) or an explicit `ariaLabel`, and
 * described by its subtitle (`aria-describedby`).
 *
 * @module
 */

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorSlider } from '../NodeEditorSlider.js'
import { NodeEditorToggle } from '../NodeEditorToggle.js'

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

/** Queries one element, failing the test when it is absent. */
function query(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

/**
 * The text of the element an id names.
 *
 * @param container - The rendered tree.
 * @param id - The id the ARIA attribute carries.
 * @returns The referenced element's text.
 */
function textOfId(container: HTMLElement, id: string): string | null {
  return query(container, `[id="${id}"]`).textContent
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<NodeEditorSlider>', () => {
  it('the label names the range input', () => {
    const { container } = render(
      <NodeEditorSlider label="Temperature" value={0.7} onChange={() => {}} />,
    )
    const label = query(container, 'label')
    const input = query(container, 'input[type="range"]')
    expect(label.getAttribute('for')).toBe(input.id)
    expect(label.getAttribute('for')).not.toBe('')
    expect(label.textContent).toBe('Temperature')
  })

  it('a string value display is announced as the value text', () => {
    const { container } = render(
      <NodeEditorSlider label="Temperature" value={0.7} onChange={() => {}} valueDisplay="70%" />,
    )
    expect(query(container, 'input[type="range"]').getAttribute('aria-valuetext')).toBe('70%')
  })

  it('a node value display sets no value text', () => {
    const { container } = render(
      <NodeEditorSlider
        label="Temperature"
        value={0.7}
        onChange={() => {}}
        valueDisplay={<em>70%</em>}
      />,
    )
    expect(query(container, 'input[type="range"]').hasAttribute('aria-valuetext')).toBe(false)
  })
})

describe('<NodeEditorToggle>', () => {
  it('the switch is named by the title', () => {
    const { container } = render(
      <NodeEditorToggle title="Knowledge Base" checked={false} onChange={() => {}} />,
    )
    const button = query(container, 'button[role="switch"]')
    const labelledBy = button.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(textOfId(container, labelledBy!)).toBe('Knowledge Base')
  })

  it('an aria label overrides the title as the name', () => {
    const { container } = render(
      <NodeEditorToggle
        title="Knowledge Base"
        ariaLabel="Toggle knowledge base"
        checked={false}
        onChange={() => {}}
      />,
    )
    const button = query(container, 'button[role="switch"]')
    expect(button.getAttribute('aria-label')).toBe('Toggle knowledge base')
    expect(button.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('the subtitle describes the switch', () => {
    const { container } = render(
      <NodeEditorToggle
        title="Knowledge Base"
        subtitle="Uses your documents"
        checked={false}
        onChange={() => {}}
      />,
    )
    const describedBy = query(container, 'button[role="switch"]').getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(textOfId(container, describedBy!)).toBe('Uses your documents')
  })

  it('no subtitle sets no description', () => {
    const { container } = render(
      <NodeEditorToggle title="Knowledge Base" checked={false} onChange={() => {}} />,
    )
    expect(query(container, 'button[role="switch"]').hasAttribute('aria-describedby')).toBe(false)
  })
})
