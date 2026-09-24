// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * locale bond. Only the browser's camera (`getUserMedia`, `<video>.play()`) and
 * the native `BarcodeDetector` — the outside world — are stubbed.
 *
 * @module
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as barcodeScannerLocales from '@molecule/app-locales-feature-barcode-scanner'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BarcodeScanner } from '../index.js'

setClassMap(classMap)
registerLocaleModule(barcodeScannerLocales)

/**
 * The README example, verbatim.
 *
 * @returns The scan panel.
 */
function ScanPanel(): JSX.Element {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <I18nProvider provider={getI18nProvider()}>
      <BarcodeScanner
        formats={['ean_13', 'upc_a']}
        onScan={({ value }) => setCode(value)}
        onError={(err) => setError(err.message)}
      />
      {code && <output>{code}</output>}
      {error && <p role="alert">{error}</p>}
    </I18nProvider>
  )
}

const stopTrack = vi.fn()
const getUserMedia = vi.fn()
const detectorFormats: Array<string[] | undefined> = []

/** Stand-in for the browser's native `BarcodeDetector`. */
class FakeBarcodeDetector {
  /**
   * Records the formats the component asked for.
   *
   * @param init - Detector options.
   * @param init.formats - Requested symbologies.
   */
  constructor(init?: { formats?: string[] }) {
    detectorFormats.push(init?.formats)
  }

  /**
   * Reports one EAN-13 code in the frame.
   *
   * @returns The detected barcodes.
   */
  async detect(): Promise<Array<{ rawValue: string; format: string }>> {
    return [{ rawValue: '4006381333931', format: 'ean_13' }]
  }
}

describe('README @example', () => {
  beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.stubGlobal('BarcodeDetector', FakeBarcodeDetector)
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens the rear camera, reports the scanned code and stops the camera', async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })

    render(<ScanPanel />)

    await waitFor(() =>
      expect(document.querySelector('[data-mol-id="barcode-scanner-status"]')?.textContent).toBe(
        'Scan complete',
      ),
    )
    expect(document.querySelector('output')?.textContent).toBe('4006381333931')
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'environment' }),
        audio: false,
      }),
    )
    expect(detectorFormats).toContainEqual(['ean_13', 'upc_a'])
    expect(stopTrack).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the localized error when camera permission is denied', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))

    render(<ScanPanel />)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Camera permission denied'),
    )
    expect(document.querySelector('output')).toBeNull()
  })
})
