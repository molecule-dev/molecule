/**
 * Solid auth-page layout shell — the Solid counterpart of
 * `@molecule/app-auth-shell-react`. Same exports, same props (React names),
 * same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { Link, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { AuthFormStateProvider } from './AuthFormStateProvider.jsx'
import type {
  AuthShellBackLinkProps,
  AuthShellCardColumnProps,
  AuthShellCardProps,
  AuthShellContainerProps,
  AuthShellHeadingProps,
  AuthShellPanelProps,
  AuthShellProps,
  AuthShellSplitProps,
  AuthShellSplitRowProps,
} from './types.js'

/**
 * Outer full-screen container — centered flex, padded, with optional
 * absolute-positioned background decoration child.
 *
 * @param props - Component props (see {@link AuthShellContainerProps}).
 * @returns The container element.
 */
export const AuthShellContainer: Component<AuthShellContainerProps> = (props) => {
  const cm = getClassMap()
  const base = (): string =>
    props.layout === 'column'
      ? cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.authShellContainer)
      : cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          cm.sp('p', 6),
          cm.authShellContainer,
        )
  return (
    <div class={cm.cn(base(), props.className)} style={props.style}>
      {props.children}
    </div>
  )
}

/**
 * Absolute-positioned background decoration layer — orbs, mesh gradients,
 * radial glows.
 *
 * @param props - Component props (the children are the decoration).
 * @returns The decoration element.
 */
export const AuthShellDecoration: Component<{ children?: JSX.Element }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.authShellDecoration)}>{props.children}</div>
}

/**
 * The centered glassmorphic card surface.
 *
 * @param props - Component props (see {@link AuthShellCardProps}).
 * @returns The card element.
 */
export const AuthShellCard: Component<AuthShellCardProps> = (props) => {
  const cm = getClassMap()
  return (
    <main class={props.outerClassName ?? cm.cn(cm.w('full'), cm.authShellCardOuter)}>
      <div
        class={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 8),
          props.surfaceClassName ?? cm.authShellCardSurface,
          props.className,
        )}
        style={props.style}
        data-mol-id={props.dataMolId}
      >
        {props.children}
      </div>
    </main>
  )
}

/**
 * Centered heading block: optional eyebrow + h1 + optional subheading.
 *
 * @param props - Component props (see {@link AuthShellHeadingProps}).
 * @returns The heading element.
 */
export const AuthShellHeading: Component<AuthShellHeadingProps> = (props) => {
  const cm = getClassMap()
  return (
    <header class={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}>
      {props.eyebrow ? (
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.authShellHeadingEyebrow)}>
          {props.eyebrow}
        </span>
      ) : null}
      <h1
        class={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.authShellHeadingTitle,
          props.headingClassName,
        )}
        style={props.headingStyle}
      >
        {props.heading}
      </h1>
      {props.subheading ? (
        <p class={cm.cn(cm.textSize('sm'), cm.authShellHeadingSub)}>{props.subheading}</p>
      ) : null}
    </header>
  )
}

/**
 * Footer inside the card — small text with a top border.
 *
 * @param props - Component props (the children are the footer content).
 * @returns The footer element.
 */
export const AuthShellFooter: Component<{ children?: JSX.Element }> = (props) => {
  const cm = getClassMap()
  return (
    <footer class={cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter)}>
      {props.children}
    </footer>
  )
}

/**
 * "Back to home" link (or custom destination) rendered below the card.
 *
 * The arrow's Material Symbols glyph span is `aria-hidden="true"`, so the
 * link's accessible name is its `t()` label alone.
 *
 * @param props - Component props (see {@link AuthShellBackLinkProps}).
 * @returns The back-link element.
 */
export const AuthShellBackLink: Component<AuthShellBackLinkProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <p class={cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mt', 6), cm.authShellBackLink)}>
      <Link
        to={props.to ?? '/'}
        class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.authShellBackLinkAnchor)}
      >
        {/* The Material Symbols ligature name paints a glyph, not text — hidden
            from the accessibility tree so the link's accessible name is its
            t() label alone. */}
        <span class={cm.iconGlyphFont} style={{ 'font-size': '14px' }} aria-hidden="true">
          arrow_back
        </span>
        {props.label?.trim()
          ? props.label
          : t('auth.backHome', undefined, { defaultValue: 'Back to home' })}
      </Link>
    </p>
  )
}

/**
 * Outer frame for the two-column "decorated brand panel + card" auth layout.
 *
 * @param props - Component props (see {@link AuthShellSplitProps}).
 * @returns The split element.
 */
export const AuthShellSplit: Component<AuthShellSplitProps> = (props) => {
  const cm = getClassMap()
  const [local, rest] = splitProps(props, ['children', 'className'])
  return (
    <div class={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), local.className)} {...rest}>
      {local.children}
    </div>
  )
}

/**
 * The vertically-flexed two-column row inside `<AuthShellSplit>`.
 *
 * @param props - Component props (see {@link AuthShellSplitRowProps}).
 * @returns The split-row element.
 */
export const AuthShellSplitRow: Component<AuthShellSplitRowProps> = (props) => {
  const cm = getClassMap()
  const [local, rest] = splitProps(props, ['children', 'className'])
  return (
    <main class={cm.cn(cm.flex1, local.className)} {...rest}>
      {local.children}
    </main>
  )
}

/**
 * A decorative `<aside>` that collapses on mobile (the brand-panel half).
 *
 * @param props - Component props (see {@link AuthShellPanelProps}).
 * @returns The panel element.
 */
export const AuthShellPanel: Component<AuthShellPanelProps> = (props) => {
  const cm = getClassMap()
  const [local, rest] = splitProps(props, ['children', 'className'])
  return (
    <aside class={cm.cn(cm.authShellPanel, local.className)} {...rest}>
      {local.children}
    </aside>
  )
}

/**
 * A `<section>` (or `<main>`, via `as`) that centers its children on both axes.
 *
 * @param props - Component props (see {@link AuthShellCardColumnProps}).
 * @returns The card-column element.
 */
export const AuthShellCardColumn: Component<AuthShellCardColumnProps> = (props) => {
  const cm = getClassMap()
  const [local, rest] = splitProps(props, ['children', 'className', 'as'])
  return (
    <Dynamic
      component={local.as ?? 'section'}
      class={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minW(0),
        local.className,
      )}
      {...rest}
    >
      {local.children}
    </Dynamic>
  )
}

/**
 * Convenience preset composing container, decoration, card, heading, footer,
 * and back-link into a single component. Wraps its content in an
 * `<AuthFormStateProvider>`.
 *
 * @param props - Component props (see {@link AuthShellProps}).
 * @returns The preset shell element.
 */
export const AuthShell: Component<AuthShellProps> = (props) => {
  return (
    <AuthFormStateProvider storage={props.formStateStorage} storageKey={props.formStateKey}>
      <AuthShellContainer>
        {props.decoration != null ? (
          <AuthShellDecoration>{props.decoration}</AuthShellDecoration>
        ) : null}
        <div>
          <AuthShellCard>
            {props.brand}
            <AuthShellHeading heading={props.heading} subheading={props.subheading} />
            {props.children}
            {props.footer != null ? <AuthShellFooter>{props.footer}</AuthShellFooter> : null}
          </AuthShellCard>
          {(props.showBackLink ?? true) ? <AuthShellBackLink to={props.backTo ?? '/'} /> : null}
        </div>
      </AuthShellContainer>
    </AuthFormStateProvider>
  )
}

export default AuthShell
