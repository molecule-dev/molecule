/**
 * `restAttrs` is the React `...rest` spread every component puts on its element: it leaves out
 * `class` and `style` and rewrites React's DOM-callback names to the Vue listener keys of the
 * events React listens to, so a handler written for React fires on the same event here.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { restAttrs } from '../utilities/attrs.js'

const handler = (): void => {}

describe('restAttrs', () => {
  it('rewrites React callback names to Vue listener keys', () => {
    const rest = restAttrs({
      onKeyDown: handler,
      onMouseEnter: handler,
      onClick: handler,
    })
    expect(Object.keys(rest)).toEqual(['onKeydown', 'onMouseenter', 'onClick'])
  })

  it("maps React's focus, blur and double-click to the events React listens to", () => {
    const rest = restAttrs({ onFocus: handler, onBlur: handler, onDoubleClick: handler })
    expect(Object.keys(rest)).toEqual(['onFocusin', 'onFocusout', 'onDblclick'])
  })

  it('leaves keys already in Vue listener form, and keeps Vue event modifiers', () => {
    const rest = restAttrs({
      onKeydown: handler,
      onFocusin: handler,
      onClickOnce: handler,
      onKeyDownCapture: handler,
    })
    expect(Object.keys(rest)).toEqual(['onKeydown', 'onFocusin', 'onClickOnce', 'onKeydownCapture'])
  })

  it('renders automationId as the data-mol-id attribute it documents', () => {
    expect(restAttrs({ automationId: 'billing-card' })).toEqual({ 'data-mol-id': 'billing-card' })
    expect(restAttrs({ 'automation-id': 'billing-card' })).toEqual({
      'data-mol-id': 'billing-card',
    })
  })

  it('leaves attributes that are not DOM callbacks alone and drops class and style', () => {
    const rest = restAttrs({
      class: 'x',
      style: 'color: red',
      id: 'billing',
      'aria-label': 'Billing',
      'data-mol-id': 'billing-card',
      'onUpdate:modelValue': handler,
      one: 1,
    })
    expect(rest).toEqual({
      id: 'billing',
      'aria-label': 'Billing',
      'data-mol-id': 'billing-card',
      'onUpdate:modelValue': handler,
      one: 1,
    })
  })
})
