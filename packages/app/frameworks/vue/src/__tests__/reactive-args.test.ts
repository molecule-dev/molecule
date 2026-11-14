// @vitest-environment jsdom
/**
 * Reactive hook arguments: the composables whose arguments a host can change
 * follow them on the SAME component (Vue's `MaybeRefOrGetter`), the way React
 * re-renders the same hook instance. These tests pin the package-local
 * behaviors beyond the shared conformance cases: call-time reads, the
 * mount-only `immediate`, the fresh-form `resetKey`, and a live `checkOnMount`.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(() => ({
    checkPermission: vi.fn().mockResolvedValue('granted'),
  })),
}))

vi.mock('@molecule/app-logger', () => ({
  getLogger: vi.fn(() => ({ warn: vi.fn() })),
}))

import { getProvider } from '@molecule/app-push'

import { useForm } from '../composables/useForms.js'
import { useHttp, type UseHttpReturn } from '../composables/useHttp.js'
import { usePush } from '../composables/usePush.js'
import { moleculePlugin } from '../plugin.js'

interface ScriptedClient {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const scriptedClient = (): ScriptedClient => ({
  get: vi.fn(() => Promise.resolve({ data: { who: 'first' }, status: 200 })),
  post: vi.fn(() => Promise.resolve({ data: null, status: 201 })),
  put: vi.fn(() => Promise.resolve({ data: null, status: 200 })),
  patch: vi.fn(() => Promise.resolve({ data: null, status: 200 })),
  delete: vi.fn(() => Promise.resolve({ data: null, status: 204 })),
})

/**
 * Mounts one component whose setup runs `capture`, under a minimal app with
 * the given services.
 *
 * @param capture - Calls the composables inside setup.
 * @param services - Services `moleculePlugin` provides.
 * @returns The mounted wrapper.
 */
function mountComposable(
  capture: () => void,
  services: Record<string, unknown>,
): ReturnType<typeof mount> {
  return mount(
    defineComponent({
      setup() {
        capture()
        return () => h('div')
      },
    }),
    {
      global: {
        plugins: [[moleculePlugin, services]],
      },
    },
  )
}

describe('reactive hook arguments', () => {
  it('useHttp reads a reactive url and method when execute runs, not at setup', async () => {
    const client = scriptedClient()
    const method = ref<'GET' | 'POST'>('GET')
    const url = ref('/first')
    let result!: UseHttpReturn<{ who: string }>
    const wrapper = mountComposable(
      () => {
        result = useHttp(method, url)
      },
      { http: client },
    )

    url.value = '/second'
    method.value = 'POST'
    await nextTick()
    await result.execute()

    expect(client.get).not.toHaveBeenCalled()
    expect(client.post).toHaveBeenCalledWith('/second', undefined, {})
    wrapper.unmount()
  })

  it('useHttp keeps a pending request across a reactive url change and the newer one owns the state', async () => {
    let resolveFirst!: (value: { data: unknown; status: number }) => void
    let resolveSecond!: (value: { data: unknown; status: number }) => void
    const client = scriptedClient()
    client.get.mockImplementation((url: string) =>
      url === '/first'
        ? new Promise((resolve) => {
            resolveFirst = resolve
          })
        : new Promise((resolve) => {
            resolveSecond = resolve
          }),
    )
    const url = ref('/first')
    let result!: UseHttpReturn<{ who: string }>
    const wrapper = mountComposable(
      () => {
        result = useHttp('GET', url)
      },
      { http: client },
    )

    const first = result.execute()
    url.value = '/second'
    await nextTick()
    const second = result.execute()

    resolveSecond({ data: { who: 'second' }, status: 200 })
    resolveFirst({ data: { who: 'first' }, status: 200 })
    await Promise.all([first, second])

    expect(result.data.value).toEqual({ who: 'second' })
    expect(result.loading.value).toBe(false)
    wrapper.unmount()
  })

  it('useHttp immediate runs once even when a reactive url changes', async () => {
    const client = scriptedClient()
    const url = ref('/first')
    const wrapper = mountComposable(
      () => {
        useHttp('GET', url, { immediate: true })
      },
      { http: client },
    )

    url.value = '/later'
    await nextTick()
    await nextTick()

    expect(client.get).toHaveBeenCalledTimes(1)
    expect(client.get).toHaveBeenCalledWith('/first', {})
    wrapper.unmount()
  })

  it('useForm follows a reactive resetKey to a fresh form and keeps edits without one', async () => {
    const options = ref({
      defaultValues: { email: 'a@b.c' },
      resetKey: 'record-1',
    })
    let form!: ReturnType<typeof useForm<{ email: string }>>
    const wrapper = mountComposable(() => {
      form = useForm(options)
    }, {})

    form.setValue('email', 'edited@x.y')
    form.setError('email', 'Taken')

    options.value = { defaultValues: { email: 'a@b.c' }, resetKey: 'record-2' }
    await nextTick()
    expect(form.getValue('email')).toBe('a@b.c')
    expect(form.getError('email')).toBeUndefined()
    expect(form.isDirty.value).toBe(false)

    options.value = { defaultValues: { email: 'fresh@x.y' }, resetKey: 'record-2' }
    await nextTick()
    expect(form.getValue('email')).toBe('a@b.c')

    wrapper.unmount()
  })

  it('usePush checks the permission again when a reactive checkOnMount turns on', async () => {
    const options = ref<{ checkOnMount?: boolean }>({})
    const wrapper = mountComposable(() => {
      usePush(options)
    }, {})
    const provider = vi.mocked(getProvider).mock.results[0]?.value as {
      checkPermission: ReturnType<typeof vi.fn>
    }
    expect(provider.checkPermission).not.toHaveBeenCalled()

    options.value = { checkOnMount: true }
    await nextTick()
    await Promise.resolve()
    expect(provider.checkPermission).toHaveBeenCalledTimes(1)

    options.value = { checkOnMount: false }
    await nextTick()
    await Promise.resolve()
    expect(provider.checkPermission).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
