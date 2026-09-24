// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ColorPicker } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered stroke color field.
 */
function StrokeColorField(): React.JSX.Element {
  const [color, setColor] = useState('#3366ff')
  return (
    <div>
      <ColorPicker value={color} onChange={setColor} dataMolId="stroke-color" />
      <svg width="120" height="24" aria-hidden="true">
        <line x1="0" y1="12" x2="120" y2="12" stroke={color} strokeWidth="4" />
      </svg>
    </div>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderField(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <StrokeColorField />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('shows the initial color in the hex field and RGB inputs', () => {
    const view = renderField()
    expect(view.container.querySelector('[data-mol-id="stroke-color"]')).toBeTruthy()
    expect((view.getByLabelText('HEX color') as HTMLInputElement).value).toBe('#3366ff')
    expect((view.getByLabelText('Red') as HTMLInputElement).value).toBe('51')
    expect((view.getByLabelText('Green') as HTMLInputElement).value).toBe('102')
    expect((view.getByLabelText('Blue') as HTMLInputElement).value).toBe('255')
  })

  it('feeds picked colors back through the controlled value', () => {
    const view = renderField()
    const line = view.container.querySelector('line') as SVGLineElement
    const hex = view.getByLabelText('HEX color') as HTMLInputElement
    fireEvent.change(hex, { target: { value: '#F00' } })
    fireEvent.keyDown(hex, { key: 'Enter' })
    expect(line.getAttribute('stroke')).toBe('#ff0000')

    fireEvent.change(view.getByLabelText('Blue'), { target: { value: '255' } })
    expect(line.getAttribute('stroke')).toBe('#ff00ff')
    expect(hex.value).toBe('#ff00ff')
  })
})
