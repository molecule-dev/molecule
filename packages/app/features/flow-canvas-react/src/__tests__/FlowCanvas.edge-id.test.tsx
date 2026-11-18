/**
 * Edge ids are unique even when two edges are drawn within the same
 * millisecond — the id no longer comes from a render-path clock reading.
 *
 * @module
 */

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { FlowCanvas } from '../FlowCanvas.js'
import type { FlowChange, FlowNode } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
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

/**
 * A task node at a position.
 *
 * @param id - Node id.
 * @param x - X position.
 * @param y - Y position.
 * @returns The node.
 */
function node(id: string, x: number, y: number): FlowNode {
  return { id, type: 'task', position: { x, y }, data: { label: id.toUpperCase() } }
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

describe('<FlowCanvas> edge ids', () => {
  it('gives two edges drawn in the same millisecond distinct ids', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(change: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      } as DOMRect
    }
    try {
      const { container } = render(
        <Wrap>
          <FlowCanvas nodes={nodes} edges={[]} onChange={onChange} />
        </Wrap>,
      )
      const handleA = container.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = container.querySelector('[data-mol-id="flow-canvas-node-b"]')!

      fireEvent.pointerDown(handleA, { button: 0, pointerId: 1, clientX: 180, clientY: 40 })
      fireEvent.pointerUp(nodeB, { button: 0, pointerId: 1, clientX: 320, clientY: 40 })
      fireEvent.pointerDown(handleA, { button: 0, pointerId: 2, clientX: 180, clientY: 40 })
      fireEvent.pointerUp(nodeB, { button: 0, pointerId: 2, clientX: 320, clientY: 40 })

      expect(onChange).toHaveBeenCalledTimes(2)
      const ids = onChange.mock.calls.map(([change]) => change.edges[0].id)
      expect(new Set(ids).size).toBe(2)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
      now.mockRestore()
    }
  })
})
