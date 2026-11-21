// @vitest-environment jsdom
/**
 * The conformance kit's Vue adapter tears a case's app down when the component throws while
 * it first renders. The runner gets no mounted case to tear down then, so whatever the app
 * and the component had set up (their effects, their listeners) must not run on into the
 * cases after it, which would record its work as their own.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, onScopeDispose, type Plugin } from 'vue'

import { createVueAdapter } from '@molecule/app-framework-conformance/adapters/vue'
import * as AppVue from '@molecule/app-vue'

/** What each part of the case reported when it was torn down. */
const cleaned: string[] = []

/** Registers its cleanup, as a component with a listener or a timer does, then throws. */
const Thrower = defineComponent({
  setup() {
    onScopeDispose(() => cleaned.push('Thrower'))
    throw new Error('the first render broke')
  },
})

/** The counterexample: registers its cleanup and renders. */
const Renders = defineComponent({
  setup() {
    onScopeDispose(() => cleaned.push('Renders'))
    return () => h('p', 'rendered')
  },
})

/**
 * The binding, with an i18n plugin that also registers an app-level cleanup, as a plugin's
 * subscriptions do: only the app's own unmount reaches it.
 */
const binding: typeof AppVue = {
  ...AppVue,
  createI18nPlugin: (provider) => {
    const plugin = AppVue.createI18nPlugin(provider) as Plugin
    return {
      install(app, ...options: unknown[]) {
        app.onUnmount(() => cleaned.push('app'))
        return (plugin as { install: (...args: unknown[]) => unknown }).install(app, ...options)
      },
    } as ReturnType<typeof AppVue.createI18nPlugin>
  },
}

const adapter = createVueAdapter({ exports: { Thrower, Renders }, binding })

describe('the Vue conformance adapter', () => {
  it('tears down the app and the component of a first render that throws', async () => {
    cleaned.length = 0
    await expect(adapter.run('Thrower', { name: 'a first render that throws' })).rejects.toThrow(
      'the first render broke',
    )
    expect(cleaned.sort()).toEqual(['Thrower', 'app'])
  })

  it('counterexample: a component that renders is torn down once, at the end of its case', async () => {
    cleaned.length = 0
    const result = await adapter.run('Renders', { name: 'a component that renders' })
    expect(result.snapshots[0]).toContain('rendered')
    expect(cleaned.sort()).toEqual(['Renders', 'app'])
  })
})
