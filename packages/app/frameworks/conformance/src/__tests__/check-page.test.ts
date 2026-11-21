/**
 * A hook case and a feature value check run on the page a UI case mounts on.
 *
 * The kit fills jsdom's gaps (`installDomGaps`: a canvas without a drawing context, pointer
 * capture, text tracks) before each UI case. Hook cases and value checks used to run on jsdom's
 * own page instead, so `useDevice`'s WebGL probe got jsdom's "not implemented" stub (which
 * answers `undefined` and reports to the console) where every UI case gets `null` (2026-11-19).
 *
 * No UI case runs in this file, and each test puts jsdom's own `getContext` back, so every check
 * starts on jsdom's page.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as ReactBindings from '@molecule/app-react'

import { runHookCase } from '../bindings/index.js'
import { featureValue } from '../features/run.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'

/**
 * What a canvas answers for a 2D drawing context, as text (`null` on the kit's page).
 *
 * @returns `String(getContext('2d'))`.
 */
const canvasContext = (): string => String(document.createElement('canvas').getContext('2d'))

/**
 * A hook that reads {@link canvasContext} once.
 *
 * @returns The answer.
 */
function useCanvasContext(): string {
  return canvasContext()
}

const adapter = createReactBindingAdapter({ ...ReactBindings, useCanvasContext })

const jsdomGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')

beforeEach(() => {
  // jsdom's own answer, reported to its console as "not implemented" (silenced here).
  if (jsdomGetContext)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      ...jsdomGetContext,
      value: (): undefined => undefined,
    })
})

afterEach(() => {
  if (jsdomGetContext)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', jsdomGetContext)
})

describe('the page every check runs on', () => {
  it('starts as jsdom gives it in this file', () => {
    expect(canvasContext()).toBe('undefined')
  })

  it('gives a hook case the canvas a UI case gets', async () => {
    const result = await runHookCase(adapter, 'useCanvasContext', { name: 'canvas' })
    expect(result.snapshots).toEqual([expect.objectContaining({ result: 'null' })])
  })

  it('gives a value check the canvas a UI case gets', () => {
    expect(featureValue({ export: 'canvasContext', calls: [[]] }, canvasContext)).toEqual(['null'])
  })
})
