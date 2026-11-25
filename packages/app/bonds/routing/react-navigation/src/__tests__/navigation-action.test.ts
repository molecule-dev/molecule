import { afterEach, describe, expect, it, vi } from 'vitest'

// The bond takes only types from its peer, so an empty module stands in for it.
vi.mock('@molecule/app-routing', () => ({}))

const logged = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock('@molecule/app-logger', () => ({ getLogger: () => logged }))

import type { Router } from '../index.js'
import { createReactNavigationRouter } from '../index.js'
import type { NavigationRef, NavigationState, PartialNavigationState } from '../types.js'

// Flush microtasks so the router's async navigate() completes
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/** One route of the fake navigator's state; `state` holds a nested navigator. */
type Route = NavigationState['routes'][number]

const route = (name: string, key: string, params?: object, state?: NavigationState): Route => ({
  name,
  key,
  params,
  state,
})

/** A stack navigator with the last route focused. */
const stack = (...routes: Route[]): NavigationState => ({ index: routes.length - 1, routes })

/** React Navigation keeps a partial state for a navigator it is not rendering; the fake changes only full ones. */
const isNavigationState = (
  value: NavigationState | PartialNavigationState | undefined,
): value is NavigationState => value !== undefined && value.index !== undefined

/**
 * A navigation ref with the behaviour of React Navigation 7's stack router that these tests rely
 * on, over a state tree the test can also change by hand:
 * - `navigate` to the focused screen sets its params and keeps its instance; to another screen it
 *   pushes a new instance on the focused navigator's stack.
 * - A `PUSH` action pushes a new instance, of the focused screen too; a `REPLACE` action swaps the
 *   focused route for a new instance.
 * - `goBack` removes the focused route of the deepest navigator that keeps more than one.
 * Every change fires one `state` event, as the container does after it commits a state.
 * `setRoot` changes the whole state from the device's side (the back button, a gesture, a
 * navigator the router did not ask) and fires the event too.
 */
const createNavigation = (
  initial: NavigationState,
): { navigationRef: NavigationRef; setRoot: (next: NavigationState) => void } => {
  let root = initial
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of [...listeners]) listener()
  }

  /** The navigators on the way to the focused route, outermost first. */
  const path = (state: NavigationState): NavigationState[] => {
    const nested = state.routes[state.index]?.state
    return isNavigationState(nested) ? [state, ...path(nested)] : [state]
  }

  /** The deepest navigator on the way to the focused route. */
  const leaf = (state: NavigationState): NavigationState => {
    const navigators = path(state)
    return navigators[navigators.length - 1]
  }

  /** Every route key in the state tree. */
  const keys = (state: NavigationState, into: Set<string> = new Set()): Set<string> => {
    for (const r of state.routes) {
      into.add(r.key)
      if (isNavigationState(r.state)) keys(r.state, into)
    }
    return into
  }

  /** The key of the next instance of a screen, past the ones in the tree. */
  const nextKey = (name: string): string => {
    const taken = keys(root)
    let n = 1
    while (taken.has(`${name}-${n}`)) n++
    return `${name}-${n}`
  }

  const push = (name: string, params?: object): void => {
    const navigator = leaf(root)
    navigator.routes.push(route(name, nextKey(name), params))
    navigator.index = navigator.routes.length - 1
    emit()
  }

  const navigationRef: NavigationRef = {
    navigate: (name, params) => {
      const navigator = leaf(root)
      const focused = navigator.routes[navigator.index]
      if (focused.name === name) {
        focused.params = params
        emit()
      } else {
        push(name, params)
      }
    },
    goBack: () => {
      const target = path(root)
        .reverse()
        .find((navigator) => navigator.routes.length > 1)
      if (!target) return
      target.routes.pop()
      target.index = target.routes.length - 1
      emit()
    },
    canGoBack: () => path(root).some((navigator) => navigator.routes.length > 1),
    getCurrentRoute: () => {
      const navigator = leaf(root)
      return navigator.routes[navigator.index]
    },
    getState: () => root,
    dispatch: (action) => {
      const payload = action.payload
      if (payload === undefined || !('name' in payload) || typeof payload.name !== 'string') return
      const params =
        'params' in payload && typeof payload.params === 'object' && payload.params !== null
          ? payload.params
          : undefined
      if (action.type === 'PUSH') {
        push(payload.name, params)
      } else if (action.type === 'REPLACE') {
        const navigator = leaf(root)
        navigator.routes.splice(
          navigator.routes.length - 1,
          1,
          route(payload.name, nextKey(payload.name), params),
        )
        emit()
      }
    },
    addListener: (_event, callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    // The navigator is mounted from the start here.
    isReady: () => true,
  }

  return {
    navigationRef,
    setRoot: (next) => {
      root = next
      emit()
    },
  }
}

const screens = {
  Home: '/',
  Products: '/products',
  Settings: '/settings',
  Auth: '/auth',
  Main: '/main',
  FeedTab: '/',
  SearchTab: '/search',
  Feed: '/',
  Article: '/articles/:id',
  Comments: '/articles/:id/comments',
  Search: '/search',
  Filters: '/search/filters',
}

const created: Router[] = []

afterEach(() => {
  for (const router of created) router.destroy()
  created.length = 0
})

/** A router over a navigation ref, recording `pathname key action` for each route change. */
const observe = (navigationRef: NavigationRef): { router: Router; events: string[] } => {
  const router = createReactNavigationRouter({ navigationRef, linking: { screens } })
  created.push(router)
  const events: string[] = []
  router.subscribe((location, action) => {
    events.push(`${location.pathname} ${location.key} ${action}`)
  })
  return { router, events }
}

/** The navigation and the router over it, starting from `initial`. */
const setup = (
  initial: NavigationState,
): ReturnType<typeof createNavigation> & ReturnType<typeof observe> => {
  const navigation = createNavigation(initial)
  return { ...navigation, ...observe(navigation.navigationRef) }
}

/**
 * A navigation ref of a container that mounts after the router is created, as
 * `useMoleculeRouter` gets one: it has no state until the test shows one, and counts how
 * often its state and its focused route are read.
 */
const createLateNavigation = (): {
  navigationRef: NavigationRef
  show: (state: NavigationState | undefined, current: Route | undefined) => void
  reads: () => number
} => {
  let state: NavigationState | undefined
  let current: Route | undefined
  let fire: (() => void) | undefined
  let readCount = 0
  const navigationRef: NavigationRef = {
    navigate: () => {},
    goBack: () => {},
    canGoBack: () => false,
    getCurrentRoute: () => {
      readCount++
      return current
    },
    getState: () => {
      readCount++
      return state
    },
    dispatch: () => {},
    addListener: (_event, callback) => {
      fire = callback
      return () => {
        fire = undefined
      }
    },
    // Ready once the container has mounted with a state.
    isReady: () => state !== undefined,
  }
  return {
    navigationRef,
    show: (nextState, nextCurrent) => {
      state = nextState
      current = nextCurrent
      fire?.()
    },
    reads: () => readCount,
  }
}

/** A tab navigator keeping a Feed tab and a Search tab, each a stack navigator. */
const tabs = (index: number, feed: NavigationState, search: NavigationState): NavigationState => ({
  index,
  routes: [
    route('FeedTab', 'FeedTab-1', undefined, feed),
    route('SearchTab', 'SearchTab-1', undefined, search),
  ],
})

const feedStack = (): NavigationState =>
  stack(route('Feed', 'Feed-1'), route('Article', 'Article-1', { id: '7' }))
const searchStack = (): NavigationState => stack(route('Search', 'Search-1'))

describe('route change action (react-navigation)', () => {
  it('reports a screen pushed on top of the stack as push, once', () => {
    const { navigationRef, events } = setup(stack(route('Home', 'Home-1')))

    navigationRef.navigate('Products')

    expect(events).toEqual(['/products Products-1 push'])
  })

  it('reports a second instance of the same screen as push, once', () => {
    const { navigationRef, events } = setup(stack(route('Home', 'Home-1')))

    navigationRef.dispatch({ type: 'PUSH', payload: { name: 'Home' } })

    expect(events).toEqual(['/ Home-2 push'])
  })

  it('reports router.back() to the previous instance of the same screen as pop, once', () => {
    const { navigationRef, router, events } = setup(stack(route('Home', 'Home-1')))
    navigationRef.dispatch({ type: 'PUSH', payload: { name: 'Home' } })

    router.back()

    expect(events).toEqual(['/ Home-2 push', '/ Home-1 pop'])
  })

  it('reports router.go(-1) as pop, once', () => {
    const { navigationRef, router, events } = setup(stack(route('Home', 'Home-1')))
    navigationRef.navigate('Products')

    router.go(-1)

    expect(events).toEqual(['/products Products-1 push', '/ Home-1 pop'])
  })

  it('reports a back that starts on the device, with no router call, as pop, once', () => {
    const { setRoot, events } = setup(
      stack(route('Home', 'Home-1'), route('Products', 'Products-1')),
    )

    // The back button or a back gesture: only the navigator's state changes.
    setRoot(stack(route('Home', 'Home-1')))

    expect(events).toEqual(['/ Home-1 pop'])
  })

  it('reports navigate with replace as replace, once', async () => {
    const { router, events } = setup(
      stack(route('Home', 'Home-1'), route('Products', 'Products-1')),
    )

    router.navigate('/settings', { replace: true })
    await flush()

    expect(events).toEqual(['/settings Settings-1 replace'])
  })

  it('reports a replace the navigator performs as replace, once', () => {
    const { navigationRef, events } = setup(stack(route('Home', 'Home-1')))

    navigationRef.dispatch({ type: 'REPLACE', payload: { name: 'Settings' } })

    expect(events).toEqual(['/settings Settings-1 replace'])
  })

  it('keeps reporting a change that only sets params as push, once', () => {
    const { navigationRef, router, events } = setup(stack(route('Home', 'Home-1')))
    const states: unknown[] = []
    router.subscribe((location) => states.push(location.state))

    // React Navigation keeps the instance: the focused route's key stays, only its params change.
    navigationRef.navigate('Home', { tab: 'x' })

    expect(events).toEqual(['/ Home-1 push'])
    expect(states).toEqual([{ tab: 'x' }])
  })

  it('reports nothing for a back there is nowhere to go back to, nor for forward', () => {
    const { router, events } = setup(stack(route('Home', 'Home-1')))

    router.back()
    router.forward()
    router.go(1)
    router.go(0)

    expect(events).toEqual([])
  })

  it('reports each navigation of a mixed sequence exactly once', async () => {
    const { navigationRef, router, setRoot, events } = setup(stack(route('Home', 'Home-1')))

    navigationRef.navigate('Products')
    navigationRef.dispatch({ type: 'PUSH', payload: { name: 'Products' } })
    router.back()
    router.navigate('/settings', { replace: true })
    await flush()
    navigationRef.navigate('Settings', { tab: 'a' })
    setRoot(stack(route('Home', 'Home-1')))

    expect(events).toEqual([
      '/products Products-1 push',
      '/products Products-2 push',
      '/products Products-1 pop',
      '/settings Settings-1 replace',
      '/settings Settings-1 push',
      '/ Home-1 pop',
    ])
  })

  it('reads the state before the first change from the running navigator', () => {
    // The router is created while the navigator is already showing the second screen of a stack.
    const { setRoot, events } = setup(
      stack(route('Home', 'Home-1'), route('Products', 'Products-1')),
    )

    setRoot(stack(route('Home', 'Home-1')))

    expect(events).toEqual(['/ Home-1 pop'])
  })

  it('does not read the state while the navigator is not ready', () => {
    // React Navigation logs an error for a state read before its container has a navigator,
    // and useMoleculeRouter creates the router before the container mounts.
    const late = createLateNavigation()
    observe(late.navigationRef)
    // A ref without isReady at all: nothing is read at creation either.
    const older = createLateNavigation()
    observe({ ...older.navigationRef, isReady: undefined })

    expect(late.reads()).toBe(0)
    expect(older.reads()).toBe(0)
  })

  it('reports the first state of a navigator as push, then classifies against the last one', () => {
    const { navigationRef, show } = createLateNavigation()
    const { events } = observe(navigationRef)

    // The container mounts after the router was created.
    show(stack(route('Home', 'Home-1')), route('Home', 'Home-1'))
    show(
      stack(route('Home', 'Home-1'), route('Settings', 'Settings-1')),
      route('Settings', 'Settings-1'),
    )
    show(stack(route('Home', 'Home-1')), route('Home', 'Home-1'))

    expect(events).toEqual(['/ Home-1 push', '/settings Settings-1 push', '/ Home-1 pop'])
  })

  it('reports every change as push while the state cannot be read', () => {
    const { navigationRef, show } = createLateNavigation()
    const { events } = observe(navigationRef)

    // Without a state there is nothing to tell a back from a push by.
    show(undefined, route('Home', 'Home-1'))
    show(undefined, route('Settings', 'Settings-1'))
    show(undefined, route('Home', 'Home-1'))

    expect(events).toEqual(['/ Home-1 push', '/settings Settings-1 push', '/ Home-1 push'])
  })

  it('reports a change as push when no focused route can be read', () => {
    const { navigationRef, show } = createLateNavigation()
    const { events } = observe(navigationRef)

    show(
      stack(route('Home', 'Home-1'), route('Settings', 'Settings-1')),
      route('Settings', 'Settings-1'),
    )
    // A stack that looks like a replacement, with no focused route to say where it went:
    // the location is the bare `/`, and nothing is read into the change.
    show(stack(route('Home', 'Home-1'), route('Products', 'Products-1')), undefined)

    expect(events).toEqual(['/settings Settings-1 push', '/ undefined push'])
  })

  it('does not read a back into a state older than the last change', () => {
    const { navigationRef, show } = createLateNavigation()
    const { events } = observe(navigationRef)

    show(
      stack(route('Home', 'Home-1'), route('Settings', 'Settings-1')),
      route('Settings', 'Settings-1'),
    )
    // The navigator loses its state (the container is recreated), then comes back on another screen.
    show(undefined, route('Settings', 'Settings-1'))
    show(stack(route('Home', 'Home-1')), route('Home', 'Home-1'))

    expect(events).toEqual([
      '/settings Settings-1 push',
      '/settings Settings-1 push',
      '/ Home-1 push',
    ])
  })

  describe('nested navigators', () => {
    it('reports router.back() inside a nested stack as pop, once', () => {
      const { router, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      router.back()

      expect(events).toEqual(['/ Feed-1 pop'])
    })

    it('reports a back that leaves a nested navigator as pop, once', () => {
      const { setRoot, events } = setup(
        stack(
          route('Auth', 'Auth-1'),
          route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack())),
        ),
      )

      // A tab navigator answers a back by changing tab, not by dropping one, so the root stack
      // is the one that gives way: the device is shown changing to the state it ends in.
      setRoot(stack(route('Auth', 'Auth-1')))

      expect(events).toEqual(['/auth Auth-1 pop'])
    })

    it('reports a screen pushed inside a nested stack as push, once', () => {
      const { navigationRef, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      navigationRef.navigate('Comments', { id: '7' })

      expect(events).toEqual(['/articles/7/comments Comments-1 push'])
    })

    it('reports a replace inside a nested stack as replace, once', () => {
      const { navigationRef, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      navigationRef.dispatch({
        type: 'REPLACE',
        payload: { name: 'Comments', params: { id: '7' } },
      })

      expect(events).toEqual(['/articles/7/comments Comments-1 replace'])
    })

    it('reports moving to a tab the navigator already keeps as pop, once', () => {
      const { setRoot, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      setRoot(stack(route('Main', 'Main-1', undefined, tabs(1, feedStack(), searchStack()))))

      expect(events).toEqual(['/search Search-1 pop'])
    })

    it('keeps reporting a nested change that does not move focus as push, once', () => {
      const { setRoot, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      // The tab that is not focused gains a screen; the focused route stays the same.
      setRoot(
        stack(
          route(
            'Main',
            'Main-1',
            undefined,
            tabs(0, feedStack(), stack(route('Search', 'Search-1'), route('Filters', 'Filters-1'))),
          ),
        ),
      )

      expect(events).toEqual(['/articles/7 Article-1 push'])
    })

    it('reports the state a navigator adds when it mounts under a pushed route as push', () => {
      const { navigationRef, setRoot, events } = setup(stack(route('Auth', 'Auth-1')))

      // Pushing a screen that is a navigator, then the navigator mounting and adding its own state:
      // two state events from React Navigation, both for one new place.
      navigationRef.navigate('Main')
      setRoot(
        stack(
          route('Auth', 'Auth-1'),
          route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack())),
        ),
      )

      expect(events).toEqual(['/main Main-1 push', '/articles/7 Article-1 push'])
    })

    it('reports a nested navigator losing its state under the same screen as push', () => {
      const { setRoot, events } = setup(
        stack(route('Main', 'Main-1', undefined, tabs(0, feedStack(), searchStack()))),
      )

      // The nested navigator unmounts; the screen the user sees stays Main.
      setRoot(stack(route('Main', 'Main-1')))

      expect(events).toEqual(['/main Main-1 push'])
    })
  })
})
