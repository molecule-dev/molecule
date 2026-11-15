/**
 * Vue `SafeLink` router link — the counterpart of `@molecule/app-safe-link-react`'s
 * `SafeLink`: the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type VNode } from 'vue'

import { Link, useLocation } from '@molecule/app-vue'

/**
 * `<SafeLink>` renders the binding's `Link` (react-router `<Link>`'s click
 * rules), but if its destination matches the current path it appends a `#top`
 * fragment so clicking still produces an observable URL change.
 *
 * Avoids "dead-link" probes that return no URL/DOM mutation when a same-path
 * link is clicked — useful for nav primitives that get exercised by
 * behavioural verifiers / e2e probes.
 *
 * Every other attribute (`class` via `className`, `id`, `target`, `rel`,
 * `aria-*`, `data-*`, `onClick`) goes on the anchor, as with react-router's
 * `<Link>`.
 *
 * @param props - The link's props (see {@link SafeLinkProps}); other attributes
 *   go on the anchor.
 * @param ctx - The setup context: the default slot is the link's content.
 * @returns The render function of the anchor.
 */
export const SafeLink = defineComponent({
  name: 'SafeLink',
  props: {
    to: { type: String, required: true },
    // `default: undefined` keeps an absent prop undefined, so the binding
    // `Link`'s replace default (a link to the location already shown replaces
    // it) applies, exactly as with react-router's absent-prop semantics.
    replace: { type: Boolean, default: undefined },
    // Any runtime value; absent (undefined) contributes no state, so the
    // binding `Link` writes no history state, as with react-router's
    // absent-prop semantics.
    state: null,
    className: String,
  },
  setup(props, { attrs, slots }) {
    const location = useLocation()

    /**
     * The destination with the same-path `#top` fragment applied.
     */
    const target = computed(() => {
      const to = props.to
      const samePath = location.value.pathname === to || location.value.pathname + '/' === to
      return samePath ? `${to.replace(/\/$/, '')}#top` : to
    })

    return (): VNode =>
      h(
        Link,
        {
          to: target.value,
          replace: props.replace,
          state: props.state,
          class: props.className,
          ...attrs,
        },
        slots,
      )
  },
})

export default SafeLink
