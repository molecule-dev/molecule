// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@molecule/app-react'
import { createBrowserRouter, createMemoryRouter } from '@molecule/app-routing'
import type { ElementHandle } from '@molecule/app-ui'

import { Anchor } from '../Anchor.js'
import { Link } from '../Link.js'

describe('Anchor element (web)', () => {
  it('renders a literal hash without a router, forwarding its DOM props and ref', () => {
    const ref = createRef<ElementHandle>()
    const onClick = vi.fn()
    render(
      <Anchor
        href="#"
        target="help-frame"
        rel="noopener noreferrer"
        data-mol-id="literal-anchor"
        aria-label="Help"
        style={{ opacity: 0.5 }}
        webStyle={{ opacity: 1 }}
        onClick={onClick}
        ref={ref}
      >
        <strong>Open help</strong>
      </Anchor>,
    )
    const link = screen.getByRole<HTMLAnchorElement>('link', { name: 'Help' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('#')
    expect(link.getAttribute('target')).toBe('help-frame')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('data-mol-id')).toBe('literal-anchor')
    expect(link.style.opacity).toBe('1')
    expect(link.firstElementChild?.tagName).toBe('STRONG')
    expect(ref.current).toBe(link)
    expect(fireEvent.click(link)).toBe(true)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('runs the caller first and honors preventDefault on a standalone server path', () => {
    const onClick = vi.fn((event: { defaultPrevented: boolean; preventDefault(): void }) => {
      expect(event.defaultPrevented).toBe(false)
      event.preventDefault()
    })
    render(
      <Anchor href="/oauth/slack" onClick={onClick}>
        Connect
      </Anchor>,
    )
    const link = screen.getByRole('link', { name: 'Connect' })
    expect(link.getAttribute('href')).toBe('/oauth/slack')
    expect(fireEvent.click(link)).toBe(false)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it.each([
    {
      mode: 'a basename',
      createRouter: () => createMemoryRouter({ basePath: '/app' }),
      routedHref: '/app/settings',
    },
    {
      mode: 'hash history',
      createRouter: () => createBrowserRouter({ mode: 'hash' }),
      routedHref: '#/settings',
    },
  ])(
    'leaves the browser default intact alongside Link under $mode',
    ({ createRouter, routedHref }) => {
      const before = window.location.href
      const router = createRouter()
      const defaults: boolean[] = []
      try {
        const view = render(
          <RouterProvider router={router}>
            <div
              onClick={(event) => {
                defaults.push(event.nativeEvent.defaultPrevented)
                // Observe the link's choice before stopping navigation in jsdom.
                event.preventDefault()
              }}
            >
              <Anchor href="#">Placeholder</Anchor>
              <Anchor href="/oauth/slack">Connect</Anchor>
              <Link to="/settings">Settings</Link>
            </div>
          </RouterProvider>,
        )
        const hash = screen.getByRole('link', { name: 'Placeholder' })
        const server = screen.getByRole('link', { name: 'Connect' })
        const routed = screen.getByRole('link', { name: 'Settings' })
        expect(hash.getAttribute('href')).toBe('#')
        expect(server.getAttribute('href')).toBe('/oauth/slack')
        expect(routed.getAttribute('href')).toBe(routedHref)
        fireEvent.click(hash)
        fireEvent.click(server)
        expect(router.getLocation().pathname).toBe('/')
        fireEvent.click(routed)
        expect(router.getLocation().pathname).toBe('/settings')
        expect(defaults).toEqual([false, false, true])
        view.unmount()
      } finally {
        router.destroy()
        window.history.replaceState(null, '', before)
      }
    },
  )
})
