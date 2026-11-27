// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Box } from '../elements/Box.js'
import { setPublicDocumentUrl } from '../elements/documentUrl.js'

interface PaintView {
  children?: ReactNode
  testID?: string
  pointerEvents?: string
  accessibilityElementsHidden?: boolean
  importantForAccessibility?: string
  style?: unknown
  onPress?: () => void
}

const { nativeView, nativeImage } = vi.hoisted(() => ({
  nativeView: vi.fn<(props: PaintView) => void>(),
  nativeImage: vi.fn<
    (props: { source: { uri: string }; resizeMode: string; style: unknown }) => null
  >(() => null),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))
vi.mock('react-native-url-polyfill', () => ({ URL }))
vi.mock('react-native', () => ({
  Image: nativeImage,
  Platform: { select: ({ default: value }: { default: string }) => value },
  Pressable: (props: PaintView) => {
    nativeView(props)
    return <button onClick={props.onPress}>{props.children}</button>
  },
  View: (props: PaintView) => {
    nativeView(props)
    return <div data-testid={props.testID}>{props.children}</div>
  },
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  useWindowDimensions: () => ({ width: 640 }),
}))

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  nativeView.mockClear()
  nativeImage.mockClear()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
  setPublicDocumentUrl(undefined)
})

it('paints a centered cover behind foreground content without taking hits or accessibility', () => {
  const onClick = vi.fn()
  const src = 'https://example.test/frame.jpg'
  act(() =>
    root.render(
      <Box as="div" onClick={onClick} style={{ height: 64, coverImage: src }}>
        <Box as="div" data-mol-id="foreground" />
      </Box>,
    ),
  )
  const image = nativeImage.mock.lastCall?.[0]
  expect(image).toMatchObject({
    source: { uri: src },
    resizeMode: 'cover',
    style: { width: '100%', height: '100%' },
  })
  expect(nativeView.mock.calls.map(([props]) => props)).toContainEqual(
    expect.objectContaining({
      pointerEvents: 'none',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
      style: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    }),
  )
  const pressable = container.querySelector('button')
  expect(pressable?.children[1]?.getAttribute('data-testid')).toBe('foreground')
  expect(nativeView.mock.calls[0]?.[0].style).toContainEqual({ height: 64 })
  act(() => pressable?.click())
  expect(onClick).toHaveBeenCalledOnce()
})

it('resolves relative thumbnails and removes the image when the frame has no source', async () => {
  setPublicDocumentUrl('https://example.test/movie/view')
  await act(async () =>
    root.render(<Box as="div" role="img" style={{ coverImage: '../frame.jpg' }} />),
  )
  expect(nativeImage.mock.lastCall?.[0].source).toEqual({ uri: 'https://example.test/frame.jpg' })
  nativeImage.mockClear()

  act(() => root.render(<Box as="div" role="img" style={{ coverImage: '' }} />))
  expect(nativeImage).not.toHaveBeenCalled()
  expect(container.firstElementChild?.children).toHaveLength(0)
})
