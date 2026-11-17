/**
 * Every case starts on the page root (`/`, no query, no hash), whatever address the case before
 * it left: a hook that mirrors its state to `location.hash` through a debounce can end a case
 * with the hash still set, and the next case (another package's) then read it, so its recording
 * depended on which cases ran before it. Checked for UI cases (the React adapter, through
 * `buildServices`) and for hook cases (`runHookCase`), and that a case's own `window.url` and an
 * area fake that mounts the case on its own URL still apply.
 *
 * @module
 */

import { createElement, type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import * as ReactBindings from '@molecule/app-react'

import { runHookCase } from '../bindings/index.js'
import { createReactAdapter } from './react-adapter.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'

/** The address a component or hook sees when it mounts. */
const here = (): string => `${location.pathname}${location.search}${location.hash}`

/**
 * Renders the address it mounted on.
 *
 * @returns The paragraph.
 */
function MountedAt(): JSX.Element {
  const [at] = useState(here)
  return createElement('p', null, at)
}

/**
 * The address the hook mounted on.
 *
 * @returns The address.
 */
function useMountedAt(): string {
  const [at] = useState(here)
  return at
}

const ui = createReactAdapter({ MountedAt })
const hooks = createReactBindingAdapter({ ...ReactBindings, useMountedAt })

/** What an earlier case leaves behind. */
const leave = (): void => history.replaceState(null, '', '/settings?tab=2#q=auth')

afterEach(() => {
  history.replaceState(null, '', '/')
})

describe('the page a case starts on', () => {
  it('is the root for a UI case, whatever the case before it left', async () => {
    leave()
    const result = await ui.run('MountedAt', { name: 'mounted at' })
    expect(result.snapshots[0]).toBe('<p>\n/\n</p>\n@route /')
  })

  it('is the case’s own window.url when it names one', async () => {
    leave()
    const result = await ui.run('MountedAt', {
      name: 'own url',
      context: { window: { url: '/docs?x=1#top' } },
    })
    expect(result.snapshots[0]).toBe('<p>\n/docs?x=1#top\n</p>\n@route /')
  })

  it('is the root for a hook case, whatever the case before it left', async () => {
    leave()
    const result = await runHookCase(hooks, 'useMountedAt', { name: 'mounted at' })
    expect((result.snapshots[0] as { result: unknown }).result).toBe('/')
  })

  it('is the URL an area fake mounts a hook case on', async () => {
    leave()
    const result = await runHookCase(hooks, 'useMountedAt', {
      name: 'auth flow url',
      context: {
        areas: { authFlows: { location: { pathname: '/auth/callback', search: '?code=c1' } } },
      },
    })
    expect((result.snapshots[0] as { result: unknown }).result).toBe('/auth/callback?code=c1')
  })
})
