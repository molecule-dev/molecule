// @vitest-environment jsdom

/**
 * `useLinkRouter`: the router a link to a destination navigates through, with a router mounted and
 * with none, which is how every binding's `Link` tells a URL outside the app from an app path.
 *
 * @module
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import { useLinkRouter } from '../hooks/useRouter.js'
import { MoleculeProvider } from '../providers.js'

/** What the probes read, by destination: the router, or `null`. */
type Read = Record<string, Router | null>

/**
 * Reads the hook for `to` and records what it gave.
 *
 * @param props - The destination, and where to record what the hook gave.
 * @returns Nothing rendered.
 */
function Reads({ to, into }: { to: string; into: Read }): null {
  into[to] = useLinkRouter(to)
  return null
}

/** The key of the error a routing hook throws with no router mounted. */
const NO_ROUTER_ERROR_KEY = 'react.error.useRouterOutsideProvider'

describe('useLinkRouter', () => {
  it('gives the mounted router for an app path and for a URL', () => {
    const router = createMemoryRouter()
    const read: Read = {}
    render(
      <MoleculeProvider router={router}>
        <Reads to="/settings?tab=billing#plan" into={read} />
        <Reads to="https://elsewhere.example/page" into={read} />
        <Reads to="mailto:help@example.com" into={read} />
      </MoleculeProvider>,
    )
    expect(read['/settings?tab=billing#plan']).toBe(router)
    expect(read['https://elsewhere.example/page']).toBe(router)
    expect(read['mailto:help@example.com']).toBe(router)
  })

  it('gives null for a URL outside the app with no router mounted', () => {
    const read: Read = {}
    render(
      <MoleculeProvider>
        <Reads to="https://elsewhere.example/page" into={read} />
        <Reads to="mailto:help@example.com" into={read} />
        <Reads to="//cdn.example/file" into={read} />
      </MoleculeProvider>,
    )
    expect(read['https://elsewhere.example/page']).toBeNull()
    expect(read['mailto:help@example.com']).toBeNull()
    expect(read['//cdn.example/file']).toBeNull()
  })

  it('throws the no-router error for an app path with no router mounted', () => {
    let thrown: unknown
    try {
      render(
        <MoleculeProvider>
          <Reads to="/settings?tab=billing#plan" into={{}} />
        </MoleculeProvider>,
      )
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown instanceof I18nError ? thrown.i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })

  it('checks a destination again when it changes from a URL to an app path', () => {
    const read: Read = {}
    const { rerender } = render(
      <MoleculeProvider>
        <Reads to="https://elsewhere.example/page" into={read} />
      </MoleculeProvider>,
    )
    expect(read['https://elsewhere.example/page']).toBeNull()
    expect(() =>
      rerender(
        <MoleculeProvider>
          <Reads to="/settings" into={read} />
        </MoleculeProvider>,
      ),
    ).toThrow(I18nError)
  })
})
