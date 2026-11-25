// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it } from 'vitest'

import { Box } from '@molecule/app-ui-react/elements'

afterEach(cleanup)

it.each(['https://example.test/frame(01).jpg', ''])(
  'paints the scrubber cell in its original style order for %j',
  (src) => {
    const box = (
      <Box
        as="div"
        data-mol-id="cell"
        role="img"
        style={{ flex: 1, minWidth: 0, height: '100%', coverImage: src }}
        webStyle={{ flex: '1 1 0', backgroundColor: '#777', borderRight: '1px solid' }}
        aria-label="Frame"
      />
    )
    const literal = (
      <div
        data-mol-id="cell"
        role="img"
        style={{
          flex: '1 1 0',
          minWidth: 0,
          height: '100%',
          backgroundImage: src ? `url("${src}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#777',
          borderRight: '1px solid',
        }}
        aria-label="Frame"
      />
    )

    expect(renderToStaticMarkup(box)).toBe(renderToStaticMarkup(literal))
    expect(render(box).container.innerHTML).toBe(render(literal).container.innerHTML)
  },
)

it('quotes the image URL as one CSS string and layers the web style last', () => {
  const src = 'https://example.test/a"b\\c.jpg'
  expect(renderToStaticMarkup(<Box as="div" style={{ coverImage: src }} />)).toBe(
    renderToStaticMarkup(
      <div
        style={{
          backgroundImage: 'url("https://example.test/a\\22 b\\5c c.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />,
    ),
  )
  const { container } = render(
    <Box
      as="div"
      style={{ coverImage: src }}
      webStyle={{ backgroundImage: 'none', backgroundPosition: 'left' }}
    />,
  )
  const literal = render(
    <div
      style={{ backgroundImage: 'none', backgroundSize: 'cover', backgroundPosition: 'left' }}
    />,
  )
  expect(container.innerHTML).toBe(literal.container.innerHTML)
})
