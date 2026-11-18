// @vitest-environment jsdom

/**
 * Unit tests for the Vue `SettingsContainer` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/SettingsContainer.test.tsx`:
 * the same context-publishing behaviour, rendered with Vue in jsdom and
 * observed through a consumer component that reads the container's context.
 *
 * React's `rerender` becomes a re-render of a host whose render function
 * hands the container the current handler; React's consumer render count
 * becomes the identity of the context value the consumer holds (Vue provides
 * the value once, so a re-render never replaces it).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { type SettingsPanelContextValue, useSettingsPanelContext } from '../context.js'
import { SettingsContainer } from '../SettingsContainer.js'

/** How many times the context consumer rendered. */
let consumerRenders = 0

/** The context value the consumer last read from the container. */
let consumerContext: SettingsPanelContextValue | undefined

/**
 * A consumer that counts its renders, records the context it is given and
 * calls the published handler on click.
 */
const Consumer = defineComponent({
  name: 'Consumer',
  setup() {
    consumerContext = useSettingsPanelContext()
    return (): ReturnType<typeof h> => {
      consumerRenders++
      return h('button', { type: 'button', onClick: () => consumerContext?.onClose() }, 'close')
    }
  },
})

/** Mounted apps, unmounted after each test. */
const mounted: Array<ReturnType<typeof createApp>> = []

/**
 * Mounts a host whose render hands the container the current handler and
 * re-renders when the `tick` ref changes — Vue's way of setting a prop and
 * re-rendering the parent (React's `rerender`).
 *
 * @param onClose - The initial dismiss handler.
 * @returns The refs that drive the host and flush a re-render.
 */
async function mountHost(onClose: () => void): Promise<{
  onClose: { value: () => void }
  rerender: () => Promise<void>
}> {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const handler = ref(onClose)
  const tick = ref(0)
  const Host = defineComponent({
    name: 'SettingsContainerHost',
    render: () =>
      h('div', [
        h(SettingsContainer, { onClose: handler.value }, { default: () => h(Consumer) }),
        h('span', { 'data-testid': 'tick' }, String(tick.value)),
      ]),
  })
  const app = createApp(Host)
  mounted.push(app)
  app.mount(host)
  await nextTick()
  return {
    onClose: handler,
    rerender: async () => {
      tick.value++
      await nextTick()
    },
  }
}

beforeEach(() => {
  consumerRenders = 0
  consumerContext = undefined
})

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<SettingsContainer>', () => {
  it('keeps the context value stable while onClose keeps its identity', async () => {
    const onClose = vi.fn()
    const view = await mountHost(onClose)
    const first = consumerContext
    expect(consumerRenders).toBe(1)

    await view.rerender()

    // A fresh context value on every render would replace the consumer's.
    expect(consumerContext).toBe(first)
    expect(consumerRenders).toBe(1)
    document.querySelector('button')?.click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes a new onClose to consumers when the handler changes', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = await mountHost(first)

    view.onClose.value = second
    await view.rerender()

    document.querySelector('button')?.click()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
