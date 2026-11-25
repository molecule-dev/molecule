import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * Props for {@link ContentPageShell}.
 */
export interface ContentPageShellProps {
  /** `data-mol-id` applied to the hero band for AI-agent selectors. */
  dataMolId?: string
  /** Small uppercase label above the title (e.g. "Legal", "Billing"). */
  eyebrow?: ReactNode
  /**
   * Page title, rendered in the app's headline font inside the hero band.
   * Omit to skip the hero entirely (e.g. for content that renders its own
   * heading, like a pricing tier grid).
   */
  title?: ReactNode
  /** Optional supporting line under the title (e.g. "Last updated …"). */
  subtitle?: ReactNode
  /** App-specific top navigation, rendered above the hero. */
  header?: ReactNode
  /** App-specific footer, rendered below the content. */
  footer?: ReactNode
  /** Page body. Rendered inside a surface card unless {@link bare} is set. */
  children: ReactNode
  /**
   * When true, the body is rendered without the surface card wrapper — for
   * content that brings its own surfaces (e.g. a pricing tier grid).
   */
  bare?: boolean
  /** Container width passed to ClassMap `container({ size })`. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
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
 * @param props - See {@link ContentPageShellProps}.
 * @returns The rendered content-page shell.
 */
export function ContentPageShell({
  dataMolId,
  eyebrow: eyebrowProp,
  title: titleProp,
  subtitle: subtitleProp,
  header,
  footer,
  children,
  bare = false,
  containerSize = 'md',
}: ContentPageShellProps): JSX.Element {
  const eyebrow = slot(eyebrowProp)
  const title = slot(titleProp)
  const subtitle = slot(subtitleProp)
  const cm = getClassMap()

  const heroStyle = {
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%)',
    borderBottom: '1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)',
  }

  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.legalPagesShell)}
    >
      {header}

      {title ? (
        // A `<section>`, not `<header>`: the app's own top bar (the `header`
        // slot above) is the page's single banner — a second `<header>` here
        // reads as a duplicated app bar to audits, users, and assistive tech.
        <Box
          as="section"
          data-mol-id={dataMolId}
          className={cm.cn(cm.legalPagesHero, cm.sp('px', 6), cm.sp('py', 16))}
          webStyle={heroStyle}
        >
          <Box
            as="div"
            aria-hidden="true"
            className={cm.legalPagesHeroGlow}
            webStyle={{
              background: 'color-mix(in srgb, var(--mol-color-primary) 22%, transparent)',
            }}
          />
          <Box
            as="div"
            className={cm.cn(cm.container({ size: containerSize }), cm.legalPagesHeroContent)}
          >
            {eyebrow ? (
              <Text
                as="p"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  cm.legalPagesHeroEyebrow,
                )}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text
              as="h1"
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                cm.legalPagesHeroTitle,
              )}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                as="p"
                className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), cm.legalPagesHeroSubtitle)}
              >
                {subtitle}
              </Text>
            ) : null}
          </Box>
        </Box>
      ) : null}

      <Box as="main" className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10))}>
        <Box as="div" className={cm.cn(cm.container({ size: containerSize }))}>
          {bare ? (
            children
          ) : (
            <Box as="div" className={cm.cn(cm.surface, cm.sp('p', 8), cm.legalPagesContentCard)}>
              {children}
            </Box>
          )}
        </Box>
      </Box>

      {footer}
    </Box>
  )
}
