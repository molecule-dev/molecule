// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { createElement, createRef, type MouseEvent, type ReactNode, type Ref } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import { Anchor, setPublicDocumentUrl } from '../elements/Anchor.js'
import { Pressable } from '../elements/Pressable.js'

const { openURL } = vi.hoisted(() => ({
  openURL: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))

vi.mock('react-native', () => {
  interface HostProps {
    role?: string
    testID?: string
    'aria-label'?: string
    'aria-disabled'?: boolean
    children?: ReactNode
    ref?: Ref<HTMLDivElement>
    disabled?: boolean
    onPress?: (event: MouseEvent<HTMLDivElement>) => void
  }

  return {
    Linking: { openURL },
    NativeModules: {},
    Platform: { OS: 'ios', select: ({ default: value }: { default: string }) => value },
    useWindowDimensions: () => ({ width: 640 }),
    View: ({ children }: HostProps) => createElement('div', {}, children),
    Text: ({ children }: HostProps) => createElement('span', {}, children),
    Pressable: (props: HostProps) =>
      createElement(
        'div',
        {
          role: props.role,
          'aria-label': props['aria-label'],
          'aria-disabled': props['aria-disabled'],
          'data-testid': props.testID,
          ref: props.ref,
          onClick: (event: MouseEvent<HTMLDivElement>) => {
            if (props.disabled) return
            // RN gives the press to the deepest enabled responder.
            props.onPress?.(event)
            event.stopPropagation()
          },
        },
        props.children,
      ),
  }
})

afterEach(() => {
  setPublicDocumentUrl(undefined)
  openURL.mockReset().mockResolvedValue(undefined)
  vi.restoreAllMocks()
})

describe('Anchor element (native)', () => {
  it.each([
    ['/oauth/slack', 'https://example.com/oauth/slack', 'https'],
    [
      '../privacy?source=app#details',
      'https://example.com/web/privacy?source=app#details',
      'https',
    ],
    ['?page=2', 'https://example.com/web/account/index.html?page=2', 'https'],
    ['//cdn.example.com/setup', 'http://cdn.example.com/setup', 'http'],
  ])(
    'resolves %s against the configured public document URL after the caller runs',
    async (href, url, scheme) => {
      setPublicDocumentUrl(`${scheme}://example.com/web/account/index.html`)
      const onClick = vi.fn(() => expect(openURL).not.toHaveBeenCalled())
      const ref = createRef<ElementHandle>()
      render(
        <Anchor href={href} title="Open" data-mol-id="document-link" onClick={onClick} ref={ref}>
          Continue
        </Anchor>,
      )
      const anchor = screen.getByRole('link', { name: 'Open' })
      expect(screen.getByTestId('document-link')).toBe(anchor)
      expect(ref.current).toBe(anchor)
      fireEvent.click(anchor)
      expect(onClick).toHaveBeenCalledOnce()
      await vi.waitFor(() => expect(openURL).toHaveBeenCalledExactlyOnceWith(url))
    },
  )

  it('hands absolute HTTPS, mailto and tel URLs to the OS through nested link buttons', () => {
    const hrefs = ['https://example.com/invite#send', 'mailto:help@example.com', 'tel:+15550123']
    render(
      <>
        {hrefs.map((href) => (
          <Anchor href={href} target="share-frame" rel="noopener" key={href}>
            <Pressable as="button">{href}</Pressable>
          </Anchor>
        ))}
      </>,
    )
    for (const href of hrefs) fireEvent.click(screen.getByText(href))
    expect(openURL.mock.calls).toEqual(hrefs.map((href) => [href]))
  })

  it('runs a placeholder handler without leaving the screen or requiring configuration', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onClick = vi.fn()
    render(
      <Anchor href="#" onClick={onClick}>
        Placeholder
      </Anchor>,
    )
    fireEvent.click(screen.getByText('Placeholder'))
    expect(onClick).toHaveBeenCalledOnce()
    expect(openURL).not.toHaveBeenCalled()
    expect(diagnostic).not.toHaveBeenCalled()
  })

  it('honors preventDefault before checking the public document URL', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Anchor href="/oauth/slack" onClick={(event) => event.preventDefault()}>
        Stay
      </Anchor>,
    )
    fireEvent.click(screen.getByText('Stay'))
    expect(openURL).not.toHaveBeenCalled()
    expect(diagnostic).not.toHaveBeenCalled()
  })

  it('names the destination and required startup configuration when a relative URL has no base', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Anchor href="/oauth/slack">Connect</Anchor>)
    expect(diagnostic).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Connect'))
    expect(openURL).not.toHaveBeenCalled()
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/href "\/oauth\/slack".*setPublicDocumentUrl\(\)/),
    )
  })

  it('keeps button and anchor handlers in order and respects descendant cancellation', () => {
    const calls: string[] = []
    render(
      <Anchor
        href="https://example.com/next"
        onClick={(event) => {
          calls.push(event.defaultPrevented ? 'anchor canceled' : 'anchor')
        }}
      >
        <Pressable
          as="button"
          onClick={(event) => {
            calls.push('button')
            event.preventDefault()
          }}
        >
          Cancel
        </Pressable>
        <Pressable as="button" onClick={(event) => event.stopPropagation()}>
          Stop
        </Pressable>
        <Pressable as="button" disabled>
          Disabled
        </Pressable>
      </Anchor>,
    )
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('Stop'))
    const disabled = screen.getByRole('button', { name: 'Disabled' })
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(disabled)
    expect(calls).toEqual(['button', 'anchor canceled'])
    expect(openURL).not.toHaveBeenCalled()
  })

  it('reports a rejected OS open with the href', async () => {
    setPublicDocumentUrl('https://example.com/app/')
    const error = new Error('No URL handler')
    openURL.mockRejectedValueOnce(error)
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Anchor href="./setup">Set up</Anchor>)
    fireEvent.click(screen.getByText('Set up'))
    await vi.waitFor(() => {
      expect(diagnostic).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('./setup'), error)
    })
  })
})
