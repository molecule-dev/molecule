// @vitest-environment jsdom
/**
 * A click delivered right after the Switch commits — before React has run
 * passive effects — still reaches `onChange`. The listener used to be attached
 * in a `useEffect`, so a click in that gap toggled nothing, silently (it
 * flaked molecule-dev's auto-refill toggle test under load).
 *
 * The gap is reproduced exactly: a default-priority render defers passive
 * effects to a later task, and a MutationObserver callback (a microtask right
 * after the commit's DOM mutations) clicks before that task runs. No `act`,
 * which would flush the effects first and hide the gap.
 */
import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Switch } from '../components/Switch.js'

const FUNCTIONS = new Set(['switchBase', 'switchThumb'])
const classMap = new Proxy(
  {},
  {
    get: (_target, prop: string) => {
      if (prop === 'cn') return (...parts: unknown[]) => parts.filter(Boolean).join(' ')
      if (FUNCTIONS.has(prop)) return () => prop
      return prop
    },
  },
) as UIClassMap

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  setClassMap(classMap)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  flushSync(() => root.unmount())
  host.remove()
})

/** Renders `element` and clicks the switch as soon as it is in the DOM. */
const clickOnCommit = (element: React.ReactElement): Promise<void> =>
  new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const button = host.querySelector<HTMLButtonElement>('[role="switch"]')
      if (!button) return
      observer.disconnect()
      button.click()
      resolve()
    })
    observer.observe(host, { childList: true, subtree: true })
    root.render(element)
  })

describe('Switch first click', () => {
  it('calls onChange for a click that lands before passive effects run', async () => {
    const onChange = vi.fn()
    await clickOnCommit(<Switch checked={false} onChange={onChange} />)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0][0] as Event).target).toBeInstanceOf(HTMLInputElement)
  })

  it('calls the latest onChange after a re-render, once', () => {
    const first = vi.fn()
    const second = vi.fn()
    flushSync(() => root.render(<Switch checked={false} onChange={first} />))
    flushSync(() => root.render(<Switch checked={false} onChange={second} />))
    host.querySelector<HTMLButtonElement>('[role="switch"]')!.click()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
