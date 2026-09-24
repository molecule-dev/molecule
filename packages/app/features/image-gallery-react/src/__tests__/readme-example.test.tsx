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

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ImageGallery } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The product photo gallery.
 */
function ProductPhotos(): React.JSX.Element {
  const photos = [
    { src: 'https://cdn.example.com/chair-front.jpg', alt: 'Oak chair, front' },
    { src: 'https://cdn.example.com/chair-side.jpg', alt: 'Oak chair, side' },
    { src: 'https://cdn.example.com/chair-back.jpg', alt: 'Oak chair, back' },
    { src: 'https://cdn.example.com/chair-detail.jpg', alt: 'Oak chair, joinery detail' },
    { src: 'https://cdn.example.com/chair-room.jpg', alt: 'Oak chair in a dining room' },
  ]
  const [active, setActive] = useState(0)
  return (
    <ImageGallery
      images={photos.map((p) => p.src)}
      alts={photos.map((p) => p.alt)}
      selectedIndex={active}
      onSelect={setActive}
      maxThumbnails={4}
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

  it('shows the first photo, four thumbnails plus a "+1" tile, and swaps on thumbnail click', () => {
    const view = render(<ProductPhotos />)
    const main = view.getByAltText('Oak chair, front') as HTMLImageElement
    expect(main.src).toBe('https://cdn.example.com/chair-front.jpg')
    const thumbs = view.getAllByRole('button')
    expect(thumbs).toHaveLength(4)
    expect(thumbs[0]?.getAttribute('aria-current')).toBe('true')
    expect(view.getByText('+1')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Oak chair, back' }))
    const swapped = view.getByAltText('Oak chair, back') as HTMLImageElement
    expect(swapped.src).toBe('https://cdn.example.com/chair-back.jpg')
    expect(view.getByRole('button', { name: 'Oak chair, back' }).getAttribute('aria-current')).toBe(
      'true',
    )
  })
})
