// @vitest-environment jsdom

/**
 * `useLinkRouter`: the router a link to a destination navigates through, with a router provided and
 * with none, which is how every binding's `Link` tells a URL outside the app from an app path.
 *
 * @module
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import { useLinkRouter } from '../composables/useRouter.js'
import { moleculePlugin } from '../plugin.js'

/** What a probe read, by destination: the router, or `null`. */
type Read = Record<string, Router | null>

/** The key of the error a routing composable throws with no router provided. */
const NO_ROUTER_ERROR_KEY = 'vue.error.useRouterOutsideProvider'

const wrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * A component that calls `useLinkRouter` in setup for each destination and
 * records what it gave.
 *
 * @param read - Where to record, by destination.
 * @param destinations - The destinations to ask about.
 * @returns The component.
 */
const asksAbout = (read: Read, destinations: string[]) =>
  defineComponent({
    setup() {
      for (const to of destinations) read[to] = useLinkRouter(to).value
      return () => null
    },
  })

/** What `useLinkRouter` gave, or the error it threw, for a destination. */
const outcomeOf = (linkRouter: (to: string) => Router | null, to: string): unknown => {
  try {
    return linkRouter(to)
  } catch (error) {
    return error
  }
}

describe('useLinkRouter', () => {
  it('gives the mounted router for an app path and for a URL', () => {
    const router = createMemoryRouter()
    const read: Read = {}
    wrappers.push(
      mount(
        asksAbout(read, [
          '/settings?tab=billing#plan',
          'https://elsewhere.example/page',
          'mailto:help@example.com',
        ]),
        {
          global: { plugins: [[moleculePlugin, { router }]] },
        },
      ),
    )
    expect(read['/settings?tab=billing#plan']).toBe(router)
    expect(read['https://elsewhere.example/page']).toBe(router)
    expect(read['mailto:help@example.com']).toBe(router)
  })

  it('gives null for a URL outside the app with no router mounted', () => {
    const read: Read = {}
    wrappers.push(
      mount(
        asksAbout(read, [
          'https://elsewhere.example/page',
          'mailto:help@example.com',
          '//cdn.example/file',
        ]),
      ),
    )
    expect(read['https://elsewhere.example/page']).toBeNull()
    expect(read['mailto:help@example.com']).toBeNull()
    expect(read['//cdn.example/file']).toBeNull()
  })

  it('throws the no-router error for an app path with no router mounted', () => {
    let thrown: unknown
    try {
      wrappers.push(mount(asksAbout({}, ['/settings?tab=billing#plan'])))
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown instanceof I18nError ? thrown.i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })

  it('checks a destination again when it changes from a URL to an app path', async () => {
    const to = ref('https://elsewhere.example/page')
    const seen: unknown[] = []
    const Probe = defineComponent({
      setup() {
        const router = useLinkRouter(to)
        // A link's render reads the router for the destination it shows.
        return () => {
          seen.push(router.value)
          return null
        }
      },
    })
    wrappers.push(
      mount(Probe, {
        // Vue hands a render's error to this handler instead of logging it.
        global: { config: { errorHandler: (error: unknown) => seen.push(error) } },
      }),
    )
    expect(seen).toEqual([null])
    to.value = '/settings'
    await nextTick()
    expect(seen).toHaveLength(2)
    expect(seen[1]).toBeInstanceOf(I18nError)
    expect(seen[1] instanceof I18nError ? seen[1].i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })

  it('gives a function to call with the destination when called without one', () => {
    const router = createMemoryRouter()
    const read: (Router | null)[] = []
    const Probe = defineComponent({
      setup() {
        const linkRouter = useLinkRouter()
        for (const to of ['/settings', 'https://elsewhere.example/page']) {
          read.push(linkRouter(to))
        }
        return () => null
      },
    })
    wrappers.push(mount(Probe, { global: { plugins: [[moleculePlugin, { router }]] } }))
    expect(read).toEqual([router, router])
  })

  it('gives that function with no router too, and it fails an app path there', () => {
    const given: unknown[] = []
    const Probe = defineComponent({
      setup() {
        const linkRouter = useLinkRouter()
        given.push(
          outcomeOf(linkRouter, 'https://elsewhere.example/page'),
          outcomeOf(linkRouter, '/settings'),
        )
        return () => null
      },
    })
    wrappers.push(mount(Probe))
    expect(given[0]).toBeNull()
    expect(given[1]).toBeInstanceOf(I18nError)
    expect(given[1] instanceof I18nError ? given[1].i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })
})
