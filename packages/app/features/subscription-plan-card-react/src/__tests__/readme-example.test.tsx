// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, RouterProvider, useNavigate } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SubscriptionPlanCard } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered pricing page.
 */
function PricingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const plans = [
    { id: 'starter', name: 'Starter', price: '$0', features: ['1 project', 'Community support'] },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19',
      features: ['Unlimited projects', '10 GB storage', 'Priority support'],
      recommended: true,
    },
  ]
  return (
    <section>
      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.id}
          name={plan.name}
          price={plan.price}
          interval="/month"
          features={plan.features}
          ctaLabel="Choose plan"
          onCta={() => navigate(`/checkout/${plan.id}`)}
          recommended={plan.recommended}
        />
      ))}
    </section>
  )
}

let root: Root | undefined
let container: HTMLElement

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('renders both plans, badges the recommended one, and navigates on CTA click', () => {
    const router = createMemoryRouter({ initialEntries: ['/pricing'] })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() =>
      root?.render(
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <RouterProvider router={router}>
            <PricingPage />
          </RouterProvider>
        </I18nProvider>,
      ),
    )

    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent)
    expect(headings).toEqual(['Starter', 'Pro'])
    expect(container.textContent).toContain('$19/month')
    expect(container.textContent).toContain('Priority support')
    expect(container.textContent?.match(/Recommended/g)).toHaveLength(1)
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.map((b) => b.textContent)).toEqual(['Choose plan', 'Choose plan'])

    const proButton = buttons[1]
    if (!proButton) throw new Error('Pro CTA not rendered')
    act(() => proButton.click())
    expect(router.getLocation().pathname).toBe('/checkout/pro')
  })
})
