/**
 * Solid auth-page brand header — a centered `<div>` wrapper holding a gradient
 * chip + wordmark + tagline.
 *
 * Solid counterpart of `@molecule/app-auth-brand-header-react`'s components —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { children, type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type {
  AuthBrandHeaderChipProps,
  AuthBrandHeaderProps,
  AuthBrandHeaderTaglineProps,
  AuthBrandHeaderWordmarkProps,
} from './types.js'

/**
 * The gradient material-symbols chip shown above the wordmark.
 *
 * @param props - Component props (see {@link AuthBrandHeaderChipProps}).
 * @returns The chip.
 */
export const AuthBrandHeaderChip: Component<AuthBrandHeaderChipProps> = (props) => {
  const cm = getClassMap()
  const shape = (): 'round' | 'square' => props.chipShape ?? 'round'
  return (
    <div
      class={cm.cn(
        cm.w(12),
        cm.h(12),
        shape() === 'round' ? cm.roundedFull : '',
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('mb', 2),
        shape() === 'square' ? cm.authBrandHeaderChipSquare : '',
        props.chipGradient ? '' : cm.bgPrimary,
        cm.authBrandHeaderChipShadow,
      )}
      style={props.chipGradient ? { background: props.chipGradient } : undefined}
    >
      <span
        class={cm.cn(cm.textSize('3xl'), cm.iconGlyphFont, cm.authBrandHeaderChipIcon)}
        style={{ 'font-variation-settings': "'FILL' 1" }}
        aria-hidden="true"
      >
        {props.icon}
      </span>
    </div>
  )
}

/**
 * The wordmark `<h1>`. Pass the brand name (or bespoke accented nodes) as
 * children; `className` appends to the default `4xl` extra-bold treatment,
 * `color` sets an inline color.
 *
 * @param props - Component props (see {@link AuthBrandHeaderWordmarkProps}).
 * @returns The wordmark.
 */
export const AuthBrandHeaderWordmark: Component<AuthBrandHeaderWordmarkProps> = (props) => {
  const cm = getClassMap()
  return (
    <h1
      class={cm.cn(cm.textSize('4xl'), cm.authBrandHeaderWordmark, props.className)}
      style={props.color ? { color: props.color } : undefined}
    >
      {props.children}
    </h1>
  )
}

/**
 * The tagline `<p>`. Pass the tagline text as children; `className` appends to
 * the default small muted treatment.
 *
 * @param props - Component props (see {@link AuthBrandHeaderTaglineProps}).
 * @returns The tagline.
 */
export const AuthBrandHeaderTagline: Component<AuthBrandHeaderTaglineProps> = (props) => {
  const cm = getClassMap()
  return (
    <p
      class={cm.cn(
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.authBrandHeaderTagline,
        props.className,
      )}
    >
      {props.children}
    </p>
  )
}

/**
 * Centered auth-page brand header supporting both composable children and
 * preset mode.
 *
 * @param props - Component props (see {@link AuthBrandHeaderProps}).
 * @returns The brand header.
 */
export const AuthBrandHeader: Component<AuthBrandHeaderProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's `children` value read once per render: Solid's `children` helper resolves whatever
  // the caller passed (elements, text, a `<For>`, a conditional) to the flat list of rendered
  // children and follows it when it changes, so the presence check and the render see one list.
  // As React's `children ?? preset`, only an absent value selects the preset: an empty list
  // (a `<For>` with no rows) renders nothing.
  const resolved = children(() => props.children)
  const hasChildren = (): boolean => resolved() != null
  return (
    // A `<div>`, not `<header>` — several hosts render their own top bar on
    // auth screens; a second `<header>` here reads as a duplicated app bar.
    // This block is brand intro content, not a banner.
    <div class={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), props.className)}>
      <Show when={!hasChildren()} fallback={resolved()}>
        {props.icon ? (
          <AuthBrandHeaderChip
            icon={props.icon}
            chipGradient={props.chipGradient}
            chipShape={props.chipShape}
          />
        ) : null}
        <AuthBrandHeaderWordmark color={props.wordmarkColor}>
          {t(
            'authBrandHeader.appName',
            { appName: props.appName ?? '' },
            { defaultValue: '{{appName}}' },
          )}
        </AuthBrandHeaderWordmark>
        <AuthBrandHeaderTagline>
          {t(
            'authBrandHeader.tagline',
            { tagline: props.tagline ?? '' },
            { defaultValue: '{{tagline}}' },
          )}
        </AuthBrandHeaderTagline>
      </Show>
    </div>
  )
}
