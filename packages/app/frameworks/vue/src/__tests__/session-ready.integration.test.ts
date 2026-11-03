// @vitest-environment jsdom

/**
 * `SessionReady` against the real restoring auth client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page load.
 * Pages that rendered before it answered read `user === null`: five X1 runs lost their follow
 * test to a Follow button whose handler checked `!user` (a no-op or a redirect to `/login`) on
 * the profile page the suite opened with `page.goto`.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject, nextTick, onMounted, type VNode } from 'vue'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { useAuth } from '../composables/useAuth.js'
import { I18nKey } from '../injection-keys.js'
import { moleculePlugin } from '../plugin.js'
import { SessionReady } from '../session-ready.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const wrappers: VueWrapper[] = []

function memoryStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(): { client: AuthClient<UserProfile>; answer: () => Promise<void> } {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  void client.initialize()
  return {
    client,
    answer: async () => {
      respond?.(
        new Response(JSON.stringify({ user: reader }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      await client.whenRestored!()
      await nextTick()
    },
  }
}

/** Mounts through the plugin, as the scaffold's main.ts wires the app. */
function mountApp(client: AuthClient<UserProfile>, component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

/** The handler shape the runs wrote: a signed-in action that bails out when `user` is null. */
function followButton(onFollow: (by: string) => void) {
  return defineComponent({
    setup() {
      const { user } = useAuth<UserProfile>()
      return () =>
        h(
          'button',
          {
            type: 'button',
            onClick: () => {
              if (!user.value) return
              onFollow(user.value.id)
            },
          },
          'Follow',
        )
    },
  })
}

/** A public page gated by `SessionReady`, as the scaffold wraps its `<RouterView />`. */
function gatedPage(defaults: () => VNode, fallback?: () => VNode) {
  return defineComponent({
    setup() {
      return () =>
        h(SessionReady, null, {
          default: defaults,
          ...(fallback ? { fallback } : {}),
        })
    },
  })
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('SessionReady', () => {
  it('shows no page until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    const wrapper = mountApp(
      client,
      gatedPage(() => h(followButton(onFollow))),
    )
    expect(wrapper.find('button').exists()).toBe(false)

    await answer()
    await wrapper.find('button').trigger('click')
    expect(onFollow).toHaveBeenCalledWith('reader')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('without it, the same click lands before the restore and is lost', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    const wrapper = mountApp(client, followButton(onFollow))
    await wrapper.find('button').trigger('click')
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders a visitor with no session to restore without waiting on a request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.ts does before the first render.
    void client.initialize()
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    await client.whenRestored!()
    await nextTick()
    expect(client.getState().status).toBe('unauthenticated')
    expect(wrapper.text()).toContain('Public page')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.ts does before the first render.
    void client.initialize()
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h('p', 'Public page'),
        () => h('p', 'Restoring'),
      ),
    )
    expect(wrapper.text()).toContain('Restoring')
    await client.whenRestored!()
    await nextTick()
    expect(client.getState().status).toBe('unavailable')
    expect(wrapper.text()).toContain('Public page')
  })

  it('renders at once when no auth client is installed, and throws if used anyway', () => {
    const plain = mount(defineComponent({ setup: () => () => h('p', 'Public page') }))
    wrappers.push(plain)
    expect(plain.text()).toContain('Public page')
    // Like every composable consumer, SessionReady requires its service.
    expect(() => mount(SessionReady)).toThrow('useAuthClient requires AuthProvider to be provided')
  })

  it('renders its fallback, then the children with the restored user', async () => {
    const { client, answer } = returningVisitor()
    const name = defineComponent({
      setup() {
        const { user } = useAuth<UserProfile>()
        return () => h('p', user.value ? `Signed in as ${user.value.name}` : 'Signed out')
      },
    })
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h(name),
        () => h('p', 'Restoring'),
      ),
    )
    expect(wrapper.text()).toContain('Restoring')
    expect(wrapper.text()).not.toContain('Signed out')
    await answer()
    expect(wrapper.text()).toContain('Signed in as Reader')
  })

  it('rechecks the session after a fallback decides it before the parent mounts', async () => {
    const { client, answer } = returningVisitor()
    const fallback = defineComponent({
      setup() {
        onMounted(() => client.setSession({ accessToken: 'replacement-token', user: reader }))
        return () => h('p', 'Restoring')
      },
    })
    const onFollow = vi.fn()
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h(followButton(onFollow)),
        () => h(fallback),
      ),
    )
    await nextTick()
    expect(client.getState().status).toBe('authenticated')
    expect(wrapper.find('button').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    expect(onFollow).toHaveBeenCalledWith('reader')
    await answer()
  })

  it('keeps other plugin services available to the fallback slot', async () => {
    const { client, answer } = returningVisitor()
    const service = { t: () => 'Restoring' }
    const fallback = defineComponent({
      setup() {
        const i18n = inject(I18nKey)
        return () => h('p', i18n?.t('session.loading'))
      },
    })
    const wrapper = mount(
      gatedPage(
        () => h('p', 'Public page'),
        () => h(fallback),
      ),
      {
        global: {
          plugins: [[moleculePlugin, { auth: client }]],
          provide: { [I18nKey as symbol]: service },
        },
      },
    )
    wrappers.push(wrapper)
    expect(wrapper.text()).toBe('Restoring')
    await answer()
    expect(wrapper.text()).toBe('Public page')
  })

  it('starts an omitted initialize call and renders after a restore timeout', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
      requestTimeout: 20,
    })
    clients.push(client)
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    await client.whenRestored!()
    await nextTick()
    expect(client.getState().status).toBe('unavailable')
    expect(wrapper.text()).toBe('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
