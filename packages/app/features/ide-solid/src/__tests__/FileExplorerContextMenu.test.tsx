// @vitest-environment jsdom
/**
 * `FileExplorerContextMenu` — portalled like React's `createPortal(menu,
 * document.body)`: the menu renders directly under `<body>`, follows the
 * `{#if}`/`<Show>` that owns it, and leaves the body as it found it when it
 * closes.
 *
 * @module
 */

import { createSignal, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorerContextMenu } from '../parts/FileExplorerContextMenu.jsx'

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
})

describe('FileExplorerContextMenu', () => {
  it('renders the menu in the body and leaves it clean when a <Show> hides it', () => {
    const [show, setShow] = createSignal(true)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const foreign = document.createElement('div')
    foreign.dataset.foreign = ''
    document.body.appendChild(foreign)

    dispose = render(
      () => (
        <Show when={show()}>
          <FileExplorerContextMenu
            position={{ x: 10, y: 20 }}
            node={null}
            selectedCount={0}
            canPaste={false}
            onAction={() => {}}
            onClose={() => setShow(false)}
          />
        </Show>
      ),
      host,
    )

    const menu = document.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    // A direct body child, outside the element that declares the menu — React's
    // `createPortal(menu, document.body)`.
    expect(menu?.parentElement).toBe(document.body)
    expect(host.querySelector('[role="menu"]')).toBeNull()

    setShow(false)
    expect(document.querySelector('[role="menu"]')).toBeNull()
    // Closing removes only the menu: a body child added while it was open stays.
    expect(document.querySelector('[data-foreign]')).not.toBeNull()
  })
})
