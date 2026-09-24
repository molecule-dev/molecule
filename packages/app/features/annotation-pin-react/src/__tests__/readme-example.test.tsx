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

import { AnnotationLayer, type Pin } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered image annotator.
 */
function ImageAnnotator(): React.JSX.Element {
  const [pins, setPins] = useState<Pin[]>([
    { id: 'pin-1', position: { x: 0.25, y: 0.4 }, label: 1, note: 'Scratch on the lid' },
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  return (
    <AnnotationLayer
      pins={pins}
      activePinId={activeId}
      onPinClick={(id) => setActiveId(id === activeId ? null : id)}
      onSurfaceClick={({ x, y }) => {
        const id = `pin-${pins.length + 1}`
        setPins([...pins, { id, position: { x, y }, label: pins.length + 1 }])
        setActiveId(id)
      }}
    >
      <img src="/uploads/product-photo.jpg" alt="" style={{ width: '100%', display: 'block' }} />
    </AnnotationLayer>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('toggles a pin popup and adds a new pin where the surface is clicked', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ImageAnnotator />
      </I18nProvider>,
    )
    const layer = view.getByRole('region', { name: 'Annotation layer' })
    const markers = (): HTMLElement[] => view.getAllByRole('button', { name: 'Annotation pin' })
    expect(markers()).toHaveLength(1)
    expect((markers()[0]?.parentElement as HTMLElement).style.left).toBe('25%')

    fireEvent.click(markers()[0] as HTMLElement)
    expect(view.getByRole('dialog').textContent).toBe('Scratch on the lid')
    fireEvent.click(markers()[0] as HTMLElement)
    expect(view.queryByRole('dialog')).toBeNull()

    layer.getBoundingClientRect = () => new DOMRect(0, 0, 400, 200)
    fireEvent.click(layer, { clientX: 300, clientY: 50 })
    expect(markers()).toHaveLength(2)
    const added = markers()[1]?.parentElement as HTMLElement
    expect(added.style.left).toBe('75%')
    expect(added.style.top).toBe('25%')
    expect(added.textContent).toContain('2')
    expect(view.getByRole('dialog').textContent).toBe('No notes for this pin.')
  })
})
