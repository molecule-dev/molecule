// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as carouselLocales from '@molecule/app-locales-carousel'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Carousel } from '../index.js'

setClassMap(classMap)
registerLocaleModule(carouselLocales)

const slides = [
  { src: '/slides/one.jpg', alt: 'Mountain lake at dawn' },
  { src: '/slides/two.jpg', alt: 'City skyline at night' },
  { src: '/slides/three.jpg', alt: 'Desert dunes' },
]

/**
 * The README example, verbatim.
 *
 * @returns The gallery carousel.
 */
function Gallery(): JSX.Element {
  return (
    <I18nProvider provider={getI18nProvider()}>
      <Carousel autoplayMs={4000} showDots showArrows>
        {slides.map((s) => (
          <img key={s.src} src={s.src} alt={s.alt} />
        ))}
      </Carousel>
    </I18nProvider>
  )
}

/**
 * Index of the slide currently shown.
 *
 * @returns The active slide index.
 */
function activeSlide(): number {
  const all = Array.from(document.querySelectorAll('[data-mol-id="carousel-slide"]'))
  return all.findIndex((el) => el.getAttribute('aria-hidden') === 'false')
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('navigates with arrows and dots, wraps around, and autoplays every 4s', () => {
    vi.useFakeTimers()
    render(<Gallery />)

    expect(document.querySelectorAll('img')).toHaveLength(3)
    expect(activeSlide()).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(activeSlide()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }))
    expect(activeSlide()).toBe(2)
    expect(screen.getByRole('button', { name: 'Go to slide 3' }).getAttribute('aria-current')).toBe(
      'true',
    )
    // loop (default) wraps from the last slide back to the first.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(activeSlide()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(activeSlide()).toBe(2)

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(activeSlide()).toBe(0)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(activeSlide()).toBe(1)
  })
})
