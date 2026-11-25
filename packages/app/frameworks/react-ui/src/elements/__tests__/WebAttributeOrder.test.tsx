import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { Box, GlyphIcon, Pressable } from '@molecule/app-ui-react/elements'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    iconGlyphFont: 'glyph-font',
  }),
}))

it('serializes converted containers and controls in the original attribute order', () => {
  expect(
    renderToStaticMarkup(
      <>
        <Box as="span" aria-hidden webStyle={{ background: '#3366ff' }} data-mol-id="swatch" />
        <Pressable as="button" type="button" webStyle={{ overflow: 'hidden' }} data-mol-id="open">
          Open
        </Pressable>
      </>,
    ),
  ).toBe(
    renderToStaticMarkup(
      <>
        <span aria-hidden style={{ background: '#3366ff' }} data-mol-id="swatch" />
        <button type="button" style={{ overflow: 'hidden' }} data-mol-id="open">
          Open
        </button>
      </>,
    ),
  )
})

it('serializes the glyph classes before the supplied icon data attribute', () => {
  expect(
    renderToStaticMarkup(
      <GlyphIcon name="person" aria-hidden className="glyph-color" data-icon="person" />,
    ),
  ).toBe(
    renderToStaticMarkup(
      <span aria-hidden className="glyph-font glyph-color" data-icon="person">
        person
      </span>,
    ),
  )
})
