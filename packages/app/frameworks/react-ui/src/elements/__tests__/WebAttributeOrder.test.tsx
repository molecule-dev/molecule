// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as UI from '@molecule/app-ui'
import {
  Anchor,
  Box,
  CheckField,
  Circle,
  Disclosure,
  Ellipse,
  Fieldset,
  FormArea,
  G,
  GlyphIcon,
  Image,
  Line,
  Link,
  Path,
  Polygon,
  Polyline,
  Pressable,
  RangeField,
  Rect,
  RichText,
  Rule,
  ScrollArea,
  SelectField,
  Svg,
  SvgClipPath,
  SvgDefs,
  SvgImage,
  SvgLinearGradient,
  SvgMarkup,
  SvgPattern,
  SvgText,
  TableBox,
  TableCell,
  Text,
  TextField,
} from '@molecule/app-ui-react/elements'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof UI>()),
  getClassMap: () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    iconGlyphFont: 'glyph-font',
  }),
}))

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(() => vi.unstubAllGlobals())

function renderDom(node: ReactNode): string {
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    act(() => root.render(node))
    return container.innerHTML
  } finally {
    act(() => root.unmount())
  }
}

const style = { opacity: 0.5 }
const webStyle = { opacity: 0.75, marginTop: 4 }
const literalStyle = { ...style, ...webStyle }
const before = { id: 'paint', 'data-before': 'a' }
const after = { 'aria-label': 'sample', 'data-after': 'b' }
const url = 'https://example.test/image.png'
const options = [{ label: 'First', value: 'first' }]

describe.each(['start', 'middle', 'end'] as const)('web attribute order at the %s', (order) => {
  // Keep the style and neighboring attribute blocks in the same positions as the literal tag.
  const early = order === 'start' ? {} : before
  const late = order === 'middle' ? after : {}
  const element =
    order === 'start'
      ? { webStyle, ...before, ...after, style }
      : order === 'middle'
        ? { ...early, style, ...late, webStyle }
        : { ...early, ...after, style, webStyle }
  const literal =
    order === 'start'
      ? { style: literalStyle, ...before, ...after }
      : order === 'middle'
        ? { ...early, style: literalStyle, ...late }
        : { ...early, ...after, style: literalStyle }
  const leading = order === 'start' ? {} : before
  const trailing = order === 'end' ? {} : after
  const middle = order === 'end' ? after : {}
  const dimensions = order === 'start' ? { height: 6, width: 8 } : { width: 8, height: 6 }
  const imageOrder = order === 'start' ? { alt: '', src: url } : { src: url, alt: '' }
  const href =
    order === 'middle'
      ? { ...before, href: url, ...after, style: literalStyle }
      : { ...literal, href: url }
  const to =
    order === 'middle' ? { ...before, to: url, ...after, style, webStyle } : { ...element, to: url }
  const glyph =
    order === 'start'
      ? { className: 'ink', 'data-icon': 'person' }
      : { 'data-icon': 'person', className: 'ink' }
  const literalGlyph = { ...glyph, className: 'glyph-font ink' }
  const filledStyle = { fontVariationSettings: "'FILL' 1" }
  const attrs = {
    ...leading,
    ...middle,
    webStyle: { position: 'absolute' } as const,
    preserveAspectRatio: 'none',
    webShapeRendering: 'crispEdges' as const,
    ...trailing,
  }
  const svgAttrs = {
    ...leading,
    ...middle,
    style: { position: 'absolute' } as const,
    preserveAspectRatio: 'none',
    shapeRendering: 'crispEdges' as const,
    ...trailing,
  }
  const textareaDimensions =
    order === 'start'
      ? { wrap: 'hard' as const, cols: 24, rows: 3 }
      : { rows: 3, cols: 24, wrap: 'hard' as const }
  const shapes = (node: ReactNode): ReactNode => <svg>{node}</svg>
  const stop =
    order === 'start'
      ? { stopColor: 'red', offset: '0%' as const }
      : { offset: '0%' as const, stopColor: 'red' }
  const definitions = (node: ReactNode): ReactNode => (
    <svg>
      <defs>{node}</defs>
    </svg>
  )
  const grid = (node: ReactNode): ReactNode => (
    <table>
      <tbody>
        <tr>{node}</tr>
      </tbody>
    </table>
  )
  const jsx: [string, ReactNode, ReactNode][] = [
    ['Anchor', <Anchor {...href} />, <a {...href} />],
    ['Box', <Box as="div" {...element} />, <div {...literal} />],
    [
      'CheckField',
      <CheckField as="input" type="checkbox" {...element} />,
      <input type="checkbox" {...literal} />,
    ],
    [
      'Disclosure',
      <Disclosure as="details" {...element} open summary="Summary" summaryProps={element}>
        Body
      </Disclosure>,
      <details {...literal} open>
        <summary {...literal}>Summary</summary>Body
      </details>,
    ],
    ['Fieldset', <Fieldset as="fieldset" {...element} />, <fieldset {...literal} />],
    ['FormArea', <FormArea as="form" {...element} />, <form {...literal} />],
    [
      'GlyphIcon',
      <GlyphIcon name="person" {...glyph} {...element} />,
      <span {...literalGlyph} {...literal}>
        person
      </span>,
    ],
    [
      'filled GlyphIcon',
      <GlyphIcon name="person" {...leading} {...middle} filled {...trailing} />,
      <span {...leading} {...middle} style={filledStyle} {...trailing} className="glyph-font">
        person
      </span>,
    ],
    [
      'Image',
      <Image {...imageOrder} {...element} {...dimensions} />,
      <img {...imageOrder} {...literal} {...dimensions} />,
    ],
    ['Link', <Link {...to} />, <a {...href} />],
    [
      'Pressable',
      <Pressable as="button" {...element} type="button" />,
      <button {...literal} type="button" />,
    ],
    [
      'RangeField',
      <RangeField
        {...leading}
        {...middle}
        type="range"
        {...trailing}
        webStyle={webStyle}
        min={0}
      />,
      <input {...leading} {...middle} type="range" {...trailing} style={webStyle} min={0} />,
    ],
    [
      'implicit range type',
      <RangeField {...element} min={0} />,
      <input {...literal} min={0} type="range" />,
    ],
    [
      'RichText',
      <RichText className="copy" nodes={[{ kind: 'text', text: 'Text' }]} />,
      <div className="copy">Text</div>,
    ],
    ['Rule', <Rule as="hr" {...element} />, <hr {...literal} />],
    [
      'ScrollArea',
      <ScrollArea as="section" direction="horizontal" {...element} />,
      <section {...literal} />,
    ],
    [
      'SelectField',
      <SelectField as="select" {...element} options={options} required />,
      <select {...literal} required>
        <option value="first">First</option>
      </select>,
    ],
    ['Svg', <Svg {...attrs} viewBox="0 0 10 10" />, <svg {...svgAttrs} viewBox="0 0 10 10" />],
    [
      'SvgMarkup',
      <SvgMarkup {...attrs} markup={'<path d="M 0 0"/>'} />,
      <svg {...svgAttrs} dangerouslySetInnerHTML={{ __html: '<path d="M 0 0"/>' }} />,
    ],
    [
      'G',
      shapes(<G {...element} transform="scale(1)" />),
      shapes(<g {...literal} transform="scale(1)" />),
    ],
    ['Path', shapes(<Path {...element} d="M 0 0" />), shapes(<path {...literal} d="M 0 0" />)],
    [
      'Rect',
      shapes(<Rect {...element} {...dimensions} />),
      shapes(<rect {...literal} {...dimensions} />),
    ],
    [
      'Circle',
      shapes(<Circle {...element} cx={0} cy={0} r={2} />),
      shapes(<circle {...literal} cx={0} cy={0} r={2} />),
    ],
    [
      'Ellipse',
      shapes(<Ellipse {...element} cx={0} cy={0} rx={2} ry={1} />),
      shapes(<ellipse {...literal} cx={0} cy={0} rx={2} ry={1} />),
    ],
    [
      'Line',
      shapes(<Line {...element} x1={0} y1={0} x2={4} y2={4} />),
      shapes(<line {...literal} x1={0} y1={0} x2={4} y2={4} />),
    ],
    [
      'Polyline',
      shapes(<Polyline {...element} points="0,0 4,4" />),
      shapes(<polyline {...literal} points="0,0 4,4" />),
    ],
    [
      'Polygon',
      shapes(<Polygon {...element} points="0,0 4,4 6,2" />),
      shapes(<polygon {...literal} points="0,0 4,4 6,2" />),
    ],
    [
      'SvgText',
      shapes(
        <SvgText {...element} x={4} y={4}>
          Line
        </SvgText>,
      ),
      shapes(
        <text {...literal} x={4} y={4}>
          Line
        </text>,
      ),
    ],
    [
      'SvgDefs',
      shapes(
        <SvgDefs>
          <Path {...element} d="M 0 0" />
        </SvgDefs>,
      ),
      definitions(<path {...literal} d="M 0 0" />),
    ],
    [
      'SvgClipPath',
      definitions(
        <SvgClipPath id="clip">
          <Path {...element} d="M 0 0" />
        </SvgClipPath>,
      ),
      definitions(
        <clipPath id="clip">
          <path {...literal} d="M 0 0" />
        </clipPath>,
      ),
    ],
    [
      'SvgLinearGradient',
      definitions(<SvgLinearGradient {...leading} stops={[stop]} x2="100%" {...before} />),
      definitions(
        <linearGradient {...leading} x2="100%" {...before}>
          <stop {...stop} />
        </linearGradient>,
      ),
    ],
    [
      'SvgPattern',
      definitions(
        <SvgPattern {...leading} {...dimensions} {...before}>
          <Rect {...dimensions} />
        </SvgPattern>,
      ),
      definitions(
        <pattern {...leading} {...dimensions} {...before}>
          <rect {...dimensions} />
        </pattern>,
      ),
    ],
    [
      'SvgImage',
      shapes(<SvgImage {...element} href={url} {...dimensions} />),
      shapes(<image {...literal} href={url} {...dimensions} />),
    ],
    ['TableBox', <TableBox as="table" {...element} />, <table {...literal} />],
    [
      'TableCell',
      grid(<TableCell as="th" {...element} scope="col" />),
      grid(<th {...literal} scope="col" />),
    ],
    [
      'Text',
      <Text as="time" {...element} dateTime="2024-02-29">
        Day
      </Text>,
      <time {...literal} dateTime="2024-02-29">
        Day
      </time>,
    ],
    [
      'TextField input',
      <TextField
        as="input"
        {...leading}
        {...middle}
        type="number"
        min={0}
        {...trailing}
        webStyle={webStyle}
        step={0.5}
        rows={2}
      />,
      <input
        {...leading}
        {...middle}
        type="number"
        min={0}
        {...trailing}
        style={webStyle}
        step={0.5}
      />,
    ],
    [
      'TextField textarea',
      <TextField
        as="textarea"
        {...leading}
        {...middle}
        {...textareaDimensions}
        {...trailing}
        webStyle={webStyle}
        type="text"
      />,
      <textarea {...leading} {...middle} {...textareaDimensions} {...trailing} style={webStyle} />,
    ],
  ]

  it.each(jsx)('%s renders the literal bytes on the server', (_label, rendered, original) => {
    expect(renderToStaticMarkup(rendered)).toBe(renderToStaticMarkup(original))
  })

  it.each(jsx)('%s renders the literal bytes in the DOM', (_label, rendered, original) => {
    expect(renderDom(rendered)).toBe(renderDom(original))
  })
})
