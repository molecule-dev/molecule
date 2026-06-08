import type { CSSProperties, JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 * Props for {@link ContentPageShell}.
 */
export interface ContentPageShellProps {
  /** `data-mol-id` applied to the hero `<header>` for AI-agent selectors. */
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
 * classes (`font-headline` for the title, `font-body`/`font-label` for the
 * rest), so each app's palette and typography are applied automatically
 * without per-app overrides.
 *
 * @param props - See {@link ContentPageShellProps}.
 * @returns The rendered content-page shell.
 */
export function ContentPageShell({
  dataMolId,
  eyebrow,
  title,
  subtitle,
  header,
  footer,
  children,
  bare = false,
  containerSize = 'md',
}: ContentPageShellProps): JSX.Element {
  const cm = getClassMap()

  const heroStyle: CSSProperties = {
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%)',
    borderBottom: '1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)',
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface font-body',
      )}
    >
      {header}

      {title ? (
        <header
          data-mol-id={dataMolId}
          className={cm.cn('relative overflow-hidden', cm.sp('px', 6), cm.sp('py', 16))}
          style={heroStyle}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl',
            )}
            style={{ background: 'color-mix(in srgb, var(--mol-color-primary) 22%, transparent)' }}
          />
          <div className={cm.cn(cm.container({ size: containerSize }), 'relative z-10')}>
            {eyebrow ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'font-label uppercase tracking-widest text-primary',
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'font-display tracking-tight',
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  cm.sp('mt', 3),
                  'font-body text-on-surface-variant',
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </header>
      ) : null}

      <main className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10))}>
        <div className={cm.cn(cm.container({ size: containerSize }))}>
          {bare ? (
            children
          ) : (
            <div
              className={cm.cn(
                cm.surface,
                cm.sp('p', 8),
                'rounded-2xl shadow-lg border border-outline-variant/40',
              )}
            >
              {children}
            </div>
          )}
        </div>
      </main>

      {footer}
    </div>
  )
}
