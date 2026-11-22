// @vitest-environment jsdom

/**
 * React's `Icon` takes `name`, `size` and `className` as props and renders none
 * of them as an attribute. Angular keeps an input written as a static
 * attribute (`<svg mol-icon name="bug">`) on the host element too, so the chat
 * header's three icons once carried a `name` attribute React never renders and
 * every ChatPanel conformance case differed from React's DOM. The icon host
 * now removes those attributes, so the DOM is React's whichever way the caller
 * writes the input.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'

import { Icon } from '../components/icon.component.js'

/** The host the tests mount: one icon with static inputs, one with bound inputs. */
const IconHost = Component({
  selector: 'mol-icon-input-attributes-host',
  standalone: true,
  imports: [Icon],
  template:
    '<svg mol-icon name="bug" size="14" className="glyph" data-mol-id="static-icon" aria-hidden="true"></svg>' +
    `<svg mol-icon [name]="'gear'" [size]="12" data-mol-id="bound-icon"></svg>`,
})(
  class IconInputAttributesHost {
    /** The host has no state: both icons' inputs are in the template. */
  },
)

/** The mounted host, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof IconHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({ paths: [{ d: `M${String(name)}` }], viewBox: '0 0 16 16' }),
      },
    ),
  )
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
})

/**
 * Mounts the host and runs its first change detection.
 * @returns The element the host mounted into.
 */
async function render(): Promise<HTMLElement> {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof IconHost>> = createComponent(IconHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.changeDetectorRef.detectChanges()
  await appRef.whenStable()
  current = { appRef, ref, container }
  return container
}

/**
 * The icon with the given `data-mol-id`.
 * @param container - The mounted container.
 * @param id - The icon's `data-mol-id`.
 * @returns The svg element.
 */
function iconOf(container: HTMLElement, id: string): SVGSVGElement {
  const el = container.querySelector<SVGSVGElement>(`svg[data-mol-id="${id}"]`)
  if (!el) throw new Error(`icon ${id} not found`)
  return el
}

describe('Icon input attributes', () => {
  it('renders no name, size or className attribute for inputs written statically', async () => {
    const container = await render()
    const icon = iconOf(container, 'static-icon')

    expect(icon.hasAttribute('name')).toBe(false)
    expect(icon.hasAttribute('size')).toBe(false)
    expect(icon.hasAttribute('className')).toBe(false)
    // The inputs still reach the component: the glyph, its size and its class.
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('Mbug')
    expect(icon.getAttribute('width')).toBe('14')
    expect(icon.getAttribute('height')).toBe('14')
    expect(icon.getAttribute('class')).toBe('glyph')
    // Every other attribute stays where React's rest spread puts it.
    expect(icon.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the same attributes for bound inputs', async () => {
    const container = await render()
    const icon = iconOf(container, 'bound-icon')

    expect(icon.getAttributeNames().sort()).toEqual(
      ['data-mol-id', 'fill', 'height', 'mol-icon', 'viewBox', 'width'].sort(),
    )
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('Mgear')
    expect(icon.getAttribute('width')).toBe('12')
  })
})
