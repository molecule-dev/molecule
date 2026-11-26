// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `BiasIndicator` — a port of
 * `@molecule/app-bias-indicator-react/src/__tests__/BiasIndicator.test.tsx`:
 * the same test names and the same assertions, mounted with Svelte in jsdom
 * and asserted on the markup the component produces.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import BiasIndicator from '../BiasIndicator.svelte'
import {
  biasToBucket,
  biasToPercent,
  bucketColor,
  clamp,
  reliabilityToTier,
  tierColor,
} from '../logic.js'
import type { BiasIndicatorProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g. `flex`),
// so tests assert which cm.* class the component applied without a real bond —
// the same stub the React suite installs.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]): string => token
      },
    }
    return new Proxy({}, handler)
  },
}))

/** A mounted indicator: the component instance and its target element. */
interface Mounted {
  /** The component instance, unmounted after the test. */
  readonly component: ReturnType<typeof mount<BiasIndicatorProps, Record<string, unknown>>>
  /** The element the component renders into. */
  readonly target: HTMLElement
}

const mounted: Mounted[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const { component, target } of mounted.splice(0)) {
    void unmount(component)
    target.remove()
  }
  document.body.innerHTML = ''
})

/**
 * Mounts a `BiasIndicator` with the given props and remembers it for teardown.
 *
 * @param props - The component's props.
 * @returns The mounted component and its target.
 */
const mountIndicator = (props: BiasIndicatorProps): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(BiasIndicator, { target, props })
  const entry: Mounted = { component, target }
  mounted.push(entry)
  return entry
}

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(0.3, -1, 1)).toBe(0.3)
  })
  it('clamps below min', () => {
    expect(clamp(-2, -1, 1)).toBe(-1)
  })
  it('clamps above max', () => {
    expect(clamp(2, -1, 1)).toBe(1)
  })
  it('returns min for NaN', () => {
    expect(clamp(Number.NaN, -1, 1)).toBe(-1)
  })
})

describe('biasToBucket', () => {
  it('classifies far-left at -1', () => {
    expect(biasToBucket(-1)).toBe('far-left')
  })
  it('uses far-left at the inclusive boundary -0.6', () => {
    expect(biasToBucket(-0.6)).toBe('far-left')
  })
  it('classifies left at -0.4', () => {
    expect(biasToBucket(-0.4)).toBe('left')
  })
  it('classifies center at 0', () => {
    expect(biasToBucket(0)).toBe('center')
  })
  it('classifies right at 0.4', () => {
    expect(biasToBucket(0.4)).toBe('right')
  })
  it('classifies far-right at 1', () => {
    expect(biasToBucket(1)).toBe('far-right')
  })
  it('clamps out-of-range values into the end buckets', () => {
    expect(biasToBucket(-5)).toBe('far-left')
    expect(biasToBucket(5)).toBe('far-right')
  })
})

describe('reliabilityToTier', () => {
  it('classifies high at 0.9', () => {
    expect(reliabilityToTier(0.9)).toBe('high')
  })
  it('classifies medium at 0.5', () => {
    expect(reliabilityToTier(0.5)).toBe('medium')
  })
  it('classifies low at 0.3', () => {
    expect(reliabilityToTier(0.3)).toBe('low')
  })
  it('classifies disputed at 0.1', () => {
    expect(reliabilityToTier(0.1)).toBe('disputed')
  })
})

describe('biasToPercent', () => {
  it('maps -1 to 0%', () => {
    expect(biasToPercent(-1)).toBe(0)
  })
  it('maps 0 to 50%', () => {
    expect(biasToPercent(0)).toBe(50)
  })
  it('maps 1 to 100%', () => {
    expect(biasToPercent(1)).toBe(100)
  })
})

describe('bucketColor / tierColor', () => {
  it('returns CSS var strings for every bucket', () => {
    expect(bucketColor('far-left')).toMatch(/^var\(/)
    expect(bucketColor('left')).toMatch(/^var\(/)
    expect(bucketColor('center')).toMatch(/^var\(/)
    expect(bucketColor('right')).toMatch(/^var\(/)
    expect(bucketColor('far-right')).toMatch(/^var\(/)
  })
  it('returns CSS var strings for every reliability tier', () => {
    expect(tierColor('high')).toMatch(/^var\(/)
    expect(tierColor('medium')).toMatch(/^var\(/)
    expect(tierColor('low')).toMatch(/^var\(/)
    expect(tierColor('disputed')).toMatch(/^var\(/)
  })
})

describe('<BiasIndicator>', () => {
  it('renders the scale + marker by default', () => {
    const { target } = mountIndicator({ bias: -0.4 })
    expect(target.querySelector('[data-mol-id="bias-indicator-scale"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="bias-indicator-marker"]')).not.toBeNull()
  })

  it('positions the marker at biasToPercent(bias)%', () => {
    const { target } = mountIndicator({ bias: 0.5 })
    const marker = target.querySelector('[data-mol-id="bias-indicator-marker"]') as HTMLElement
    expect(marker.style.left).toBe('75%')
  })

  it('exposes the bias bucket as a data attribute on the root', () => {
    const { target } = mountIndicator({ bias: 0.7 })
    const root = target.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('data-bias-bucket')).toBe('far-right')
  })

  it('uses the English fallback "Center" for bias=0', () => {
    const { target } = mountIndicator({ bias: 0 })
    expect(target.querySelector('[data-mol-id="bias-indicator-bias-label"]')?.textContent).toBe(
      'Center',
    )
  })

  it('omits the reliability indicator when reliability is undefined', () => {
    const { target } = mountIndicator({ bias: 0 })
    expect(target.querySelector('[data-mol-id="bias-indicator-reliability"]')).toBeNull()
  })

  it('renders the reliability chip with the matching tier when provided', () => {
    const { target } = mountIndicator({ bias: 0, reliability: 0.85 })
    const chip = target.querySelector('[data-mol-id="bias-indicator-reliability"]') as HTMLElement
    expect(chip).not.toBeNull()
    expect(chip.getAttribute('data-reliability-tier')).toBe('high')
    expect(chip.textContent).toContain('Reliability: high')
  })

  it('renders the source label when provided', () => {
    const { target } = mountIndicator({ bias: 0, sourceLabel: 'Reuters' })
    expect(target.querySelector('[data-mol-id="bias-indicator-source"]')?.textContent).toBe(
      'Reuters',
    )
  })

  it('compact variant renders a single dot and no scale track', () => {
    const { target } = mountIndicator({ bias: -0.8, compact: true })
    expect(target.querySelector('[data-mol-id="bias-indicator-scale"]')).toBeNull()
    expect(target.querySelector('[data-mol-id="bias-indicator-marker"]')).toBeNull()
    const root = target.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('data-bias-bucket')).toBe('far-left')
    expect(root.getAttribute('aria-label')).toBe('Far left')
  })

  it('compact aria-label combines bias + reliability when reliability is set', () => {
    const { target } = mountIndicator({ bias: 0.4, reliability: 0.4, compact: true })
    const root = target.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('aria-label')).toBe('Right-leaning — Reliability: low')
  })

  it('honors a custom dataMolId override', () => {
    const { target } = mountIndicator({ bias: 0, dataMolId: 'article-42-bias' })
    expect(target.querySelector('[data-mol-id="article-42-bias"]')).not.toBeNull()
  })
})
