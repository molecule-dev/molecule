/**
 * Inline verification result badge.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `VerificationBadge` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same behaviour. A green check for a pass — with the
 * stored render-check advisory in the theme's warning token, never an inline
 * colour — and an expandable error card for a failure, its label counted per
 * category and its output behind the disclosure.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`) for the text and the advisory; the
 * inline styles are the ones React writes (badge geometry, severity tints,
 * disclosure), written in Solid's kebab-case style form. All user-facing text
 * goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * The passing row's inline style. A constant rather than an inline object, so
 * Solid writes it through the CSSOM exactly as React does (React normalizes the
 * `padding` shorthand; a literal style attribute would not).
 */
const PASSED_ROW_STYLE: Record<string, string> = {
  display: 'flex',
  'align-items': 'baseline',
  gap: '6px',
  padding: '3px 0',
  'font-size': '13px',
}

/** Props for {@link VerificationBadge} — the React prop names. */
export interface VerificationBadgeProps {
  /** The verification outcome. */
  status: 'ok' | 'error'
  /** The runner's output (shown behind the failure disclosure). */
  output?: string
  /** The workspaces the verification covered. */
  workspaces: string[]
  /** The check categories that reported (`type`, `lint`, `runtime`). */
  categories?: string[]
  /** Whether the stored render check could not run for this pass. */
  renderCheckUnavailable?: boolean
}

/**
 * Inline badge showing a verification status: green check for a pass,
 * expandable error card for a failure.
 *
 * @param props - See {@link VerificationBadgeProps}.
 * @returns The rendered badge.
 */
export function VerificationBadge(props: VerificationBadgeProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [expanded, setExpanded] = createSignal(false)

  const passed = (): JSX.Element => (
    <div style={PASSED_ROW_STYLE} class={cm.textMuted}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={{
          'flex-shrink': '0',
          'align-self': 'center',
          position: 'relative',
          top: '-1px',
        }}
      >
        <path
          d="M2 5.5 L4.2 7.8 L8 3"
          fill="none"
          stroke="#3fb950"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>
        {t('ide.chat.verificationPassed', undefined, { defaultValue: 'Checks passed' })}
        <Show when={props.renderCheckUnavailable}>
          <span data-mol-id="render-check-unavailable" class={cm.textWarning}>
            {' · '}
            {t('ide.chat.renderCheckUnavailable', undefined, {
              defaultValue: 'Render check unavailable',
            })}
          </span>
        </Show>
      </span>
    </div>
  )

  /** The failure label: per-category counts, or the generic failure. */
  const failureLabel = (): string => {
    const cats = props.categories ?? []
    const output = props.output
    const errorCount = output ? (output.match(/\berror\b/gi) ?? []).length || 1 : 1
    const warningCount = output ? (output.match(/\bwarning\b/gi) ?? []).length : 0
    const parts: string[] = []
    if (cats.includes('type')) {
      const n = output ? (output.match(/error TS\d+/g) ?? []).length || errorCount : errorCount
      parts.push(
        n === 1
          ? t('ide.chat.typeErrorCount', { count: 1 }, { defaultValue: '1 type error' })
          : t('ide.chat.typeErrorsCount', { count: n }, { defaultValue: '{{count}} type errors' }),
      )
    }
    if (cats.includes('lint')) {
      const n = output ? (output.match(/\d+:\d+\s+error/g) ?? []).length || 1 : 1
      const w = warningCount
      if (n > 0)
        parts.push(
          n === 1
            ? t('ide.chat.lintErrorCount', { count: 1 }, { defaultValue: '1 lint error' })
            : t(
                'ide.chat.lintErrorsCount',
                { count: n },
                { defaultValue: '{{count}} lint errors' },
              ),
        )
      if (w > 0)
        parts.push(
          w === 1
            ? t('ide.chat.lintWarningCount', { count: 1 }, { defaultValue: '1 warning' })
            : t('ide.chat.lintWarningsCount', { count: w }, { defaultValue: '{{count}} warnings' }),
        )
    }
    if (cats.includes('runtime')) {
      parts.push(t('ide.chat.runtimeErrors', undefined, { defaultValue: 'Runtime errors' }))
    }
    return parts.length > 0
      ? parts.join(', ')
      : t('ide.chat.verificationFailed', undefined, { defaultValue: 'Errors found' })
  }

  /** Whether only lint categories reported (amber, not red). */
  const isLintOnly = (): boolean => {
    const cats = props.categories ?? []
    return cats.length > 0 && cats.every((category) => category === 'lint')
  }

  const borderColor = (): string => (isLintOnly() ? 'rgba(234,179,8,0.4)' : 'rgba(248,81,73,0.3)')
  const bgColor = (): string => (isLintOnly() ? 'rgba(234,179,8,0.06)' : 'rgba(248,81,73,0.06)')
  const textColor = (): string => (isLintOnly() ? '#d4a017' : '#f85149')

  /** The failure card's chrome — size, severity-tinted border and fill. */
  const cardStyle = (): Record<string, string> => ({
    margin: '4px 0',
    'border-radius': '6px',
    border: `1px solid ${borderColor()}`,
    background: bgColor(),
    overflow: 'hidden',
  })

  /** The failure card's disclosure header. */
  const headerStyle = (): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    gap: '6px',
    padding: '5px 8px',
    border: 'none',
    background: 'transparent',
    color: textColor(),
    cursor: 'pointer',
    'text-align': 'left',
  })

  /** The runner output behind the disclosure. */
  const outputStyle = (): Record<string, string> => ({
    margin: '0',
    padding: '6px 8px',
    'border-top': `1px solid ${borderColor()}`,
    'white-space': 'pre-wrap',
    'word-break': 'break-word',
    'max-height': '200px',
    overflow: 'auto',
    opacity: '0.85',
    'font-family': 'var(--mol-font-mono, monospace)',
    color: 'inherit',
  })

  const failed = (): JSX.Element => (
    <div style={cardStyle()}>
      <button
        /* mol-bespoke-button: verify-error card header — the card's own
           expand/collapse disclosure, tinted by severity */
        type="button"
        onClick={() => setExpanded((value) => !value)}
        class={cm.cn(cm.textSize('xs'), cm.w('full'))}
        style={headerStyle()}
      >
        <span style={{ flex: '1' }}>{failureLabel()}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            'flex-shrink': '0',
            transform: expanded() ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
            opacity: '0.6',
          }}
        >
          <polyline
            points="4,6 8,10 12,6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <Show when={expanded() && props.output}>
        <pre class={cm.cn(cm.textSize('xs'))} style={outputStyle()}>
          {props.output}
        </pre>
      </Show>
    </div>
  )

  return (
    <Show when={props.status === 'ok'} fallback={failed()}>
      {passed()}
    </Show>
  )
}
