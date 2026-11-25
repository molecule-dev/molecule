// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DotPulseMotion } from '@molecule/app-ui'
import * as elements from '@molecule/app-ui-react/elements'

const stylesheet =
  '@keyframes molecule-typing-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }'

let recipe: DotPulseMotion | undefined

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({ typingPulse: recipe }),
}))

afterEach(() => {
  cleanup()
  recipe = undefined
})

describe('PulseDots on the web', () => {
  it('serializes the original stylesheet followed by exactly three decorative spans', () => {
    const markup = renderToStaticMarkup(<elements.PulseDots size={6} durationMs={1200} />)
    const dots = [0, 200, 400].map(
      (delay) =>
        `<span aria-hidden="true" data-typing-dot="" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;animation:molecule-typing-pulse 1200ms ease-in-out ${delay}ms infinite"></span>`,
    )
    expect(markup).toBe(`<style>${stylesheet}</style>${dots.join('')}`)
  })

  it('applies the ClassMap curve and stagger without overriding a mounted standard pulse', () => {
    const standard = render(<elements.PulseDots size={6} durationMs={1000} />)
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    const custom = render(<elements.PulseDots size={6} durationMs={1000} />)
    const css = custom.container.firstElementChild?.textContent
    const key = css?.match(/^@keyframes ([\w-]+) /)?.[1]

    expect(key).toBeDefined()
    expect(key).not.toBe('molecule-typing-pulse')
    expect(css).toBe(
      `@keyframes ${key} { 0%, 75%, 100% { opacity: 0.2; transform: scale(0.5); } 25% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`,
    )
    expect(
      Array.from(custom.container.querySelectorAll('span'), (dot) => dot.style.animation),
    ).toEqual([0, 125, 250].map((delay) => `1000ms ease-in-out ${delay}ms infinite ${key}`))
    expect(standard.container.firstElementChild?.textContent).toBe(stylesheet)
  })

  it('updates size and duration on the mounted dots with the original fractional delay', () => {
    const { container, rerender } = render(<elements.PulseDots size={6} durationMs={1200} />)
    const original = [...container.querySelectorAll('span')]

    rerender(<elements.PulseDots size={9} durationMs={100} />)

    const dots = [...container.querySelectorAll('span')]
    expect(dots).toEqual(original)
    expect(dots.map((dot) => [dot.style.width, dot.style.height])).toEqual(
      Array(3).fill(['9px', '9px']),
    )
    expect(dots.map((dot) => dot.style.animation)).toEqual(
      [0, 16.6667, 33.3333].map(
        (delay) => `100ms ease-in-out ${delay}ms infinite molecule-typing-pulse`,
      ),
    )
    const markup = renderToStaticMarkup(<elements.PulseDots size={9} durationMs={100} />)
    expect(Array.from(markup.matchAll(/;animation:([^"]+)/g), (match) => match[1])).toEqual(
      [0, 16.666666666666668, 33.333333333333336].map(
        (delay) => `molecule-typing-pulse 100ms ease-in-out ${delay}ms infinite`,
      ),
    )
  })
})
