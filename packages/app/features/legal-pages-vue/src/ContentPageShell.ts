/**
 * Vue branded shell for public content pages (Privacy, Terms, Pricing,
 * PlanUpdated, …).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { ContentPageShellProps } from './types.js'
import { hasNodes, nodeOrSlot } from './utilities.js'

/**
 * Branded shell for public content pages (Privacy, Terms, Pricing,
 * PlanUpdated, …).
 *
 * Renders the app's own `header`/`footer` slots around a themed hero band
 * (eyebrow + title + subtitle) and a surface-card content area. Everything
 * is driven by theme tokens (`--mol-color-*`) and the app's font utility
 * classes (`font-display` for the title, `font-body`/`font-label` for the
 * rest), so each app's palette and typography are applied automatically
 * without per-app overrides.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `ContentPageShell` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input. Node-valued props arrive as a prop AND a same-named slot;
 * components accept either.
 *
 * @param props - Component props (see {@link ContentPageShellProps}).
 * @returns The content-page shell component.
 */
export const ContentPageShell = defineComponent({
  name: 'ContentPageShell',
  props: {
    dataMolId: String,
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    eyebrow: null,
    title: null,
    subtitle: null,
    header: null,
    footer: null,
    bare: {
      type: Boolean,
      default: false,
    },
    containerSize: {
      type: String as PropType<'sm' | 'md' | 'lg' | 'xl'>,
      default: 'md',
    },
  },
  setup(props: ContentPageShellProps, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const heroStyle = {
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%)',
        borderBottom: '1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)',
      }
      const eyebrow = nodeOrSlot(slots.eyebrow, props.eyebrow)
      const title = nodeOrSlot(slots.title, props.title)
      const subtitle = nodeOrSlot(slots.subtitle, props.subtitle)
      const body: VNodeChild[] = slots.default?.() ?? []

      return h(
        'div',
        { class: cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.legalPagesShell) },
        [
          ...nodeOrSlot(slots.header, props.header),
          hasNodes(title)
            ? // A `<section>`, not `<header>`: the app's own top bar (the `header`
              // slot above) is the page's single banner — a second `<header>` here
              // reads as a duplicated app bar to audits, users, and assistive tech.
              h(
                'section',
                {
                  'data-mol-id': props.dataMolId,
                  class: cm.cn(cm.legalPagesHero, cm.sp('px', 6), cm.sp('py', 16)),
                  style: heroStyle,
                },
                [
                  h('div', {
                    'aria-hidden': 'true',
                    class: cm.legalPagesHeroGlow,
                    style: {
                      background: 'color-mix(in srgb, var(--mol-color-primary) 22%, transparent)',
                    },
                  }),
                  h(
                    'div',
                    {
                      class: cm.cn(
                        cm.container({ size: props.containerSize }),
                        cm.legalPagesHeroContent,
                      ),
                    },
                    [
                      hasNodes(eyebrow)
                        ? h(
                            'p',
                            {
                              class: cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                cm.sp('mb', 3),
                                cm.legalPagesHeroEyebrow,
                              ),
                            },
                            eyebrow,
                          )
                        : null,
                      h(
                        'h1',
                        {
                          class: cm.cn(
                            cm.textSize('4xl'),
                            cm.fontWeight('extrabold'),
                            cm.legalPagesHeroTitle,
                          ),
                        },
                        title,
                      ),
                      hasNodes(subtitle)
                        ? h(
                            'p',
                            {
                              class: cm.cn(
                                cm.textSize('base'),
                                cm.sp('mt', 3),
                                cm.legalPagesHeroSubtitle,
                              ),
                            },
                            subtitle,
                          )
                        : null,
                    ],
                  ),
                ],
              )
            : null,
          h('main', { class: cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10)) }, [
            h('div', { class: cm.cn(cm.container({ size: props.containerSize })) }, [
              props.bare
                ? body
                : h(
                    'div',
                    { class: cm.cn(cm.surface, cm.sp('p', 8), cm.legalPagesContentCard) },
                    body,
                  ),
            ]),
          ]),
          ...nodeOrSlot(slots.footer, props.footer),
        ],
      )
    }
  },
})
