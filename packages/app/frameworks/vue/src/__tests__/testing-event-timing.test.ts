// @vitest-environment jsdom
/**
 * The event timing `@molecule/app-vue/testing/setup` installs (this package's own config loads
 * it): a test's event lands after the render it follows, Vue's guard against a listener added
 * during an event's own dispatch still holds, and an event the page fires itself into a listener
 * attached in the same task is reported with the element named.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, onMounted, ref, render, type VNode } from 'vue'

import { installEventTiming } from '../testing/event-timing.js'

const timing = installEventTiming()

afterEach(() => {
  timing.resume()
  document.body.innerHTML = ''
})

/**
 * Mounts a trigger that opens a menu whose container and item both listen for keydown, mounted in
 * one flush (the Dropdown shape), then fires a keydown on the item.
 *
 * @param fire - Fires the keydown on the item.
 * @returns Whether the container's keydown listener ran.
 */
async function menuKeydown(fire: (item: HTMLElement) => void): Promise<boolean> {
  const host = document.body.appendChild(document.createElement('div'))
  const open = ref(false)
  let containerRan = false
  const app = createApp({
    render: () =>
      h('div', [
        h('button', { id: 'trigger', onClick: () => (open.value = true) }, 'open'),
        open.value
          ? h('div', { role: 'menu', onKeydown: () => (containerRan = true) }, [
              h('div', { id: 'item', role: 'menuitem', onKeydown: () => undefined }, 'Item'),
            ])
          : null,
      ]),
  })
  app.mount(host)
  document.getElementById('trigger')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  fire(document.getElementById('item')!)
  app.unmount()
  host.remove()
  return containerRan
}

/**
 * Runs a case many times and counts the runs whose container listener did not run.
 *
 * @param runs - How many times.
 * @param fire - Fires the keydown on the item.
 * @returns The number of skipped container listeners.
 */
async function skipped(runs: number, fire: (item: HTMLElement) => void): Promise<number> {
  let count = 0
  for (let i = 0; i < runs; i++) if (!(await menuKeydown(fire))) count++
  return count
}

const keydown = (item: HTMLElement): void => {
  item.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
}

describe('a test event right after a mount', () => {
  it('reaches a container listener mounted with the item it starts on, every time', async () => {
    expect(await skipped(500, keydown)).toBe(0)
  })

  it('reaches it through click() too, which never calls the public dispatchEvent', async () => {
    let count = 0
    for (let i = 0; i < 200; i++) {
      const host = document.body.appendChild(document.createElement('div'))
      const open = ref(false)
      let cardRan = false
      const app = createApp({
        render: () =>
          h('div', [
            h('button', { id: 'show', onClick: () => (open.value = true) }, 'show'),
            open.value
              ? h('div', { onClick: () => (cardRan = true) }, [
                  h('button', { id: 'inner', onClick: () => undefined }, 'inner'),
                ])
              : null,
          ]),
      })
      app.mount(host)
      document.getElementById('show')!.click()
      await nextTick()
      document.getElementById('inner')!.click()
      if (!cardRan) count++
      app.unmount()
      host.remove()
    }
    expect(count).toBe(0)
  })

  it('still skips a listener attached during the event it would receive (Vue guards that)', async () => {
    const container = document.body.appendChild(document.createElement('div'))
    let outerRan = false
    // render() patches synchronously, so the outer listener is attached while the click dispatches.
    const view = (withOuter: boolean): VNode =>
      h('div', withOuter ? { onClick: () => (outerRan = true) } : {}, [
        h('button', { id: 'inner', onClick: () => render(view(true), container) }),
      ])
    render(view(false), container)
    // A later task, so the click is not held back by the mount above.
    await new Promise((resolve) => setTimeout(resolve, 5))
    document.getElementById('inner')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(outerRan).toBe(false)
    render(null, container)
  })
})

describe('an event the page fires itself', () => {
  const FocusOnMount = defineComponent({
    props: { nested: { type: Boolean, default: true }, later: { type: Boolean, default: false } },
    setup(props) {
      const button = ref<HTMLButtonElement | null>(null)
      onMounted(() => {
        if (props.later) setTimeout(() => button.value?.focus(), 0)
        else button.value?.focus()
      })
      return () =>
        h(
          'div',
          props.nested ? { class: 'panel', onFocusin: () => undefined } : { class: 'panel' },
          [h('button', { ref: button, onFocusin: () => undefined }, 'Save')],
        )
    },
  })

  const mount = async (props: Record<string, boolean>): Promise<void> => {
    const host = document.body.appendChild(document.createElement('div'))
    const open = ref(false)
    createApp({ render: () => (open.value ? h(FocusOnMount, props) : h('span')) }).mount(host)
    open.value = true
    await nextTick()
  }

  it('is reported when focus() in onMounted reaches a second listener mounted in that task', async () => {
    await mount({})
    const problems = timing.takeProblems()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('onFocusin listener on <div class="panel">')
    expect(problems[0]).toContain('<button> "Save" handles it first')
  })

  it('is not reported with a single listener on its path', async () => {
    await mount({ nested: false })
    expect(timing.takeProblems()).toEqual([])
  })

  it('is not reported when the component focuses in a later task', async () => {
    await mount({ later: true })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(timing.takeProblems()).toEqual([])
  })

  it("counts a test's own focus() as the page's, and a test's fireEvent as the test's", () => {
    const mountRow = (): HTMLElement => {
      const host = document.body.appendChild(document.createElement('div'))
      createApp({
        render: () =>
          h('div', { class: 'row', onFocusin: () => undefined }, [
            h('input', { class: 'field', onFocusin: () => undefined }),
          ]),
      }).mount(host)
      return host.querySelector('input')!
    }
    mountRow().focus()
    expect(timing.takeProblems()).toHaveLength(1)
    mountRow().dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(timing.takeProblems()).toEqual([])
  })
})
