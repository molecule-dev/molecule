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

import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type ColorSwatch, ColorSwatchPicker } from '../index.js'

const TAG_COLORS: ColorSwatch[] = [
  { value: 'red', color: '#ef4444', label: 'Red' },
  { value: 'blue', color: '#3b82f6', label: 'Blue' },
  { value: 'green', color: '#22c55e', label: 'Green' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered tag color field.
 */
function TagColorField(): React.JSX.Element {
  const [selected, setSelected] = useState('blue')
  const current = TAG_COLORS.find((s) => s.value === selected)
  return (
    <ColorSwatchPicker
      swatches={TAG_COLORS}
      value={selected}
      onChange={setSelected}
      ariaLabel={t('colorPicker.group', undefined, { defaultValue: 'Color picker' })}
      preview={<span style={{ color: current?.color }}>{current?.label}</span>}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders a labelled radio group with the controlled selection', () => {
    const view = render(<TagColorField />)
    expect(view.getByRole('radiogroup', { name: 'Color picker' })).toBeTruthy()
    const radios = view.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(['Red', 'Blue', 'Green'])
    expect(view.getByRole('radio', { name: 'Blue' }).getAttribute('aria-checked')).toBe('true')
    expect(view.getByText('Blue', { selector: 'span' })).toBeTruthy()
  })

  it('selects a new swatch on click and updates the preview', () => {
    const view = render(<TagColorField />)
    fireEvent.click(view.getByRole('radio', { name: 'Green' }))
    expect(view.getByRole('radio', { name: 'Green' }).getAttribute('aria-checked')).toBe('true')
    expect(view.getByRole('radio', { name: 'Blue' }).getAttribute('aria-checked')).toBe('false')
    expect(view.getByText('Green', { selector: 'span' }).style.color).toBe('rgb(34, 197, 94)')
  })
})
