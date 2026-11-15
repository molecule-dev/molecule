// @vitest-environment jsdom
/**
 * Unit tests for `TypingIndicator`, ported from
 * `@molecule/app-typing-indicator-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'
import { getClassMap } from '@molecule/app-ui'

import TypingIndicator from '../TypingIndicator.svelte'

interface Mounted {
  instance: ReturnType<typeof mount>
  status: HTMLElement | null
}

/**
 * Mounts `TypingIndicator` with the given props.
 *
 * @param props - The indicator props.
 * @returns The mounted instance and the status span.
 */
function render(props: Record<string, unknown> = {}): Mounted {
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: TypingIndicator,
      props,
    },
  })
  flushSync()
  return { instance, status: document.body.querySelector('span[role="status"]') }
}

const cm = getClassMap()

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await unmount(m.instance)
  document.body.innerHTML = ''
})

describe('TypingIndicator', () => {
  it('renders nothing when visible is false', () => {
    const m = render({ visible: false })
    mounted.push(m)
    expect(m.status).toBeNull()
    expect(document.body.querySelector('span')).toBeNull()
  })

  it('renders role="status" with a default aria-label', () => {
    const m = render({})
    mounted.push(m)
    expect(m.status?.getAttribute('role')).toBe('status')
    expect(m.status?.getAttribute('aria-label')).toBe('Typing…')
  })

  it('honours a custom aria-label', () => {
    const m = render({ ariaLabel: 'Alice is typing' })
    mounted.push(m)
    expect(m.status?.getAttribute('aria-label')).toBe('Alice is typing')
  })

  it('renders three animated dots', () => {
    const m = render({})
    mounted.push(m)
    expect(document.body.innerHTML.match(/border-radius:\s*50%/g) ?? []).toHaveLength(3)
  })

  it('sizes the dots from the dotSize prop', () => {
    const m = render({ dotSize: 10 })
    mounted.push(m)
    expect(document.body.innerHTML).toContain('width: 10px')
  })

  it('injects a keyframes <style> tag', () => {
    const m = render({})
    mounted.push(m)
    expect(document.body.querySelector('style')).not.toBeNull()
    expect(document.body.innerHTML).toContain('@keyframes molecule-typing-pulse')
  })

  it('forwards className', () => {
    const m = render({ className: 'ti-cls' })
    mounted.push(m)
    expect(m.status?.getAttribute('class')).toBe(
      cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'ti-cls'),
    )
  })
})
