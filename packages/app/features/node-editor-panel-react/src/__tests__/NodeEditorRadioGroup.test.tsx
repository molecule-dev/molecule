import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorRadioGroup } from '../NodeEditorRadioGroup.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns an empty style object, every other property/method
 * access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
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
  return new Proxy({}, handler) as unknown as UIClassMap
}

const OPTIONS = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<NodeEditorRadioGroup>', () => {
  it('renders a radio group with one checked native radio per option', () => {
    const { getByRole, getAllByRole } = render(
      <NodeEditorRadioGroup value="structured" onChange={() => {}} options={OPTIONS} />,
    )
    expect(getByRole('radiogroup')).toBeTruthy()
    const radios = getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(3)
    // One shared name makes them one group: the browser's arrow keys move between them.
    expect(new Set(radios.map((r) => r.name)).size).toBe(1)
    expect(getByRole('radio', { name: 'Structured' })).toHaveProperty('checked', true)
    expect(getByRole('radio', { name: 'Conversational' })).toHaveProperty('checked', false)
    expect(
      getByRole('radio', { name: 'Hybrid' }).closest('[data-mol-id="node-editor-radio-hybrid"]'),
    ).toBeTruthy()
  })

  it('clicking an option tile selects it', () => {
    const onChange = vi.fn<(v: string) => void>()
    const { container } = render(
      <NodeEditorRadioGroup value="structured" onChange={onChange} options={OPTIONS} />,
    )
    fireEvent.click(container.querySelector('[data-mol-id="node-editor-radio-hybrid"]')!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('hybrid')
  })

  it('choosing a radio (keyboard or assistive technology) selects that option', () => {
    const onChange = vi.fn<(v: string) => void>()
    const { getByRole } = render(
      <NodeEditorRadioGroup value="structured" onChange={onChange} options={OPTIONS} />,
    )
    fireEvent.click(getByRole('radio', { name: 'Conversational' }))
    expect(onChange).toHaveBeenCalledWith('conversational')
  })

  it('the ring is decoration, hidden from assistive technology', () => {
    const { container } = render(
      <NodeEditorRadioGroup value="structured" onChange={() => {}} options={OPTIONS} />,
    )
    const tile = container.querySelector('[data-mol-id="node-editor-radio-structured"]')!
    expect(tile.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })
})
