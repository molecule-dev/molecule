import type { ReactElement } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, SelectField, Text, TextField } from '@molecule/app-ui-react/elements'

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
    void copyTextWithFallback(rendered).then((copied) => {
      if (!copied) return
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
    { defaultValue: 'Embed code ({{language}})' },
  )

  return (
    <Box
      as="section"
      data-mol-id={molId}
      data-mol-language={language}
      aria-label={ariaLabel}
      className={cm.cn(cm.surface, className)}
    >
      <Box
        as="header"
        data-mol-id={`${molId}-header`}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.borderB,
        )}
      >
        <Box as="div">
          <Text
            as="p"
            data-mol-id={`${molId}-eyebrow`}
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
          >
            {eyebrowText}
          </Text>
          <Text
            as="h3"
            data-mol-id={`${molId}-heading`}
            className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
          >
            {headingText}
          </Text>
        </Box>
        <Button variant="solid" size="sm" onClick={handleCopy} data-mol-id={`${molId}-copy-button`}>
          {copyLabel}
        </Button>
      </Box>

      {controls ? (
        <ControlsRow
          controls={controls}
          values={values ?? {}}
          updateValue={updateValue}
          molId={molId}
          t={t}
        />
      ) : null}

      {/* The generated embed code is code, not prose: never translated. */}
      <Text
        as="pre"
        data-mol-id={`${molId}-code`}
        translate="no"
        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}
      >
        <Text as="code">{rendered}</Text>
      </Text>
    </Box>
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

  const onWidthChange = (width: string): void => {
    updateValue({ width })
  }
  const onHeightChange = (height: string): void => {
    updateValue({ height })
  }
  const onThemeChange = (theme: string): void => {
    updateValue({ theme })
  }

  return (
    <Box
      as="div"
      data-mol-id={`${molId}-controls`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.borderB,
      )}
    >
      {controls.width ? (
        <Box
          as="label"
          data-mol-id={`${molId}-control-width`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })}
          </Text>
          <TextField
            as="input"
            type="text"
            inputMode="numeric"
            value={String(values.width ?? '')}
            onValueChange={onWidthChange}
            className={cm.input()}
            aria-label={t('embedSnippet.controls.width', {}, { defaultValue: 'Width' })}
            data-mol-id={`${molId}-input-width`}
          />
        </Box>
      ) : null}

      {controls.height ? (
        <Box
          as="label"
          data-mol-id={`${molId}-control-height`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })}
          </Text>
          <TextField
            as="input"
            type="text"
            inputMode="numeric"
            value={String(values.height ?? '')}
            onValueChange={onHeightChange}
            className={cm.input()}
            aria-label={t('embedSnippet.controls.height', {}, { defaultValue: 'Height' })}
            data-mol-id={`${molId}-input-height`}
          />
        </Box>
      ) : null}

      {themeOptions.length > 0 ? (
        <Box
          as="label"
          data-mol-id={`${molId}-control-theme`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })}
          </Text>
          <SelectField
            as="select"
            value={values.theme ?? ''}
            onValueChange={onThemeChange}
            className={cm.select()}
            aria-label={t('embedSnippet.controls.theme', {}, { defaultValue: 'Theme' })}
            data-mol-id={`${molId}-input-theme`}
            options={themeOptions}
          />
        </Box>
      ) : null}
    </Box>
  )
}
