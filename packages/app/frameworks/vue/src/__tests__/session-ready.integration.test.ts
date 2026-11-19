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

import { renderToString } from '@vue/server-renderer'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, inject, nextTick, onMounted, ref, type VNode } from 'vue'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import { useAuth } from '../composables/useAuth.js'
import { useTheme } from '../composables/useTheme.js'
import { useTranslation } from '../composables/useTranslation.js'
import { I18nKey } from '../injection-keys.js'
import { createAuthPlugin, moleculePlugin } from '../plugin.js'
import { SessionReady } from '../session-ready.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const wrappers: VueWrapper[] = []
const validToken = [btoa('{}'), btoa(JSON.stringify({ exp: 4_102_444_800 })), 'signature'].join('.')

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

/** Open a fresh client using the session storage from the previous document. */
function cachedVisitor(accessToken: string): AuthClient<UserProfile> {
  const storage = memoryStorage()
  const previous = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  previous.setSession({ accessToken, user: reader })
  previous.destroy()
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return client
}

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(initialize = true): {
  client: AuthClient<UserProfile>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((url) =>
      String(url).endsWith('/users/me')
        ? new Promise<Response>((resolve) => {
            respond = resolve
          })
        : Promise.resolve(
            Response.json({ accessToken: 'new-token', user: { ...reader, id: 'new-reader' } }),
          ),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  if (initialize) void client.initialize()
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
  vi.useRealTimers()
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

  it('renders an anonymous visitor on mount without entry initialization', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    expect(wrapper.text()).toContain('Public page')
    expect(client.getState().status).toBe('unauthenticated')
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
    expect(() => mount(SessionReady)).toThrow('useAuthClient must be used within an AuthProvider')
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

/**
 * The signed-in/signed-out page the held shell renders once the session is decided.
 *
 * @returns The page component.
 */
function sessionPage() {
  return defineComponent({
    setup() {
      const { status, user } = useAuth<UserProfile>()
      return () =>
        h(
          'h1',
          status.value === 'authenticated' ? `Signed in as ${user.value?.name}` : 'Signed out',
        )
    },
  })
}

/**
 * Server-renders a component with the molecule plugin installed, as `main.ts` wires it.
 *
 * @param component - The component to render.
 * @param client - The auth client to install.
 * @returns The rendered markup.
 */
function serverRender(
  component: ReturnType<typeof defineComponent>,
  client: AuthClient<UserProfile>,
): Promise<string> {
  const app = createSSRApp(component)
  app.use(moleculePlugin, { auth: client })
  return renderToString(app)
}

describe('session hold parity', () => {
  it('waits for one current-user read when the previous document stored only the token', async () => {
    let respond!: (response: Response) => void
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    const storage = memoryStorage()
    storage.setItem('molecule:auth:accessToken', validToken)
    const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
    clients.push(client)
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h(sessionPage()),
        () => h('p', 'Restoring'),
      ),
    )
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('Restoring')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: `Bearer ${validToken}` }),
      }),
    )
    respond(Response.json({ user: reader }))
    await client.whenRestored!()
    await nextTick()
    expect(wrapper.find('h1').text()).toBe('Signed in as Reader')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('renders a cached opaque-token session before a current-user read and verifies it once', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn(async () => Response.json({ user: reader }))
    vi.stubGlobal('fetch', fetchSpy)
    const client = cachedVisitor('opaque-token')
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h(sessionPage()),
        () => h('p', 'Restoring'),
      ),
    )
    expect(wrapper.find('h1').text()).toBe('Signed in as Reader')
    expect(fetchSpy).not.toHaveBeenCalled()

    await Promise.all([client.initialize(), client.initialize()])
    await client.initialize()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('provides theme and translations to its session fallback', async () => {
    const { client, answer } = returningVisitor()
    const i18n = createSimpleI18nProvider()
    i18n.addTranslations('en', { restoring: 'Translated restore' })
    const theme: ThemeProviderType = {
      getTheme: () => lightTheme,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
      getThemes: () => [lightTheme],
    }
    const Fallback = defineComponent({
      setup() {
        const { theme } = useTheme()
        const { t } = useTranslation()
        return () => h('p', `${theme.value.name}: ${t('restoring')}`)
      },
    })
    const wrapper = mount(
      gatedPage(
        () => h('p', 'Public page'),
        () => h(Fallback),
      ),
      { global: { plugins: [[moleculePlugin, { auth: client, theme, i18n }]] } },
    )
    wrappers.push(wrapper)
    expect(wrapper.text()).toBe(`${lightTheme.name}: Translated restore`)
    await answer()
    expect(wrapper.text()).toBe('Public page')
  })

  it('allows an explicit ungated synchronous server shell without starting restoration', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const shell = defineComponent({ setup: () => () => h('p', 'Server page') })
    expect(await serverRender(shell, client)).toContain('Server page')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('server-renders the fallback while a cookie restore is pending', async () => {
    const { client, answer } = returningVisitor(false)
    const page = gatedPage(
      () => h('p', 'Server page'),
      () => h('p', 'Restoring'),
    )
    expect(await serverRender(page, client)).toContain('Restoring')
    await answer()
    expect(await serverRender(page, client)).toContain('Server page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lazily restores exactly once under StrictMode without initialize()', async () => {
    const { client, answer } = returningVisitor(false)
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    expect(wrapper.text()).not.toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
    await answer()
    expect(wrapper.text()).toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('releases a sign-out during the hold and ignores the late restored user', async () => {
    const { client, answer } = returningVisitor()
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    expect(wrapper.text()).not.toContain('Public page')
    await client.logout()
    await nextTick()
    expect(wrapper.text()).toContain('Public page')
    await answer()
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('releases a hung restore instead of leaving a blank page forever', async () => {
    vi.useFakeTimers()
    const { client } = returningVisitor()
    const wrapper = mountApp(
      client,
      gatedPage(() => h('p', 'Public page')),
    )
    expect(wrapper.text()).not.toContain('Public page')
    await vi.advanceTimersByTimeAsync(10_000)
    await nextTick()
    expect(wrapper.text()).toContain('Public page')
    expect(client.getState().status).toBe('unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('an explicit opt-out permits an early click, so the shell owns its action readiness', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    const wrapper = mountApp(client, followButton(onFollow))
    await wrapper.find('button').trigger('click')
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders an anonymous visitor as signed out immediately without a hold', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const wrapper = mountApp(
      client,
      gatedPage(
        () => h(sessionPage()),
        () => h('p', 'Restoring'),
      ),
    )
    expect(wrapper.text()).not.toContain('Restoring')
    expect(wrapper.find('h1').text()).toBe('Signed out')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders at once when no auth client is given', () => {
    const plain = mount(defineComponent({ setup: () => () => h('p', 'Public page') }))
    wrappers.push(plain)
    expect(plain.text()).toContain('Public page')
  })
})

/**
 * Mounts through either provider form: the auth-only plugin (`auth`) or the
 * full molecule plugin (`molecule`). Both install the auth client the session
 * hold reads.
 *
 * @param provider - Which provider form installs the client.
 * @param client - The auth client to install.
 * @param component - The component to mount.
 * @returns The mounted wrapper.
 */
function mountThrough(
  provider: 'auth' | 'molecule',
  client: AuthClient<UserProfile>,
  component: ReturnType<typeof defineComponent>,
): VueWrapper {
  const wrapper =
    provider === 'auth'
      ? mount(component, { global: { plugins: [createAuthPlugin(client)] } })
      : mount(component, { global: { plugins: [[moleculePlugin, { auth: client }]] } })
  wrappers.push(wrapper)
  return wrapper
}

describe('session provider defaults', () => {
  it.each(['auth', 'molecule'] as const)(
    '%s provider waits by default so a returning inventory operator can use the first action',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const changed = vi.fn()
      const inventoryAction = defineComponent({
        setup() {
          const { user, status } = useAuth<UserProfile>()
          return () =>
            h(
              'button',
              {
                onClick: () => {
                  if (status.value !== 'authenticated' || !user.value) return
                  changed(user.value.id)
                },
              },
              'Reserve stock',
            )
        },
      })
      const wrapper = mountThrough(
        provider,
        client,
        gatedPage(() => h(inventoryAction)),
      )
      expect(wrapper.find('button').exists()).toBe(false)
      await answer()
      await wrapper.find('button').trigger('click')
      expect(changed).toHaveBeenCalledExactlyOnceWith(reader.id)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider seeds a mounted profile form from the restored user by default',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const profileDraft = defineComponent({
        setup() {
          const { user } = useAuth<UserProfile>()
          return () => h('input', { 'aria-label': 'Display name', value: user.value?.name ?? '' })
        },
      })
      const wrapper = mountThrough(
        provider,
        client,
        gatedPage(
          () => h(profileDraft),
          () => h('p', 'Restoring profile'),
        ),
      )
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.text()).toContain('Restoring profile')
      await answer()
      expect((wrapper.get('input').element as HTMLInputElement).value).toBe(reader.name)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider renders a cached visitor on the first render without entry initialization',
    (provider) => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)
      const client = cachedVisitor(validToken)
      const wrapper = mountThrough(
        provider,
        client,
        gatedPage(() => h(sessionPage())),
      )
      expect(wrapper.get('h1').text()).toBe('Signed in as Reader')
      expect(fetchSpy).not.toHaveBeenCalled()
    },
  )

  it.each(['login', 'register'] as const)(
    'keeps the page mounted after %s wins a pending restore',
    async (method) => {
      const { client, answer } = returningVisitor()
      const nameInput = defineComponent({
        setup() {
          const { user } = useAuth<UserProfile>()
          const element = ref<HTMLInputElement | null>(null)
          // React's `defaultValue` seeds an uncontrolled input once, at mount.
          onMounted(() => {
            if (element.value) element.value.value = user.value?.name ?? ''
          })
          return () => h('input', { ref: element, 'aria-label': 'Profile name' })
        },
      })
      const wrapper = mountThrough(
        'molecule',
        client,
        gatedPage(() => h(nameInput)),
      )
      await client[method]({ email: 'new@example.test', password: 'password' })
      await nextTick()
      const input = wrapper.get('[aria-label="Profile name"]').element as HTMLInputElement
      input.value = 'Unsaved draft'
      await answer()
      client.setUser({ ...reader, id: 'new-reader', name: 'Updated' })
      await nextTick()
      expect(wrapper.get('[aria-label="Profile name"]').element).toBe(input)
      expect(input.value).toBe('Unsaved draft')
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    },
  )
})
