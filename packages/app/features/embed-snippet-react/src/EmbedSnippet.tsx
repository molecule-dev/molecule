import type { ChangeEvent, ReactElement } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { substituteTemplate } from './substitute.js'
import type {
  EmbedSnippetControls,
  EmbedSnippetProps,
  EmbedSnippetThemeOption,
  EmbedSnippetValues,
} from './types.js'

/** Default theme options used when `controls.theme === true`. */
const DEFAULT_THEME_OPTIONS: ReadonlyArray<{
  value: string
  labelKey: string
  defaultLabel: string
}> = [
  { value: 'light', labelKey: 'embedSnippet.theme.light', defaultLabel: 'Light' },
  { value: 'dark', labelKey: 'embedSnippet.theme.dark', defaultLabel: 'Dark' },
  { value: 'auto', labelKey: 'embedSnippet.theme.auto', defaultLabel: 'Auto' },
]

/**
 * `<EmbedSnippet>` — the "Copy embed code" panel.
 *
 * Renders a substituted snippet inside a `<pre>` element, a copy-to-clipboard
 * button with "Copied!" feedback, and (optionally) inline width / height /
 * theme controls bound to `values` + `onChange`.
 *
 * All styling resolves through `getClassMap()` and all user-facing text
 * resolves through `useTranslation()` — no hardcoded UI strings or
 * styling-library class names.
 *
 * @param props - {@link EmbedSnippetProps}.
 * @returns The rendered embed-snippet panel.
 */
export function EmbedSnippet(props: EmbedSnippetProps): ReactElement {
  const {
    template,
    controls,
    values,
    onChange,
    language = 'html',
    heading,
    eyebrow,
    onCopy,
    feedbackMs = 1500,
    molId = 'embed-snippet',
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const rendered = useMemo(() => substituteTemplate(template, values), [template, values])

  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(rendered).then(() => {
      setCopied(true)
      onCopy?.(rendered)
      setTimeout(() => setCopied(false), feedbackMs)
    })
  }, [rendered, onCopy, feedbackMs])

  const updateValue = useCallback(
    (patch: Partial<EmbedSnippetValues>) => {
      onChange?.({ ...(values ?? {}), ...patch })
    },
    [onChange, values],
  )

  const headingText = heading ?? t('embedSnippet.heading', {}, { defaultValue: 'Embed code' })
  const eyebrowText = eyebrow ?? t('embedSnippet.eyebrow', {}, { defaultValue: 'Copy embed code' })
  const copyLabel = copied
    ? t('embedSnippet.copied', {}, { defaultValue: 'Copied!' })
    : t('embedSnippet.copy', {}, { defaultValue: 'Copy' })

  const ariaLabel = t(
    'embedSnippet.aria.region',
    { language },
    { defaultValue: `Embed code (${language})` },
  )

  return (
    <section
      data-mol-id={molId}
      data-mol-language={language}
      aria-label={ariaLabel}
      className={cm.cn(cm.surface, className)}
    >
      <header
        data-mol-id={`${molId}-header`}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.borderB,
        )}
      >
        <div>
          <p
            data-mol-id={`${molId}-eyebrow`}
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
          >
            {eyebrowText}
          </p>
          <h3
            data-mol-id={`${molId}-heading`}
            className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
          >
            {headingText}
          </h3>
        </div>
        <Button variant="solid" size="sm" onClick={handleCopy} data-mol-id={`${molId}-copy-button`}>
          {copyLabel}
        </Button>
      </header>

      {controls ? (
        <ControlsRow
          controls={controls}
          values={values ?? {}}
          updateValue={updateValue}
          molId={molId}
          t={t}
        />
      ) : null}

      <pre
        data-mol-id={`${molId}-code`}
        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}
      >
        <code>{rendered}</code>
      </pre>
    </section>
  )
}

interface ControlsRowProps {
  controls: EmbedSnippetControls
  values: EmbedSnippetValues
  updateValue: (patch: Partial<EmbedSnippetValues>) => void
  molId: string
  t: ReturnType<typeof useTranslation>['t']
}

/**
 * Inline width/height/theme controls. Rendered only when `controls`
 * is supplied to the parent component.
 *
 * @param props - {@link ControlsRowProps}.
 * @returns The controls row.
 */
function ControlsRow(props: ControlsRowProps): ReactElement {
  const { controls, values, updateValue, molId, t } = props
  const cm = getClassMap()

  const themeOptions: EmbedSnippetThemeOption[] = useMemo(() => {
    if (Array.isArray(controls.theme)) return controls.theme
    if (controls.theme) {
      return DEFAULT_THEME_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey, {}, { defaultValue: opt.defaultLabel }),
      }))
    }
    return []
  }, [controls.theme, t])

  const onWidthChange = (e: ChangeEvent<HTMLInputElement>): void => {
    updateValue({ width: e.target.value })
  }
  const onHeightChange = (e: ChangeEvent<HTMLInputElement>): void => {
    updateValue({ height: e.target.value })
  }
  const onThemeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    updateValue({ theme: e.target.value })
  }

  return (
    <div
      data-mol-id={`${molId}-controls`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.borderB,
      )}
    >
      {controls.width ? (
        <label
          data-mol-id={`${molId}-control-width`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={String(values.width ?? '')}
            onChange={onWidthChange}
            className={cm.input()}
            aria-label={t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })}
            data-mol-id={`${molId}-input-width`}
          />
        </label>
      ) : null}

      {controls.height ? (
        <label
          data-mol-id={`${molId}-control-height`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={String(values.height ?? '')}
            onChange={onHeightChange}
            className={cm.input()}
            aria-label={t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })}
            data-mol-id={`${molId}-input-height`}
          />
        </label>
      ) : null}

      {themeOptions.length > 0 ? (
        <label
          data-mol-id={`${molId}-control-theme`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })}
          </span>
          <select
            value={values.theme ?? ''}
            onChange={onThemeChange}
            className={cm.select()}
            aria-label={t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })}
            data-mol-id={`${molId}-input-theme`}
          >
            {themeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
