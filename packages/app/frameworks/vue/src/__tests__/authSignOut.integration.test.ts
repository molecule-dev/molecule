// @vitest-environment jsdom

/**
 * `useAuth` local sign-out against the real auth client.
 *
 * @module
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { createJWTAuthClient, type StorageAdapter, type UserProfile } from '@molecule/app-auth'

import { useAuth, useAuthClient } from '../composables/useAuth.js'
import { moleculePlugin } from '../plugin.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }

function createStorage(): StorageAdapter {
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

const Header = defineComponent({
  setup() {
    const { isAuthenticated, status, setUser, user: currentUser } = useAuth<UserProfile>()
    const client = useAuthClient<UserProfile>()
    return () => {
      const authStatus = h('output', { 'aria-label': 'Auth status' }, status.value)
      if (!isAuthenticated.value) {
        return h('div', [h('a', { href: '/login' }, 'Sign in'), authStatus])
      }
      return h('div', [
        h('span', `Signed in as ${currentUser.value?.name ?? ''}`),
        h(
          'button',
          {
            type: 'button',
            onClick: () => {
              client.setAccessToken(null)
              setUser(null)
            },
          },
          'Sign out',
        ),
        authStatus,
      ])
    }
  },
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('useAuth local sign-out', () => {
  it('renders signed out after the setAccessToken(null) + setUser(null) sequence and stays signed out on reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const wrapper = mount(Header, {
      global: { plugins: [[moleculePlugin, { auth: client }]] },
    })
    expect(wrapper.get('span').text()).toBe('Signed in as Reader')
    expect(wrapper.get('output').text()).toBe('authenticated')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('a').attributes('href')).toBe('/login')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('output').text()).toBe('unauthenticated')
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getUser()).toBeNull()
    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')

    const reloaded = createJWTAuthClient({ storage, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(reloaded.getAccessToken()).toBeNull()
    expect(reloaded.getRefreshToken()).toBeNull()
    expect(fetchBoundary).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
