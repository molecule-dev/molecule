/**
 * Solid GDPR cookie-consent banner.
 *
 * Solid counterpart of `@molecule/app-cookie-banner-react`'s `CookieBanner` —
 * the same props (React names), the same DOM for the same input, the same
 * callback calls. Two modes: Accept / Reject only, or per-category switches
 * behind "Customize" when `categories` are supplied.
 *
 * @module
 */

import {
  type Component,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  Show,
  splitProps,
} from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, type ButtonProps, Switch } from '@molecule/app-ui-solid'

import type { CookieBannerProps, CookieCategory } from './types.js'

/**
 * The details toggle's props: the Solid {@link ButtonProps} plus the `aria-controls`
 * that names the details list while it renders (the shared props type does not
 * declare it; the shared Button forwards every undeclared prop to its native
 * button).
 */
type DetailsToggleProps = ButtonProps & { 'aria-controls'?: string | undefined }

/**
 * The shared Button, forwarding `aria-controls`. A wrapper (not a spread at
 * the call site) so the attribute stays reactive: a JSX spread of a plain
 * object is evaluated once, while these explicit props are getters.
 *
 * @param props - The shared Button's props plus `aria-controls`.
 * @returns The rendered button.
 */
const DetailsToggle: Component<DetailsToggleProps> = (props) => {
  const [aria, rest] = splitProps(props, ['aria-controls'])
  return <Button {...rest} {...aria} />
}

/** React's inline style for the banner, written the way React writes it (Solid takes kebab-case keys). */
const bannerStyle: JSX.CSSProperties = {
  position: 'fixed',
  left: '16px',
  right: '16px',
  bottom: '16px',
  'z-index': '60',
  background: 'var(--color-surface, #fff)',
  border: '1px solid rgba(0,0,0,0.1)',
  'border-radius': '12px',
  'box-shadow': '0 12px 36px rgba(0,0,0,0.18)',
  'max-width': '720px',
  'margin-left': 'auto',
  'margin-right': 'auto',
}

/**
 * GDPR / cookie-consent banner. Two modes:
 * - Simple: Accept / Reject buttons.
 * - Granular: Per-category toggles + "Save preferences".
 *
 * Apps own the actual cookie storage logic. Category toggle state is captured
 * from `categories` once, at mount — later prop changes do not reset it.
 *
 * @param props - Component props (see {@link CookieBannerProps}).
 * @returns The rendered banner.
 */
export const CookieBanner: Component<CookieBannerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Generated ids (never derived from data): the details list's id, wired to
  // the Customize/Hide details button's `aria-controls`, and the base of each
  // category row's label/description ids, which name and describe that row's
  // switch so every `role="switch"` has an accessible name.
  const detailsId = createUniqueId()
  const nameId = createUniqueId()
  const [showDetails, setShowDetails] = createSignal(false)
  // React's `useState` initializer: captured once, from the mount-time
  // categories — a later `categories` change keeps the toggled state.
  const initialEnabled = (): Record<string, boolean> => {
    const init: Record<string, boolean> = {}
    for (const category of props.categories ?? [])
      init[category.id] = category.required === true || !!category.defaultEnabled
    return init
  }
  const [enabled, setEnabled] = createSignal<Record<string, boolean>>(initialEnabled())

  // React keys each category row by `category.id`, so a row's DOM node
  // survives a props update while its id is unchanged (and moves with it) and
  // is re-created only when the id changes. `<For>` keys by object identity,
  // which would re-create every row when the same categories arrive as equal
  // new objects, so iterate the ids — `<For>` compares strings by value — and
  // read each category through the latest-by-id lookup.
  const categoryIds = createMemo(() => (props.categories ?? []).map((category) => category.id))
  const categoryById = createMemo(() => {
    const byId = new Map<string, CookieCategory>()
    for (const category of props.categories ?? []) byId.set(category.id, category)
    return byId
  })

  /**
   * Calls the optional callback then fires the shared onDismiss handler.
   * @param fn - The mode-specific callback.
   */
  function dismissAfter(fn?: () => void): void {
    fn?.()
    props.onDismiss?.()
  }

  /**
   * Flips one category's enabled state, as React's `setEnabled` does.
   * @param id - The category id.
   * @param checked - The switch's new checked state.
   */
  function setCategory(id: string, checked: boolean): void {
    setEnabled((previous) => ({ ...previous, [id]: checked }))
  }

  return (
    <Show when={props.visible ?? true}>
      <div
        role="dialog"
        aria-label={t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' })}
        class={cm.cn(cm.stack(3), cm.sp('p', 4), props.className)}
        style={bannerStyle}
      >
        <header class={cm.stack(1 as const)}>
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            <ResolveNode node={props.title}>
              {(title, hasTitle) => (
                <Show
                  when={hasTitle()}
                  fallback={t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' })}
                >
                  {title()}
                </Show>
              )}
            </ResolveNode>
          </h3>
          <p class={cm.textSize('sm')}>
            <ResolveNode node={props.description}>
              {(description, hasDescription) => (
                <Show
                  when={hasDescription()}
                  fallback={t(
                    'cookieBanner.description',
                    {},
                    {
                      defaultValue:
                        'We use cookies to improve your experience and analyse traffic.',
                    },
                  )}
                >
                  {description()}
                </Show>
              )}
            </ResolveNode>
            <Show when={props.policyHref}>
              {' '}
              <a href={props.policyHref} class={cm.link}>
                {t('cookieBanner.learnMore', {}, { defaultValue: 'Learn more' })}
              </a>
              .
            </Show>
          </p>
        </header>
        <Show when={showDetails() && props.categories}>
          <div id={detailsId} class={cm.stack(2)}>
            <For each={categoryIds()}>
              {(id, index) => {
                const category = (): CookieCategory => categoryById().get(id)!
                return (
                  <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
                      <span
                        id={`${nameId}-${index()}`}
                        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                      >
                        {category().label}
                      </span>
                      <Show when={category().description}>
                        <span id={`${nameId}-${index()}-description`} class={cm.textSize('xs')}>
                          {category().description}
                        </span>
                      </Show>
                    </div>
                    <Switch
                      checked={!!enabled()[category().id] || !!category().required}
                      disabled={category().required}
                      aria-labelledby={`${nameId}-${index()}`}
                      aria-describedby={
                        category().description ? `${nameId}-${index()}-description` : undefined
                      }
                      onChange={(event) =>
                        setCategory(category().id, (event.target as HTMLInputElement).checked)
                      }
                    />
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
        <footer class={cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' })}>
          <Show when={props.categories}>
            <DetailsToggle
              variant="ghost"
              size="sm"
              aria-expanded={showDetails()}
              // The button names the list only while the list renders (the
              // same `showDetails && categories` branch that renders it).
              aria-controls={showDetails() && props.categories ? detailsId : undefined}
              onClick={() => setShowDetails((current) => !current)}
            >
              {showDetails()
                ? t('cookieBanner.hideDetails', {}, { defaultValue: 'Hide details' })
                : t('cookieBanner.customize', {}, { defaultValue: 'Customize' })}
            </DetailsToggle>
          </Show>
          <Button variant="ghost" onClick={() => dismissAfter(props.onRejectAll)}>
            {t('cookieBanner.reject', {}, { defaultValue: 'Reject all' })}
          </Button>
          <Show when={showDetails() && props.categories && props.onSave}>
            <Button variant="outline" onClick={() => dismissAfter(() => props.onSave?.(enabled()))}>
              {t('cookieBanner.save', {}, { defaultValue: 'Save preferences' })}
            </Button>
          </Show>
          <Button variant="solid" color="primary" onClick={() => dismissAfter(props.onAcceptAll)}>
            {t('cookieBanner.accept', {}, { defaultValue: 'Accept all' })}
          </Button>
        </footer>
      </div>
    </Show>
  )
}
