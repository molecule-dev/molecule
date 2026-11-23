// @vitest-environment jsdom

/**
 * `useHostPresence`: a component that renders nothing leaves no element in the
 * page, and comes back in the same place when it renders again — whatever made
 * it change, and without leaving anything behind once it is removed.
 *
 * The case that made this a shared helper: a component whose visibility is a
 * signal written OUTSIDE a template event (a document listener, a timer).
 * Angular then refreshes only that component's view, so a host restored from
 * `ngDoCheck` stayed out of the page and the content never showed (the
 * auth-modal mount's signup modal, 2026-11-23).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { useHostPresence } from '../host-presence.js'

/** The probes rendered so far, newest last (JIT compiles no signal queries without the CLI transform). */
const probes: PresenceProbe[] = []

/** Renders its content only while `shown`, a signal it owns. */
@Component({
  selector: 'mol-presence-probe',
  standalone: true,
  template: `@if (shown()) {
    <span data-probe-content="">on</span>
  }`,
})
class PresenceProbe {
  /** Whether the probe renders anything. */
  readonly shown = signal(false)

  constructor() {
    useHostPresence(() => this.shown())
    probes.push(this)
  }
}

/** Keeps a field rendered while its host leaves the page, the way a dialog's form does. */
@Component({
  selector: 'mol-presence-field',
  standalone: true,
  template: `<input data-probe-field="" />`,
})
class PresenceField {
  /** Whether the host is in the page. */
  readonly visible = signal(true)

  constructor() {
    useHostPresence(() => this.visible())
    fields.push(this)
  }
}

/** The field probes rendered so far, newest last. */
const fields: PresenceField[] = []

/** Places the probe between two neighbours; `present` takes the probe out of the view. */
@Component({
  selector: 'mol-presence-host',
  standalone: true,
  imports: [PresenceProbe, PresenceField],
  template: `<mol-presence-field></mol-presence-field><i data-before=""></i>
    @if (present()) {
      <mol-presence-probe></mol-presence-probe>
    }
    @if (after()) {
      <i data-after=""></i>
    }`,
})
class PresenceHost {
  /** Whether the probe is in the view. */
  readonly present = signal(true)
  /** Whether the neighbour after the probe is in the view. */
  readonly after = signal(true)
  /** The newest rendered probe. */
  probe(): PresenceProbe | undefined {
    return probes.at(-1)
  }
}

let appRef: ApplicationRef | null = null

/**
 * Renders the host into the document and runs one change detection.
 *
 * @returns The app and the host component.
 */
async function render(): Promise<{ app: ApplicationRef; root: HTMLElement; host: PresenceHost }> {
  const app = await createApplication({ providers: [provideZonelessChangeDetection()] })
  appRef = app
  const ref = createComponent(PresenceHost, { environmentInjector: app.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  app.attachView(ref.hostView)
  app.tick()
  return { app, root: ref.location.nativeElement as HTMLElement, host: ref.instance }
}

/** The probe's host element, wherever it is. */
function probeElement(root: HTMLElement): Element | null {
  return root.querySelector('mol-presence-probe')
}

describe('useHostPresence', () => {
  afterEach(() => {
    appRef?.destroy()
    appRef = null
    probes.length = 0
    fields.length = 0
    document.body.replaceChildren()
  })

  it('leaves no element in the page while the component renders nothing', async () => {
    const { root } = await render()
    expect(probeElement(root)).toBeNull()
    expect(root.querySelectorAll('i')).toHaveLength(2)
  })

  it('puts the host back in its place when a signal written outside a template event shows it', async () => {
    const { app, root, host } = await render()
    // Written the way a document listener or a timer writes it: no template event, so
    // Angular refreshes only the probe's own view, and its parent's ngDoCheck never runs.
    host.probe()!.shown.set(true)
    app.tick()
    const probe = probeElement(root)
    expect(probe?.isConnected).toBe(true)
    expect(probe?.querySelector('[data-probe-content]')?.textContent).toBe('on')
    expect(probe?.previousElementSibling?.hasAttribute('data-before')).toBe(true)
    expect(probe?.nextElementSibling?.hasAttribute('data-after')).toBe(true)
  })

  it('takes the host out again when the component renders nothing again', async () => {
    const { app, root, host } = await render()
    host.probe()!.shown.set(true)
    app.tick()
    host.probe()!.shown.set(false)
    app.tick()
    expect(probeElement(root)).toBeNull()
  })

  it('returns to its place after a neighbour left while it was out', async () => {
    const { app, root, host } = await render()
    host.after.set(false)
    app.tick()
    host.probe()!.shown.set(true)
    app.tick()
    const probe = probeElement(root)
    expect(probe?.previousElementSibling?.hasAttribute('data-before')).toBe(true)
    expect(probe?.nextElementSibling).toBeNull()
  })

  it('blurs a field focused inside the host as the host leaves, as React removing it does', async () => {
    const { app } = await render()
    const input = document.querySelector('[data-probe-field]') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)
    const focusouts: EventTarget[] = []
    document.addEventListener('focusout', (event) => focusouts.push(event.target!))
    fields.at(-1)!.visible.set(false)
    app.tick()
    expect(input.isConnected).toBe(false)
    expect(document.activeElement).not.toBe(input)
    expect(focusouts).toContain(input)
  })

  it('leaves neither the host nor its placeholder behind once the view removes it', async () => {
    const { app, root, host } = await render()
    host.present.set(false)
    app.tick()
    expect(probeElement(root)).toBeNull()
    // The host's view held only the probe: nothing of it may stay in the parent.
    expect(
      [...root.childNodes].filter(
        (node) => node.nodeType === Node.COMMENT_NODE && node.textContent === '',
      ),
    ).toHaveLength(0)
    expect(document.querySelector('mol-presence-probe')).toBeNull()
  })
})
