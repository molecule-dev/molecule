// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { MindMapCanvas } from '../MindMapCanvas.js'
import type { MindMapNode } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
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

/**
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
})

const sample = (): MindMapNode => ({
  id: 'r',
  text: 'Root',
  children: [
    { id: 'a', text: 'Alpha', children: [{ id: 'a1', text: 'A1', children: [] }] },
    { id: 'b', text: 'Beta', children: [] },
  ],
})

/**
 * Stateful host that mirrors the controlled-mode pattern apps use.
 *
 * @param props - Component props.
 * @param props.initial - Initial mind-map root.
 * @returns The host element.
 */
function Host({
  initial,
  ...rest
}: {
  initial: MindMapNode
} & Omit<React.ComponentProps<typeof MindMapCanvas>, 'root' | 'onChange'>): React.ReactElement {
  const [root, setRoot] = useState<MindMapNode>(initial)
  return <MindMapCanvas root={root} onChange={setRoot} {...rest} />
}

describe('<MindMapCanvas>', () => {
  it('renders the surface and one body per visible node', () => {
    const { container } = render(
      <Wrap>
        <MindMapCanvas root={sample()} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="mind-map-canvas"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="canvas-surface"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-body-r"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-body-a"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-body-b"]')).not.toBeNull()
  })

  it('hides descendants when the toggle collapses a subtree', () => {
    const { container } = render(
      <Wrap>
        <Host initial={sample()} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    const toggle = container.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    fireEvent.click(toggle)
    expect(container.querySelector('[data-mol-id="mind-map-node-body-a1"]')).toBeNull()
    // Re-expand.
    fireEvent.click(container.querySelector('[data-mol-id="mind-map-node-toggle-a"]')!)
    expect(container.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
  })

  it('appends a new child and auto-expands the parent', () => {
    const { container } = render(
      <Wrap>
        <Host initial={{ id: 'r', text: 'Root', collapsed: true, children: [] }} />
      </Wrap>,
    )
    const add = container.querySelector('[data-mol-id="mind-map-node-add-r"]') as HTMLButtonElement
    fireEvent.click(add)
    // After adding, root is expanded → at least one new body should exist
    // for the appended child (we don't know its exact id since it's
    // randomized, so query loosely).
    const bodies = container.querySelectorAll('[data-mol-id^="mind-map-node-body-"]')
    expect(bodies.length).toBeGreaterThanOrEqual(2)
  })

  it('enters inline edit on double-click and commits on Enter', () => {
    const onNodeEdit = vi.fn()
    const { container } = render(
      <Wrap>
        <Host initial={sample()} onNodeEdit={onNodeEdit} />
      </Wrap>,
    )
    const body = container.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    fireEvent.doubleClick(body)
    const input = container.querySelector(
      '[data-mol-id="mind-map-node-input-a"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Alpha v2' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Input has been removed; new text rendered.
    expect(container.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe(
      'Alpha v2',
    )
    expect(onNodeEdit).toHaveBeenCalledWith('a', 'Alpha v2')
  })

  it('cancels inline edit on Escape (text unchanged)', () => {
    const { container } = render(
      <Wrap>
        <Host initial={sample()} />
      </Wrap>,
    )
    const body = container.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    fireEvent.doubleClick(body)
    const input = container.querySelector(
      '[data-mol-id="mind-map-node-input-a"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'should not stick' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(container.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe(
      'Alpha',
    )
  })

  it('runs in controlled mode: every mutation calls onChange', () => {
    const onChange = vi.fn()
    const root = sample()
    const { container } = render(
      <Wrap>
        <MindMapCanvas root={root} onChange={onChange} />
      </Wrap>,
    )
    const toggle = container.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as MindMapNode
    expect(next.children[0].collapsed).toBe(true)
  })

  it('respects the layout prop (radial vs horizontal produces different positions)', () => {
    const root: MindMapNode = {
      id: 'r',
      text: 'Root',
      children: [
        { id: 'a', text: 'A', children: [] },
        { id: 'b', text: 'B', children: [] },
      ],
    }
    const radial = render(
      <Wrap>
        <MindMapCanvas root={root} layout="radial" />
      </Wrap>,
    )
    const radialA = (radial.container.querySelector('[data-canvas-node-id="a"]') as HTMLElement)
      .style.left
    radial.unmount()

    const horizontal = render(
      <Wrap>
        <MindMapCanvas root={root} layout="horizontal" />
      </Wrap>,
    )
    const horizontalA = (
      horizontal.container.querySelector('[data-canvas-node-id="a"]') as HTMLElement
    ).style.left
    expect(radialA).not.toEqual(horizontalA)
  })
})
