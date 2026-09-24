// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. jsdom has no image decoder or 2-D
 * canvas, so only those browser APIs are stubbed.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { ImageCanvas, type ImageCanvasExportHandle, type PanOffset } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The photo editor.
 */
function PhotoEditor(): React.JSX.Element {
  const { t } = useTranslation()
  const exportRef = useRef<ImageCanvasExportHandle>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 })
  const [exported, setExported] = useState<string | null>(null)
  return (
    <>
      <ImageCanvas
        src="/photo.jpg"
        width={640}
        height={480}
        filters={{ brightness: 1.1, contrast: 1.2, sepia: 0.3 }}
        zoom={zoom}
        pan={pan}
        onChange={(next) => {
          setZoom(next.zoom)
          setPan(next.pan)
        }}
        exportRef={exportRef}
      />
      <Button onClick={() => setExported(exportRef.current?.toDataURL('image/jpeg', 0.92) ?? null)}>
        {t('common.export', undefined, { defaultValue: 'Export' })}
      </Button>
      {exported && (
        <a href={exported} download="photo-edited.jpg">
          {t('common.download', undefined, { defaultValue: 'Download' })}
        </a>
      )}
    </>
  )
}

/** Everything drawn on the stubbed 2-D context. */
const draws: Array<{ filter: string; args: unknown[] }> = []

/** A decoded 800x600 image: `onload` fires as soon as `src` is set. */
class LoadedImage {
  naturalWidth = 800
  naturalHeight = 600
  crossOrigin: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  /** Triggers the load callback asynchronously, like a browser. */
  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0)
  }
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    vi.stubGlobal('Image', LoadedImage)
    const context = {
      filter: 'none',
      save: (): void => {},
      restore: (): void => {},
      clearRect: (): void => {},
      drawImage(...args: unknown[]): void {
        draws.push({ filter: context.filter, args })
      },
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => context as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
      (type?: string) => `data:${type ?? 'image/png'};base64,EDITED`,
    )
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.hasPointerCapture = vi.fn(() => false)
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('draws the filtered photo, pans on drag, zooms on wheel and exports a data URL', async () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <PhotoEditor />
      </I18nProvider>,
    )
    const canvas = view.getByLabelText('Drag to pan, scroll to zoom')
    expect(canvas.getAttribute('width')).toBe('640')
    await waitFor(() => expect(canvas.getAttribute('data-loading')).toBe('false'))
    expect(draws.at(-1)?.filter).toBe('brightness(1.1) contrast(1.2) sepia(0.3)')
    // 800x600 at zoom 1, centred in 640x480.
    expect(draws.at(-1)?.args.slice(1)).toEqual([-80, -60, 800, 600])

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 130, clientY: 110 })
    fireEvent.pointerUp(canvas, { pointerId: 1 })
    expect(draws.at(-1)?.args.slice(1)).toEqual([-50, -50, 800, 600])

    fireEvent.wheel(canvas, { deltaY: -100 })
    expect(draws.at(-1)?.args[3]).toBeCloseTo(880)

    expect(view.queryByRole('link')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Export' }))
    const link = view.getByRole('link', { name: 'Download' })
    expect(link.getAttribute('href')).toBe('data:image/jpeg;base64,EDITED')
    expect(link.getAttribute('download')).toBe('photo-edited.jpg')
  })
})
