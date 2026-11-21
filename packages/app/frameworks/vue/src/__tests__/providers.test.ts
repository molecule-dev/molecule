// @vitest-environment jsdom

/**
 * The provider components: each provides its service to the tree below it under the key its
 * composable reads, `MoleculeProvider` provides every service it is given, and a changed service
 * reaches the tree.
 *
 * @module
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, inject, type InjectionKey, nextTick, ref, type VNode } from 'vue'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createSimpleStateProvider } from '@molecule/app-state'
import { lightTheme, type ThemeProvider as ThemeService } from '@molecule/app-theme'

import { useTranslation } from '../composables/useTranslation.js'
import {
  AuthKey,
  ChatKey,
  EditorKey,
  HttpKey,
  I18nKey,
  LoggerKey,
  PreviewKey,
  RouterKey,
  StateKey,
  StorageKey,
  ThemeKey,
  WorkspaceKey,
} from '../injection-keys.js'
import {
  AuthProvider,
  ChatProvider,
  EditorProvider,
  HttpProvider,
  I18nProvider,
  LoggerProvider,
  MoleculeProvider,
  PreviewProvider,
  RouterProvider,
  StateProvider,
  StorageProvider,
  ThemeProvider,
  WorkspaceProvider,
} from '../providers.js'

const wrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts `render` and returns what a child read from `key`.
 *
 * @param key - The injection key the child reads.
 * @param render - Renders the provider around the given child.
 * @returns The value the child injected.
 */
function injectedUnder(key: InjectionKey<unknown>, render: (child: () => VNode) => VNode): unknown {
  let seen: unknown = 'not read'
  const Child = defineComponent({
    setup() {
      seen = inject(key, undefined)
      return () => h('span')
    },
  })
  wrappers.push(mount(defineComponent({ setup: () => () => render(() => h(Child)) })))
  return seen
}

/** A distinct stand-in for each service, so a test can tell them apart by identity. */
const service = (name: string): { name: string } => ({ name })

describe('per-service provider components', () => {
  const cases: [string, InjectionKey<unknown>, (value: never, child: () => VNode) => VNode][] = [
    ['StateProvider', StateKey, (value, child) => h(StateProvider, { provider: value }, child)],
    ['ThemeProvider', ThemeKey, (value, child) => h(ThemeProvider, { provider: value }, child)],
    ['RouterProvider', RouterKey, (value, child) => h(RouterProvider, { router: value }, child)],
    ['I18nProvider', I18nKey, (value, child) => h(I18nProvider, { provider: value }, child)],
    ['HttpProvider', HttpKey, (value, child) => h(HttpProvider, { client: value }, child)],
    [
      'StorageProvider',
      StorageKey,
      (value, child) => h(StorageProvider, { provider: value }, child),
    ],
    ['LoggerProvider', LoggerKey, (value, child) => h(LoggerProvider, { provider: value }, child)],
    ['ChatProvider', ChatKey, (value, child) => h(ChatProvider, { provider: value }, child)],
    [
      'WorkspaceProvider',
      WorkspaceKey,
      (value, child) => h(WorkspaceProvider, { provider: value }, child),
    ],
    ['EditorProvider', EditorKey, (value, child) => h(EditorProvider, { provider: value }, child)],
    [
      'PreviewProvider',
      PreviewKey,
      (value, child) => h(PreviewProvider, { provider: value }, child),
    ],
    [
      'AuthProvider',
      AuthKey,
      (value, child) => h(AuthProvider, { client: value, awaitSession: false }, child),
    ],
  ]

  it.each(cases)('%s provides its service to the tree below it', (name, key, render) => {
    const value = service(name)
    expect(injectedUnder(key, (child) => render(value as never, child))).toBe(value)
  })
})

describe('MoleculeProvider', () => {
  it('provides every service it is given under the key its composable reads', () => {
    const state = createSimpleStateProvider()
    const values = {
      theme: service('theme'),
      router: service('router'),
      i18n: service('i18n'),
      http: service('http'),
      storage: service('storage'),
      logger: service('logger'),
      chat: service('chat'),
      workspace: service('workspace'),
      editor: service('editor'),
      preview: service('preview'),
    }
    const keys: [keyof typeof values, InjectionKey<unknown>][] = [
      ['theme', ThemeKey],
      ['router', RouterKey],
      ['i18n', I18nKey],
      ['http', HttpKey],
      ['storage', StorageKey],
      ['logger', LoggerKey],
      ['chat', ChatKey],
      ['workspace', WorkspaceKey],
      ['editor', EditorKey],
      ['preview', PreviewKey],
    ]
    // Each stand-in passes as any service (`never`), as `render` passes one above: identity only.
    const props: Record<string, never> = Object.fromEntries(
      Object.entries(values).map(([name, value]) => [name, value as never]),
    )
    for (const [prop, key] of keys) {
      expect(injectedUnder(key, (child) => h(MoleculeProvider, { state, ...props }, child))).toBe(
        values[prop],
      )
    }
    expect(injectedUnder(StateKey, (child) => h(MoleculeProvider, { state }, child))).toBe(state)
  })

  it('leaves a service it was not given unprovided', () => {
    expect(injectedUnder(ThemeKey, (child) => h(MoleculeProvider, null, child))).toBeUndefined()
  })

  it('gives the tree a changed service', async () => {
    const english = createSimpleI18nProvider()
    english.addTranslations('en', { greeting: 'Hello' })
    const other = createSimpleI18nProvider()
    other.addTranslations('en', { greeting: 'Howdy' })
    const current = ref(english)
    const Greeting = defineComponent({
      setup() {
        const { t } = useTranslation()
        return () => h('p', t('greeting'))
      },
    })
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(MoleculeProvider, { i18n: current.value }, () => [h(Greeting)]),
      }),
    )
    wrappers.push(wrapper)
    expect(wrapper.text()).toBe('Hello')
    current.value = other
    await nextTick()
    expect(wrapper.text()).toBe('Howdy')
  })

  it('keeps the tree mounted while its services stay the same', async () => {
    const theme: ThemeService = {
      getTheme: () => lightTheme,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
      getThemes: () => [lightTheme],
    }
    const label = ref('first')
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MoleculeProvider, { theme }, () => [h('input', { 'aria-label': label.value })]),
      }),
    )
    wrappers.push(wrapper)
    const input = wrapper.get('input').element
    label.value = 'second'
    await nextTick()
    expect(wrapper.get('input').element).toBe(input)
    expect(input.getAttribute('aria-label')).toBe('second')
  })
})
