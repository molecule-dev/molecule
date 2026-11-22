// @vitest-environment jsdom
/**
 * StreamingIndicator — the live counter shown beside the elapsed timer: a
 * port of `@molecule/app-ide-react/src/__tests__/StreamingIndicator.test.tsx`
 * with the same test names and the same behavioral assertions, mounted
 * through Vue's own `createApp`. The counter measures ESTIMATED OUTPUT ONLY
 * (assistant text + thinking + tool-call arguments, at ~4 chars/token) — see
 * the React file for why the tooltip carries the qualifier.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { StreamingIndicator } from '../parts/StreamingIndicator.js'

const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  // Unmount through Vue rather than wiping innerHTML: the tooltip renders into
  // a portal on document.body, so clearing the DOM first leaves Vue tearing
  // down nodes that are no longer its children. unmount() tears the trees down
  // properly; the wipe then clears any portal root left behind.
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the indicator the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The container element.
 */
function renderIndicator(props: Record<string, unknown> = {}): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(StreamingIndicator, props),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

describe('StreamingIndicator — token counter labelling', () => {
  it('keeps the visible unit plain, so the row stays narrow', () => {
    const container = renderIndicator({ tokens: 40_500 })
    const text = container.textContent ?? ''
    // Abbreviation from the shared formatter, `~` prefix to signal an estimate.
    expect(text).toContain('~40.5k tokens')
    // The qualifier must NOT be inline — that costs 40px of the label's budget.
    expect(text).not.toContain('output')
  })

  it('says on hover that the count is OUTPUT only — the row has no other way to tell you', async () => {
    const container = renderIndicator({ tokens: 40_500 })
    const count = [...(container.querySelectorAll('span') ?? [])].find(
      (el) => el.textContent === '~40.5k tokens' && el.children.length === 0,
    )
    expect(count, 'the rendered count').toBeTruthy()
    // The tooltip's trigger hears what bubbles across the boundary
    // (mouseover), and portals into document.body — assert against it.
    ;(count as HTMLElement).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await nextTick()
    const tip = document.body.textContent ?? ''
    expect(tip).toContain('output tokens')
    // And it points at the surface that carries input, cached and total.
    expect(tip).toContain('/cost')
  })

  it('hides the counter below the noise threshold (a 4-token tool input)', () => {
    const container = renderIndicator({ tokens: 4 })
    expect(container.textContent ?? '').not.toContain('tokens')
  })

  it('shows the counter once real generation crosses the threshold', () => {
    const container = renderIndicator({ tokens: 20 })
    expect(container.textContent ?? '').toContain('20 tokens')
  })

  it('omits the counter entirely when no estimate is supplied', () => {
    const container = renderIndicator()
    expect(container.textContent ?? '').not.toContain('tokens')
  })
})
