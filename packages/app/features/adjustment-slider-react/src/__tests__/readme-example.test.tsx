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
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AdjustmentSlider } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered exposure slider.
 */
function ExposureControl(): React.JSX.Element {
  const { t } = useTranslation()
  const [exposure, setExposure] = useState(0)
  return (
    <AdjustmentSlider
      label={t('exifPanel.exposure', undefined, { defaultValue: 'Exposure' })}
      value={exposure}
      onChange={setExposure}
      min={-100}
      max={100}
      step={1}
      bipolar
      unit="%"
      dataMolId="photo-editor-exposure"
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

  it('renders a labelled bipolar slider that updates and resets to zero', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ExposureControl />
      </I18nProvider>,
    )
    const root = view.container.querySelector('[data-mol-id="photo-editor-exposure"]')
    expect(root?.textContent).toContain('Exposure')
    expect(view.container.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).not.toBe(
      null,
    )

    const input = view.getByRole('slider', { name: 'Exposure' })
    const reset = view.getByRole('button', { name: 'Reset Exposure' })
    expect(reset.textContent).toBe('0%')

    fireEvent.change(input, { target: { value: '40' } })
    expect(reset.textContent).toBe('40%')

    fireEvent.doubleClick(input)
    expect(reset.textContent).toBe('0%')
  })
})
