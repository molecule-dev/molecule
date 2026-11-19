// @vitest-environment jsdom
/**
 * A caller hands a component its ref the way a Solid user does — `ref={el}` or
 * `ref={(el) => …}` — with no cast. Each forwarding component's props carry the
 * `Ref` of the element React's kit forwards to (`WithRef` in `../utilities/dom.js`),
 * so these calls type-check; the runtime assertions prove the ref also reaches
 * that element.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes
                .flat(Infinity)
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

vi.mock('@molecule/app-solid', async () => ({
  ...(await vi.importActual('@molecule/app-solid')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const ui = await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Mounts Solid JSX with the browser renderer and registers its disposer. */
function mount(view: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
}

describe("a caller's ref reaches the element React forwards to", () => {
  it('Button hands a caller a callback ref, with no cast', () => {
    let button: HTMLButtonElement | undefined
    mount(() => (
      <ui.Button
        ref={(node) => {
          button = node
        }}
      >
        Save
      </ui.Button>
    ))
    expect(button).toBeInstanceOf(HTMLButtonElement)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", () => {
    let input: HTMLInputElement | undefined
    mount(() => (
      <ui.Input
        ref={(node) => {
          input = node
        }}
        label="Email"
        name="email"
      />
    ))
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input?.name).toBe('email')
  })
})
