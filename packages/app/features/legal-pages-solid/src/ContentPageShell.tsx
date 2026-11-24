/**
 * Solid branded shell for public content pages (Privacy, Terms, Pricing,
 * PlanUpdated, …).
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ContentPageShellProps } from './types.js'

/** React's inline style for the hero band, in Solid's kebab-case style keys. */
const HERO_STYLE = {
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%)',
  'border-bottom': '1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)',
}

/** React's inline style for the hero's glow, in Solid's kebab-case style keys. */
const GLOW_STYLE = {
  background: 'color-mix(in srgb, var(--mol-color-primary) 22%, transparent)',
}

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
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `ContentPageShell` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link ContentPageShellProps}).
 * @returns The rendered content-page shell.
 */
export const ContentPageShell: Component<ContentPageShellProps> = (props) => {
  const cm = getClassMap()
  const containerSize = (): 'sm' | 'md' | 'lg' | 'xl' => props.containerSize ?? 'md'
  return (
    <div class={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.legalPagesShell)}>
      {props.header}
      <ResolveNode node={props.title}>
        {(title, hasTitle) => (
          <Show when={hasTitle()}>
            {/* A `<section>`, not `<header>`: the app's own top bar (the `header`
                slot above) is the page's single banner — a second `<header>` here
                reads as a duplicated app bar to audits, users, and assistive tech. */}
            <section
              data-mol-id={props.dataMolId}
              class={cm.cn(cm.legalPagesHero, cm.sp('px', 6), cm.sp('py', 16))}
              style={HERO_STYLE}
            >
              <div aria-hidden="true" class={cm.legalPagesHeroGlow} style={GLOW_STYLE} />
              <div class={cm.cn(cm.container({ size: containerSize() }), cm.legalPagesHeroContent)}>
                <PresentWhileNode node={props.eyebrow}>
                  {(eyebrow) => (
                    <p
                      class={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 3),
                        cm.legalPagesHeroEyebrow,
                      )}
                    >
                      {eyebrow()}
                    </p>
                  )}
                </PresentWhileNode>
                <h1
                  class={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('extrabold'),
                    cm.legalPagesHeroTitle,
                  )}
                >
                  {title()}
                </h1>
                <PresentWhileNode node={props.subtitle}>
                  {(subtitle) => (
                    <p
                      class={cm.cn(cm.textSize('base'), cm.sp('mt', 3), cm.legalPagesHeroSubtitle)}
                    >
                      {subtitle()}
                    </p>
                  )}
                </PresentWhileNode>
              </div>
            </section>
          </Show>
        )}
      </ResolveNode>

      <main class={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10))}>
        <div class={cm.cn(cm.container({ size: containerSize() }))}>
          {props.bare ? (
            props.children
          ) : (
            <div class={cm.cn(cm.surface, cm.sp('p', 8), cm.legalPagesContentCard)}>
              {props.children}
            </div>
          )}
        </div>
      </main>

      {props.footer}
    </div>
  )
}
