/**
 * The bond's `MemoryRouter` publishes its memory history to every molecule hook under it,
 * so a hook that takes no options reads each entry's state and hears Back as a pop.
 *
 * @module
 */
import { Route } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { describe, expect, it } from 'vitest'

import type { NavigationAction, Router } from '@molecule/app-routing'

import { MemoryRouter, useMoleculeRouter } from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'

const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mounts `router` under the bond's `MemoryRouter` and returns the router a hook built.
 *
 * @param router - The `MemoryRouter` element to mount, given the probe route's component.
 * @returns The hook's router and how to unmount it.
 */
function mount(router: (probe: () => JSX.Element) => JSX.Element): {
  router: Router
  unmount: () => void
} {
  let built: Router | undefined
  const Probe = (): JSX.Element => {
    built = useMoleculeRouter()
    return <div />
  }
  const dispose = render(() => router(Probe), document.createElement('div'))
  if (!built) throw new Error('the probe did not render')
  return { router: built, unmount: dispose }
}

describe('MemoryRouter', () => {
  it('gives a hook without options each entry state and Back as a pop', async () => {
    const { router, unmount } = mount((probe) => (
      <MemoryRouter initialEntries={['/inbox']}>
        <Route path="*" component={probe} />
      </MemoryRouter>
    ))
    const actions: (NavigationAction | undefined)[] = []
    const stop = router.subscribe((_location, action) => actions.push(action))

    await router.navigate('/inbox/42', { state: { from: 'list' } })
    await settle()
    await router.navigate('/inbox/42/reply', { state: { draft: true } })
    await settle()
    router.back()
    await settle()

    expect(router.getLocation()).toMatchObject({ pathname: '/inbox/42', state: { from: 'list' } })
    expect(actions.at(-1)).toBe('pop')
    router.forward()
    await settle()
    expect(router.getLocation()).toMatchObject({
      pathname: '/inbox/42/reply',
      state: { draft: true },
    })

    stop()
    unmount()
  })

  it('runs on a history passed to it, and starts at the last initial entry otherwise', () => {
    const history = createSolidMemoryHistory(['/a', '/b'])
    const given = mount((probe) => (
      <MemoryRouter history={history}>
        <Route path="*" component={probe} />
      </MemoryRouter>
    ))
    expect(given.router.getLocation().pathname).toBe('/b')
    given.unmount()

    const made = mount((probe) => (
      <MemoryRouter initialEntries={['/first', '/second?tab=2']}>
        <Route path="*" component={probe} />
      </MemoryRouter>
    ))
    expect(made.router.getLocation()).toMatchObject({ pathname: '/second', search: '?tab=2' })
    made.unmount()
  })
})
