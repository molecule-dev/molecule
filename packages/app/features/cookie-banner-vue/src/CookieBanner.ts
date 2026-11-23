/**
 * Vue GDPR cookie-consent banner.
 *
 * Vue counterpart of `@molecule/app-cookie-banner-react`'s `CookieBanner` —
 * the same props (React names), the same DOM for the same input, the same
 * callback calls. Two modes: Accept / Reject only, or per-category switches
 * behind "Customize" when `categories` are supplied.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Switch } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { CookieBannerProps, CookieCategory } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, then a non-nullish prop, and the fallback contributes when
 * neither is given.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @param fallback - The value React renders when the prop is nullish.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
  fallback: () => VNodeChild,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : [fallback()]
}

/** React's inline style for the banner, written the way React writes it. */
const bannerStyle: Record<string, string> = {
  position: 'fixed',
  left: '16px',
  right: '16px',
  bottom: '16px',
  zIndex: '60',
  background: 'var(--color-surface, #fff)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
  maxWidth: '720px',
  marginLeft: 'auto',
  marginRight: 'auto',
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
 * @returns The banner component.
 */
export const CookieBanner = defineComponent({
  name: 'CookieBanner',
  props: {
    categories: {
      type: Array as PropType<CookieCategory[]>,
      default: undefined,
    },
    onAcceptAll: Function as PropType<CookieBannerProps['onAcceptAll']>,
    onRejectAll: Function as PropType<CookieBannerProps['onRejectAll']>,
    onSave: Function as PropType<CookieBannerProps['onSave']>,
    title: null,
    description: null,
    policyHref: String,
    visible: {
      type: Boolean as PropType<boolean | undefined>,
      default: true,
    },
    onDismiss: Function as PropType<CookieBannerProps['onDismiss']>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // Generated ids (never derived from data): the details list's id, wired to
    // the Customize/Hide details button's `aria-controls`, and the base of each
    // category row's label/description ids, which name and describe that row's
    // switch so every `role="switch"` has an accessible name.
    const detailsId = useId()
    const nameId = useId()
    const showDetails = ref(false)
    // React's `useState` initializer: captured once, from the mount-time
    // categories — a later `categories` change keeps the toggled state.
    const enabled = ref<Record<string, boolean>>({})
    for (const category of props.categories ?? [])
      enabled.value[category.id] = category.required === true || !!category.defaultEnabled

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
      enabled.value = { ...enabled.value, [id]: checked }
    }

    return (): VNode | null => {
      if (!props.visible) return null

      const descriptionChildren: VNodeChild[] = [
        ...slotOrProp(slots.description, props.description, () =>
          t(
            'cookieBanner.description',
            {},
            { defaultValue: 'We use cookies to improve your experience and analyse traffic.' },
          ),
        ),
      ]
      if (props.policyHref) {
        descriptionChildren.push(
          ' ',
          h(
            'a',
            { href: props.policyHref, class: cm.link },
            t('cookieBanner.learnMore', {}, { defaultValue: 'Learn more' }),
          ),
          '.',
        )
      }

      const footer: VNodeChild[] = []
      if (props.categories) {
        footer.push(
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              // The button names the list only while the list renders (the
              // same `showDetails && categories` branch that renders it).
              'aria-expanded': showDetails.value,
              'aria-controls': showDetails.value && props.categories ? detailsId : undefined,
              onClick: () => {
                showDetails.value = !showDetails.value
              },
            },
            {
              default: () => [
                showDetails.value
                  ? t('cookieBanner.hideDetails', {}, { defaultValue: 'Hide details' })
                  : t('cookieBanner.customize', {}, { defaultValue: 'Customize' }),
              ],
            },
          ),
        )
      }
      footer.push(
        h(
          Button,
          {
            variant: 'ghost',
            onClick: () => {
              dismissAfter(props.onRejectAll)
            },
          },
          { default: () => [t('cookieBanner.reject', {}, { defaultValue: 'Reject all' })] },
        ),
      )
      const save = props.onSave
      if (showDetails.value && props.categories && save) {
        footer.push(
          h(
            Button,
            {
              variant: 'outline',
              onClick: () => {
                dismissAfter(() => save(enabled.value))
              },
            },
            { default: () => [t('cookieBanner.save', {}, { defaultValue: 'Save preferences' })] },
          ),
        )
      }
      footer.push(
        h(
          Button,
          {
            variant: 'solid',
            color: 'primary',
            onClick: () => {
              dismissAfter(props.onAcceptAll)
            },
          },
          { default: () => [t('cookieBanner.accept', {}, { defaultValue: 'Accept all' })] },
        ),
      )

      const details =
        showDetails.value && props.categories
          ? h(
              'div',
              { id: detailsId, class: cm.stack(2) },
              props.categories.map((category, index) =>
                h(
                  'div',
                  {
                    key: category.id,
                    class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  },
                  [
                    h('div', { class: cm.cn(cm.flex1, cm.stack(0 as const)) }, [
                      h(
                        'span',
                        {
                          id: `${nameId}-${index}`,
                          class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                        },
                        toChildArray(category.label),
                      ),
                      category.description
                        ? h(
                            'span',
                            {
                              id: `${nameId}-${index}-description`,
                              class: cm.textSize('xs'),
                            },
                            toChildArray(category.description),
                          )
                        : null,
                    ]),
                    h(Switch, {
                      checked: !!enabled.value[category.id] || !!category.required,
                      disabled: category.required,
                      'aria-labelledby': `${nameId}-${index}`,
                      'aria-describedby': category.description
                        ? `${nameId}-${index}-description`
                        : undefined,
                      onChange: (event: Event) => {
                        setCategory(category.id, (event.target as HTMLInputElement).checked)
                      },
                    }),
                  ],
                ),
              ),
            )
          : null

      return h(
        'div',
        {
          role: 'dialog',
          'aria-label': t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' }),
          class: cm.cn(cm.stack(3), cm.sp('p', 4), props.className),
          style: bannerStyle,
        },
        [
          h('header', { class: cm.stack(1 as const) }, [
            h(
              'h3',
              { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
              slotOrProp(slots.title, props.title, () =>
                t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' }),
              ),
            ),
            h('p', { class: cm.textSize('sm') }, descriptionChildren),
          ]),
          details,
          h(
            'footer',
            { class: cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' }) },
            footer,
          ),
        ],
      )
    }
  },
})
