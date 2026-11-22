/**
 * VerificationBadge — inline lint/type verification result indicator.
 *
 * @module
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// ---------------------------------------------------------------------------
// VerificationBadge — inline lint result indicator
// ---------------------------------------------------------------------------

/**
 * Inline badge showing lint verification status — green check for pass, expandable error card for fail.
 * @param props - Component props (see {@link MessageItemProps}).
 * @returns The rendered verification badge element.
 */
export function VerificationBadge({
  status,
  output,
  categories,
  renderCheckUnavailable,
}: {
  status: 'ok' | 'error'
  output?: string
  workspaces: string[]
  categories?: string[]
  renderCheckUnavailable?: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)

  if (status === 'ok') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          padding: '3px 0',
          fontSize: '13px',
        }}
        className={cm.textMuted}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ flexShrink: 0, alignSelf: 'center', position: 'relative', top: '-1px' }}
        >
          <path
            d="M2 5.5 L4.2 7.8 L8 3"
            fill="none"
            stroke="#3fb950"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          {t('ide.chat.verificationPassed', undefined, { defaultValue: 'Checks passed' })}
          {renderCheckUnavailable && (
            <span data-mol-id="render-check-unavailable" className={cm.textWarning}>
              {' · '}
              {t('ide.chat.renderCheckUnavailable', undefined, {
                defaultValue: 'Render check unavailable',
              })}
            </span>
          )}
        </span>
      </div>
    )
  }

  // Count errors from the output text
  const cats = categories ?? []
  const errorCount = output ? (output.match(/\berror\b/gi) ?? []).length || 1 : 1
  const warningCount = output ? (output.match(/\bwarning\b/gi) ?? []).length : 0

  // Build label with counts
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
          : t('ide.chat.lintErrorsCount', { count: n }, { defaultValue: '{{count}} lint errors' }),
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
  const label =
    parts.length > 0
      ? parts.join(', ')
      : t('ide.chat.verificationFailed', undefined, { defaultValue: 'Errors found' })

  // Use amber for lint-only warnings, red for type/runtime errors
  const isLintOnly = cats.length > 0 && cats.every((c) => c === 'lint')
  const borderColor = isLintOnly ? 'rgba(234,179,8,0.4)' : 'rgba(248,81,73,0.3)'
  const bgColor = isLintOnly ? 'rgba(234,179,8,0.06)' : 'rgba(248,81,73,0.06)'
  const textColor = isLintOnly ? '#d4a017' : '#f85149'

  return (
    <div
      style={{
        margin: '4px 0',
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        overflow: 'hidden',
      }}
    >
      <button
        /* mol-bespoke-button: verify-error card header — the card's own expand/collapse header, tinted by severity; a disclosure, not an action */
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cm.cn(cm.textSize('xs'), cm.w('full'))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          border: 'none',
          background: 'transparent',
          color: textColor,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
            opacity: 0.6,
          }}
        >
          <polyline
            points="4,6 8,10 12,6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded && output && (
        <pre
          className={cm.cn(cm.textSize('xs'))}
          style={{
            margin: 0,
            padding: '6px 8px',
            borderTop: `1px solid ${borderColor}`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflow: 'auto',
            opacity: 0.85,
            fontFamily: 'var(--mol-font-mono, monospace)',
            color: 'inherit',
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}
