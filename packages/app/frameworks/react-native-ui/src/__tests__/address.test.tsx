// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

import { Anchor } from '../elements/Anchor.js'
import { Box } from '../elements/Box.js'
import { nativeStyle } from '../elements/style.js'
import { Text } from '../elements/Text.js'

const { openURL } = vi.hoisted(() => ({ openURL: vi.fn(async () => undefined) }))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))
vi.mock('react-native', () => {
  interface Props {
    testID?: string
    style?: { fontStyle?: string } | readonly ({ fontStyle?: string } | undefined | false)[]
    onPress?: () => void
    children?: ReactNode
  }
  const host = (tag: string) => (props: Props) =>
    createElement(
      tag,
      {
        'data-testid': props.testID,
        'data-font-style': Object.assign({}, ...[props.style].flat())?.fontStyle,
        onClick: props.onPress,
      },
      props.children,
    )
  return {
    Linking: { openURL },
    Platform: { select: ({ default: value }: { default: string }) => value },
    processColor: (value: string) => (value === '#3366ff' ? 0 : undefined),
    Pressable: host('button'),
    Text: host('span'),
    View: host('div'),
    useWindowDimensions: () => ({ width: 640 }),
  }
})

it('paints a solid CSS background on native and leaves gradient paint to the web', () => {
  expect(nativeStyle(undefined, { background: '#3366ff' })).toMatchObject({
    backgroundColor: '#3366ff',
  })
  expect(nativeStyle(undefined, { background: 'linear-gradient(red, blue)' })).toEqual({})
})

it('stacks address lines and applies address font style to the text runs', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    act(() =>
      root.render(
        <>
          <Box as="address" data-testid="address" webStyle={{ fontStyle: 'normal' }}>
            <Text as="span" webStyle={{ display: 'block' }}>
              First street
            </Text>
            <Text as="span" webStyle={{ display: 'block' }}>
              Second city
            </Text>
            <Box as="div">Third country</Box>
            <Text as="em">Explicit emphasis</Text>
          </Box>
          <Anchor href="tel:+15551234" data-testid="phone">
            +15551234
          </Anchor>
        </>,
      ),
    )
    const address = container.querySelector('[data-testid="address"]')
    const phone = container.querySelector<HTMLElement>('[data-testid="phone"]')
    expect(address?.tagName).toBe('DIV')
    expect(address?.hasAttribute('data-font-style')).toBe(false)
    expect(Array.from(address?.children ?? []).map((line) => line.textContent)).toEqual([
      'First street',
      'Second city',
      'Third country',
      'Explicit emphasis',
    ])
    expect(
      Array.from(address?.querySelectorAll('span[data-font-style="normal"]') ?? [])
        .filter((line) => line.children.length === 0)
        .map((line) => line.textContent),
    ).toEqual(['First street', 'Second city', 'Third country'])
    expect(address?.querySelector('span[data-font-style="italic"]')?.textContent).toBe(
      'Explicit emphasis',
    )
    expect(address?.nextElementSibling).toBe(phone)
    await act(async () => phone?.click())
    expect(openURL).toHaveBeenCalledExactlyOnceWith('tel:+15551234')
  } finally {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  }
})
